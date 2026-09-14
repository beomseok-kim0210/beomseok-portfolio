"""RunPod Serverless handler — text in, canonical audio + face timeline out.

One worker image holds both runtimes because the invariant this system is built
on is that the audio a listener hears and the audio LAM analyses are the same
generated waveform. Splitting synthesis and expression into separate remote
services would put a network hop between the two branches of that fork for no
gain.

The two runtimes still live in separate Python environments — Supertonic wants
numpy 2.x with onnxruntime, LAM wants numpy 1.26 with torch 2.1.2+cu121, and
they cannot share one interpreter. So this process is an orchestrator: it owns
neither model, it spawns the two venv workers that were already validated
locally and speaks the same one-JSON-object-per-line protocol to both.

Both workers start in parallel from bootstrap(), before the first job, and are
reused for the life of the worker. On RunPod that matters twice over: a Flex
worker is billed from the moment it starts, so paying the model-load cost once
per worker instead of once per request is the difference between a viable price
and a silly one.
"""
import base64
import hashlib
import json
import os
import queue
import re
import subprocess
import threading
import time
import uuid

import runpod

# ---------------------------------------------------------------- configuration
SUPERTONIC_PYTHON = os.environ.get("DD_SUPERTONIC_PYTHON", "/opt/supertonic-venv/bin/python")
LAM_PYTHON = os.environ.get("DD_LAM_PYTHON", "/opt/lam-venv/bin/python")
WORKER_DIR = os.environ.get("DD_WORKER_DIR", "/app/voice")
WORK_DIR = os.environ.get("DD_VOICE_WORK_DIR", "/tmp/dd-voice")

MAX_TEXT_LENGTH = int(os.environ.get("DD_MAX_TEXT_LENGTH", "600"))
# 재시작 예산. Node 쪽 Worker 와 같다 (60 s 창, 3 회).
RESTART_WINDOW_S = float(os.environ.get("DD_RESTART_WINDOW_S", "60"))
MAX_RESTARTS_PER_WINDOW = int(os.environ.get("DD_MAX_RESTARTS_PER_WINDOW", "3"))
SUPERTONIC_TIMEOUT_S = float(os.environ.get("DD_SUPERTONIC_TIMEOUT_S", "60"))
LAM_TIMEOUT_S = float(os.environ.get("DD_LAM_TIMEOUT_S", "60"))
STARTUP_TIMEOUT_S = float(os.environ.get("DD_STARTUP_TIMEOUT_S", "180"))

# 응답 본문 상한. Vercel Functions 의 응답 본문 한도가 4.5 MB 이고 오디오를
# base64 로 실으면 약 4/3 로 부푼다. RunPod 이 더 큰 페이로드를 허용하더라도
# 이 응답은 결국 Vercel 을 통과하므로 그쪽 한도가 실질 상한이다.
MAX_AUDIO_BYTES = int(os.environ.get("DD_MAX_AUDIO_BYTES", str(3_000_000)))

WORKER_STARTED_AT = time.time()
COLD_START = True  # 첫 요청에서만 True


SECRET_NAME = re.compile(r"(KEY|SECRET|TOKEN|PASSWORD|PASSWD|CREDENTIAL)", re.I)


def _child_env():
    """자식에게 물려줄 환경.

    워커는 PATH, CUDA 경로, HF_HOME 같은 주변 환경이 필요하므로 화이트리스트는
    쓰지 않는다 — 기계마다 필요한 변수가 달라 조용히 깨진다. 대신 비밀로 보이는
    이름은 넘기지 않는다.

    자식의 stderr 는 예외 메시지에 붙어 로그로 나간다. 워커는 RunPod API 키를
    알 필요가 전혀 없으므로, 애초에 물려주지 않는 편이 맞다.
    """
    return {k: v for k, v in os.environ.items() if not SECRET_NAME.search(k)}


def _redact(text):
    """로그에 남기기 전에 실제 비밀 *값* 을 지운다. 이름 필터만으로는 부족하다."""
    out = str(text)
    for k, v in os.environ.items():
        if v and len(v) >= 8 and SECRET_NAME.search(k):
            out = out.replace(v, "<redacted>")
    return out


class WorkerError(RuntimeError):
    def __init__(self, stage, message):
        super().__init__(message)
        self.stage = stage


class Worker:
    """상주 파이썬 워커 하나. 한 번에 한 요청만 보낸다.

    stdout 은 전용 스레드가 읽어 큐에 넣는다. 직접 readline() 을 부르면 상한이
    상한 노릇을 하지 못한다 — 자식이 아무것도 쓰지 않는 동안 readline() 이 막혀
    있어 마감 시각 검사에 영영 도달하지 못하기 때문이다. 타임아웃이 필요한 유일한
    경우가 바로 그 경우다.
    """

    def __init__(self, label, python, script, env, startup_timeout_s=STARTUP_TIMEOUT_S):
        self.label = label
        self._python = python
        self._script = script
        self._env = env
        self._startup_timeout_s = startup_timeout_s
        self._lock = threading.Lock()
        self.ready_info = None
        self.model_load_ms = None
        self.restarts = 0
        self._restart_times = []
        self.last_error = None
        self._proc = None
        self._q = None
        self._stderr_tail = []
        self._spawn()

    # ------------------------------------------------------------- lifecycle
    def _spawn(self):
        self._stderr_tail = []
        self.ready_info = None
        self.last_error = None  # 프로세스마다 새로 — 이전 세대의 사유를 물려받지 않는다
        self._q = queue.Queue()
        self._proc = subprocess.Popen(
            [self._python, self._script],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            env={**_child_env(), **self._env,
                 "PYTHONIOENCODING": "utf-8", "PYTHONUNBUFFERED": "1"},
            text=True, encoding="utf-8", bufsize=1,
        )
        # 이 스레드들은 자기가 띄운 프로세스에만 묶인다. 재시작 뒤 옛 스레드가
        # 새 큐에 쓰지 않도록 큐를 인자로 붙들고 간다.
        threading.Thread(target=self._drain_stdout,
                         args=(self._proc, self._q), daemon=True).start()
        threading.Thread(target=self._drain_stderr, args=(self._proc,), daemon=True).start()

    def _drain_stdout(self, proc, q):
        for line in proc.stdout:
            line = line.strip()
            if not line:
                continue
            try:
                q.put(json.loads(line))
            except json.JSONDecodeError:
                continue  # 모델 라이브러리가 stdout 에 흘리는 로그
        q.put(None)  # EOF — 자식이 끝났다

    def _drain_stderr(self, proc):
        for line in proc.stderr:
            self._stderr_tail.append(line.rstrip())
            del self._stderr_tail[:-40]

    def _kill(self):
        proc = self._proc
        if proc is None:
            return
        try:
            proc.stdin.close()
        except Exception:
            pass
        try:
            proc.kill()
        except Exception:
            pass

    def _recycle(self):
        """무응답이거나 죽은 자식을 버리고 새로 띄운다 — 예산 안에서만.

        매달린 자식을 그대로 두면 다음 요청이 *이전* 발화의 늦은 응답을 읽는다.
        그러면 이번 요청의 wav 와 돌려받은 해시가 어긋나고, 동일성 검사가 그것을
        잡기는 하지만 매 요청이 그렇게 실패한다. 워커 하나가 컨테이너 전체를
        못 쓰게 만드는 셈이다.

        다만 무한히는 아니다. 체크포인트가 깨졌거나 CUDA 가 없는 것처럼 고쳐지지 않는
        실패에서 잡마다 새 프로세스를 띄우면 — torch import 만 수 초다 — 그 시간이
        전부 GPU 요금으로 나간다. 창 안의 횟수를 넘기면 띄우지 않고 실패시킨다.
        Node 쪽 Worker 와 같은 정책이다.
        """
        self._kill()
        now = time.time()
        self._restart_times = [t for t in self._restart_times if t > now - RESTART_WINDOW_S]
        if len(self._restart_times) >= MAX_RESTARTS_PER_WINDOW:
            self._proc = None
            self.ready_info = None
            raise WorkerError(
                self.label,
                f"{self.label} failed {len(self._restart_times)} times in the last "
                f"{RESTART_WINDOW_S:.0f}s and will not be restarted yet"
                + (f" (last: {self.last_error})" if self.last_error else ""),
            )
        self._restart_times.append(now)
        self.restarts += 1
        self._spawn()

    # -------------------------------------------------------------- protocol
    def _next(self, deadline):
        remaining = deadline - time.time()
        if remaining <= 0:
            raise WorkerError(self.label, f"{self.label} timed out")
        try:
            msg = self._q.get(timeout=remaining)
        except queue.Empty:
            raise WorkerError(self.label, f"{self.label} timed out")
        if msg is None:
            # 같은 프로세스가 이미 이유를 말했다면 (ready:false) 그것이 EOF 보다 유익하다.
            # 덮어쓰면 "exited: " 만 남는다.
            if not self.last_error:
                self.last_error = f"exited: {' | '.join(self._stderr_tail[-6:])}"[:300]
            raise WorkerError(self.label, f"{self.label} {self.last_error}")
        return msg

    def await_ready(self, timeout_s=None):
        timeout_s = self._startup_timeout_s if timeout_s is None else timeout_s
        msg = self._next(time.time() + timeout_s)
        if not msg.get("ready"):
            # {"ready": false} 는 워커가 스스로 낸 판정이다 — 예: LAM 워밍업 실패.
            # READY 를 거짓으로 알리는 대신 여기서 끊고, 호출자가 재활용한다.
            why = msg.get("error") or msg.get("stage") or "no reason given"
            self.last_error = f"did not announce readiness: {why}"[:300]
            raise WorkerError(self.label, f"{self.label} {self.last_error}")
        self.ready_info = msg
        self.model_load_ms = msg.get("model_load_ms")
        return msg

    def call(self, payload, timeout_s):
        with self._lock:
            if self._proc is None or self._proc.poll() is not None:
                # 죽은 채로 남아 있던 워커다. 이번 요청은 실패시키되, 다음 요청이
                # 쓸 수 있도록 새로 띄워 둔다 (예산 안에서). 마지막으로 알려진 이유를
                # 실어 보낸다 — "was not running" 만으로는 아무것도 알 수 없다.
                why = f" ({self.last_error})" if self.last_error else ""
                self._recycle()
                raise WorkerError(self.label, f"{self.label} was not running{why}")
            if self.ready_info is None:
                # 재시작 직후이거나 기동이 실패한 채로 남아 있는 자식이다. 준비를
                # 기다리되, 실패하면 반드시 버린다 — 그러지 않으면 ready_info 가
                # 계속 None 이라 *이후 모든 요청*이 같은 죽은 자식을 상대로 기동
                # 상한을 처음부터 다시 기다린다.
                #
                # 기다리는 시간은 이 요청의 상한 안이다. 기동 상한(180 s)을 그대로
                # 쓰면 요청이 RunPod 실행 상한(120 s)을 넘겨 버린다 — 잡은 죽고
                # 워커만 초기화하다 끝난다.
                try:
                    self.await_ready(min(self._startup_timeout_s, timeout_s))
                except WorkerError:
                    self._recycle()
                    raise
            try:
                self._proc.stdin.write(json.dumps(payload, ensure_ascii=False) + "\n")
                self._proc.stdin.flush()
            except (BrokenPipeError, OSError) as exc:
                self._recycle()
                raise WorkerError(self.label, f"{self.label} stdin closed: {exc}")

            try:
                msg = self._next(time.time() + timeout_s)
            except WorkerError:
                # 응답하지 않았거나 도중에 죽었다. 어느 쪽이든 이 자식은 버린다.
                self._recycle()
                raise
            if not msg.get("ok"):
                raise WorkerError(self.label, str(msg.get("error", "unknown error")))
            return msg

    def alive(self):
        return self._proc is not None and self._proc.poll() is None


# ------------------------------------------------------- one-time initialisation
def _start_workers():
    """두 워커를 겹쳐 올린다. 순서대로 올리면 콜드 경로가 그만큼 길어진다."""
    os.makedirs(WORK_DIR, exist_ok=True)
    supertonic = Worker(
        "supertonic", SUPERTONIC_PYTHON, os.path.join(WORKER_DIR, "supertonic_worker.py"),
        {"DD_SUPERTONIC_MODEL_DIR": os.environ["DD_SUPERTONIC_MODEL_DIR"]},
    )
    lam = Worker(
        "lam", LAM_PYTHON, os.path.join(WORKER_DIR, "lam_worker.py"),
        {"DD_LAM_SRC": os.environ["DD_LAM_SRC"], "DD_LAM_CKPT": os.environ["DD_LAM_CKPT"]},
    )
    errors = {}

    def wait(w):
        # 한 번 실패하면 한 번 더 시도한다 — 교체 워커의 준비까지 *기다린 뒤에* 서빙을
        # 시작한다. 교체만 띄우고 돌아가면 첫 잡이 초기화를 기다리거나, 이미 죽은
        # 교체 워커를 만나 이유 없는 "was not running" 을 받는다.
        for attempt in (1, 2):
            try:
                w.await_ready(STARTUP_TIMEOUT_S)
                errors.pop(w.label, None)
                return
            except Exception as exc:
                errors[w.label] = str(exc)
                if attempt == 2:
                    return  # 두 번 실패. 죽은 채로 두고, 잡은 기록된 이유로 빨리 실패한다.
                try:
                    w._recycle()
                except Exception as exc2:
                    errors[w.label] = str(exc2)
                    return

    threads = [threading.Thread(target=wait, args=(w,)) for w in (supertonic, lam)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    return supertonic, lam, errors


SUPERTONIC = None
LAM = None
INIT_ERRORS = {}
INIT_MS = None
GPU_INFO = None


def _probe_gpu():
    """어떤 GPU 위에서 돌았는지를 증거로 남긴다.

    모델명·VRAM 총량·드라이버 버전만 묻는다. UUID 나 시리얼 같은 고유 식별자는
    필요 없으므로 묻지 않는다. nvidia-smi 가 없으면 None — 0 으로 대체하지 않는다.
    """
    try:
        out = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total,driver_version",
             "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=10,
        )
        if out.returncode != 0:
            return {"error": "nvidia-smi rc %d" % out.returncode}
        name, mem, drv = [x.strip() for x in out.stdout.strip().splitlines()[0].split(",")]
        return {"name": name, "vramTotalMb": int(float(mem)), "driver": drv}
    except Exception as exc:  # 진단이지 기능이 아니다. 실패해도 잡은 돈다.
        return {"error": str(exc)[:120]}


def bootstrap():
    """두 워커를 올린다. 워커 프로세스당 정확히 한 번, 첫 요청보다 먼저.

    모듈 최상단이 아니라 함수 안에 두는 이유는 테스트가 이 파일을 import 해서
    Worker 의 타임아웃·재시작을 직접 몰아볼 수 있어야 하기 때문이다. RunPod 이
    실행하는 것은 컨테이너의 CMD 이므로 __main__ 아래에서 부르는 것으로 충분하다.
    """
    global SUPERTONIC, LAM, INIT_ERRORS, INIT_MS, GPU_INFO
    t0 = time.time()
    GPU_INFO = _probe_gpu()
    SUPERTONIC, LAM, INIT_ERRORS = _start_workers()
    INIT_MS = round((time.time() - t0) * 1000, 1)
    lam_ready = LAM.ready_info or {}
    print(json.dumps({
        "event": "worker_init",
        "gpu": GPU_INFO,
        "worker_started_at": WORKER_STARTED_AT,
        "init_ms": INIT_MS,
        "supertonic_model_load_ms": SUPERTONIC.model_load_ms,
        "lam_model_load_ms": LAM.model_load_ms,
        "lam_device": lam_ready.get("device"),
        # 워밍업 지표. 요청 경로에서 빠진 시간이 여기로 옮겨 왔는지 A/B 에서 대조한다.
        "lam_warmup_ms": lam_ready.get("warmup_ms"),
        "lam_warmup_decode_ms": lam_ready.get("warmup_decode_ms"),
        "lam_warmup_infer_ms": lam_ready.get("warmup_infer_ms"),
        "lam_ready_ms": lam_ready.get("ready_ms"),
        "librosa_submodules_loaded": lam_ready.get("librosa_submodules_loaded"),
        "errors": INIT_ERRORS or None,
    }), flush=True)


def _fail(code, stage, detail=None):
    """경계 있는 오류를 내보낸다.

    코드와 단계는 클라이언트까지 간다. detail 은 *공급자까지만* 간다 — Vercel 라우트가
    서버 로그에 남기고 브라우저에는 주지 않는다. RunPod 워커 로그를 따로 열지 않고도
    잡 상태만으로 원인을 볼 수 있어야 한다는 것을 P3 첫 콜드 실패에서 배웠다.
    비밀 값은 지우고, 경로는 남긴다 — 컨테이너 안의 경로는 이미지에 박힌 공개 정보다.
    """
    d = _redact(detail)[:400] if detail else None
    if d:
        print(json.dumps({"event": "error", "code": code, "stage": stage, "detail": d}),
              flush=True)
    out = {"error": code, "stage": stage}
    if d:
        out["detail"] = d
    return out


def handler(job):
    global COLD_START
    cold = COLD_START
    COLD_START = False
    t_start = time.time()

    job_input = job.get("input") or {}
    request_id = str(job_input.get("requestId") or job.get("id") or uuid.uuid4())[:64]
    utterance_id = str(job_input.get("utteranceId") or uuid.uuid4())

    text = job_input.get("text")
    if not isinstance(text, str) or not text.strip():
        return _fail("INVALID_INPUT", "validate")
    text = text.strip()
    if len(text) > MAX_TEXT_LENGTH:
        return _fail("INVALID_INPUT", "validate",
                     f"text length {len(text)} exceeds {MAX_TEXT_LENGTH}")

    if SUPERTONIC is None or LAM is None:
        return _fail("NOT_READY", "init", "bootstrap() was never called")
    # 기동 시점의 실패를 영구 차단으로 쓰지 않는다. 그때 실패한 워커도 지금은
    # 재시작되어 있을 수 있고, 아직도 못 쓰는 상태라면 아래 call() 이 어느 쪽이
    # 문제인지 정확한 단계로 알려준다. NOT_READY 하나로 뭉뚱그리면 그 정보가 사라진다.
    if INIT_ERRORS:
        print(json.dumps({"event": "init_errors_present",
                          "labels": sorted(INIT_ERRORS)}), flush=True)

    # 요청마다 고유한 경로. 워커는 재사용되므로 이전 발화의 파일이 남아 있으면
    # 다음 요청이 그것을 읽을 수 있다.
    wav_path = os.path.join(WORK_DIR, f"{utterance_id}.wav")
    tts_ms = lam_ms = 0.0
    try:
        t0 = time.time()
        try:
            tts = SUPERTONIC.call({"text": text, "out": wav_path}, SUPERTONIC_TIMEOUT_S)
        except WorkerError as exc:
            return _fail("TTS_FAILED", "synthesis", exc)
        tts_ms = round((time.time() - t0) * 1000, 1)

        t0 = time.time()
        try:
            lam = LAM.call({"wav": wav_path}, LAM_TIMEOUT_S)
        except WorkerError as exc:
            return _fail("LAM_FAILED", "inference", exc)
        lam_ms = round((time.time() - t0) * 1000, 1)

        with open(wav_path, "rb") as f:
            audio = f.read()

        # 같은 생성물이라는 것을 여기서도 확인한다. 합성이 쓴 파일, LAM 이 읽은
        # 파일, 응답에 실리는 바이트가 모두 같아야 한다.
        response_sha = hashlib.sha256(audio).hexdigest()
        if tts["sha256"] != lam["lam_source_sha256"] or tts["sha256"] != response_sha:
            return _fail("INTERNAL_ERROR", "identity",
                         "canonical / lam / response hashes disagree")

        if tts["synthesis_count"] != 1:
            return _fail("INTERNAL_ERROR", "identity",
                         f"synthesis_count is {tts['synthesis_count']}, expected 1")

        if lam["nan_count"] or lam["inf_count"]:
            return _fail("LAM_FAILED", "inference", "non-finite timeline")

        if len(audio) > MAX_AUDIO_BYTES:
            return _fail("RESPONSE_TOO_LARGE", "response",
                         f"{len(audio)} bytes exceeds {MAX_AUDIO_BYTES}")

        total_ms = round((time.time() - t_start) * 1000, 1)
        print(json.dumps({
            "event": "request", "requestId": request_id, "utteranceId": utterance_id,
            "coldStart": cold, "ttsMs": tts["synthesis_ms"], "lamMs": lam["inference_ms"],
            "totalMs": total_ms, "audioDurationS": tts["duration_s"],
            "textLength": len(text),
            "ttsRtf": round(tts["synthesis_ms"] / 1000 / tts["duration_s"], 4),
            "lamRtf": round(lam["inference_ms"] / 1000 / lam["audio_duration_s"], 4),
            "workerUptimeS": round(time.time() - WORKER_STARTED_AT, 1),
        }), flush=True)

        return {
            "requestId": request_id,
            "utteranceId": utterance_id,
            "engine": "supertonic+lam",
            "voiceStyle": tts["voice_style"],
            "audio": {
                "base64": base64.b64encode(audio).decode("ascii"),
                "mimeType": "audio/wav",
                "bytes": tts["bytes"],
                "sampleRate": tts["sample_rate"],
                "channels": tts["channels"],
                "subtype": tts["subtype"],
                "durationSeconds": tts["duration_s"],
                "sha256": response_sha,
            },
            "timeline": {
                "fps": lam["fps"],
                "frameCount": lam["frame_count"],
                "durationSeconds": lam["timeline_duration_s"],
                "channels": lam["channels"],
                "frames": lam["frames"],
            },
            "identity": {
                "canonicalSha256": tts["sha256"],
                "lamSourceSha256": lam["lam_source_sha256"],
                "responseSha256": response_sha,
                "sameSource": True,
                "synthesisCount": tts["synthesis_count"],
                "preprocessing": lam["preprocessing"],
                "lamTargetSampleRate": lam["target_sample_rate"],
            },
            # 측정되지 않은 값은 null 로 둔다. 0 은 "없음" 의 표현이 아니다.
            "diagnostics": {
                "coldStart": cold,
                "synthesisMs": tts["synthesis_ms"],
                "inferenceMs": lam["inference_ms"],
                "handlerMs": total_ms,
                "queueToTtsMs": tts_ms,
                "queueToLamMs": lam_ms,
                "workerInitMs": INIT_MS if cold else None,
                "workerUptimeS": round(time.time() - WORKER_STARTED_AT, 1),
                "supertonicModelLoadMs": SUPERTONIC.model_load_ms,
                "lamModelLoadMs": LAM.model_load_ms,
                "lamDevice": (LAM.ready_info or {}).get("device"),
                "lamWarmupMs": (LAM.ready_info or {}).get("warmup_ms"),
                "lamWarmupDecodeMs": (LAM.ready_info or {}).get("warmup_decode_ms"),
                "lamWarmupInferMs": (LAM.ready_info or {}).get("warmup_infer_ms"),
                "lamReadyMs": (LAM.ready_info or {}).get("ready_ms"),
                "librosaSubmodulesLoaded": (LAM.ready_info or {}).get("librosa_submodules_loaded"),
                "lamLoadMs": lam.get("load_ms"),
                "gpu": GPU_INFO,
                "jawOpenMax": lam["jawopen_max"],
                "jawOpenDistinct": lam["jawopen_distinct"],
                "framesAboveThreshold": lam["frames_above_threshold"],
                "activationThreshold": lam["activation_threshold"],
                "peakVramAllocated": lam["peak_vram_allocated"],
                "outputShape": lam["output_shape"],
            },
        }
    finally:
        # 워커는 재사용된다. 이 발화의 파일을 남기면 다음 요청의 디스크이자
        # 다음 사용자의 오디오가 된다.
        try:
            os.remove(wav_path)
        except OSError:
            pass


def main():
    bootstrap()
    runpod.serverless.start({"handler": handler})


if __name__ == "__main__":
    main()

