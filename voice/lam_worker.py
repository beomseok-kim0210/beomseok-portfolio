"""LAM-A2E — a long-lived audio-to-expression worker.

Runs in the LAM venv (torch 2.1.2+cu121, librosa) on the local GPU. The
checkpoint costs ~2.4 s to load and ~460 MB of VRAM, so it is loaded once and
kept resident.

Protocol: one JSON object per line on stdin, one JSON object per line on stdout.

  in   {"id": "...", "wav": "<absolute wav path>"}
  out  {"id": "...", "ok": true, "fps": 30.0, "frames": [...], ...}

The waveform handed in is the canonical one Supertonic produced. It is decoded
and resampled to the model's 16 kHz by `lam_audio.load`, a bit-exact
reimplementation of the call LAM's own pipeline makes — engines/infer.py:121 is
`librosa.load(audio_input, sr=16000)` — on the same libraries librosa delegates
to (soundfile, soxr). Equivalence is proven per canonical sample by the suite in
runpod/p3/preprocess-equivalence.py, not assumed. The sha256 of the file read is
reported back so the caller can say which audio was analysed.

Why not librosa itself. On a cold RunPod worker the first call into any lazy
librosa submodule compiled numba ufuncs for 15–28 s (measured; the P3 first
LAM call was 15,840 ms against 1,711 ms of inference). LAM's engine also calls
`librosa.feature.rms` on every chunk, so swapping only `load` would have moved
the tax into the first inference. `LibrosaShim` therefore replaces the engine's
`librosa` binding with the same three functions reimplemented in numpy/soxr.
librosa itself is still imported — engines/infer.py does `import librosa` at
module top, a ~10 ms lazy shell — so it must remain installed; what never
happens is the first call into a lazy submodule, which is where the cost lives.

The honest limit: the hash is taken by reopening the path after inference,
independently of the decode. It proves which file this worker analysed, not
that the decoder saw those same bytes. Closing that gap would mean handing LAM
the buffer instead of a path.

Only the four channels the frozen SEL cap1.6 calibration reads are emitted, raw.
The calibration lives in TypeScript and is applied once, on the client, so there
is a single implementation of the curves.

Bootstrap warm-up. With librosa gone, what remains of the first-call cost is the
first CUDA forward (kernel/cuDNN initialisation: 1.7 s in the P3 container,
0.3–3.5 s locally). It is paid here, before READY, on a synthetic 1 s silent WAV
that is generated, decoded through the same `lam_audio.load`, run through the
same `run_streaming` as a request, and deleted. It is not a user utterance, it
never touches Supertonic, and nothing it produces is emitted. READY is announced
only after the warm-up succeeds; on failure the worker announces
{"ready": false} and exits so the orchestrator recycles it.
"""
import hashlib
import json
import os
import sys
import tempfile
import time
import wave

sys.stdin.reconfigure(encoding="utf-8")
sys.stdout.reconfigure(encoding="utf-8")

SRC = os.path.abspath(os.environ["DD_LAM_SRC"])
CKPT = os.path.abspath(os.environ["DD_LAM_CKPT"])
sys.path.insert(0, SRC)
os.chdir(SRC)

import numpy as np  # noqa: E402
import torch  # noqa: E402
from engines.defaults import default_config_parser, default_setup  # noqa: E402
import engines.infer as _engine  # noqa: E402
from engines.infer import INFER  # noqa: E402

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lam_audio  # noqa: E402

# 엔진 모듈의 `librosa` 이름을 numpy/soxr 재구현으로 바꾼다. 엔진은 스트리밍 청크마다
# librosa.feature.rms 를 부르고 (engines/infer.py:171), 그 첫 호출이 numba 컴파일을
# 치른다 — load 만 바꾸면 세금은 옮겨 갈 뿐이다. shim 에 없는 것을 부르면 크게 실패한다.
_engine.librosa = lam_audio.LibrosaShim()

# measured in L2 over 6.12 s of digital silence — the model's own silent floor
L2_SILENCE_JAWOPEN_MAX = 0.0007102741510607302
CH = {"jaw": 24, "round": 37, "upperLift": 42, "stretchL": 45, "stretchR": 46}


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


t0 = time.perf_counter()
cfg = default_config_parser("configs/lam_audio2exp_config_streaming.py",
                            {"weight": CKPT, "audio_input": "",
                             "save_path": os.path.join(SRC, "exp")})
cfg = default_setup(cfg)
infer = INFER.build(dict(type=cfg.infer.type, cfg=cfg))
infer.model.eval()
load_ms = round((time.perf_counter() - t0) * 1000, 1)


def run_streaming(audio, sr):
    """The request path's inference loop, shared with the warm-up so the warm-up
    exercises exactly the code a real request will run."""
    chunks = audio.shape[0] // cfg.audio_sr + 1
    context, out = None, []
    for i in range(chunks):
        res, context = infer.infer_streaming_audio(
            audio[i * cfg.audio_sr:(i + 1) * cfg.audio_sr], sr, context)
        out.append(res["expression"])
    if torch.cuda.is_available():
        torch.cuda.synchronize()
    return np.concatenate(out, axis=0)


def warm_up(seconds=0.5, sample_rate=44100):
    """Pay the first CUDA forward before READY, on input that is not a user utterance.

    Same container format as the canonical WAV Supertonic writes (44.1 kHz mono
    PCM_16), decoded by the same `lam_audio.load` a request uses, then one
    streaming pass so CUDA kernels and cuDNN are initialised. 0.5 s at 16 kHz is
    8,000 samples — strictly less than one 16,000-sample chunk, so the engine's
    `n // sr + 1` loop makes exactly one forward (1.0 s would make two, the
    second on an empty chunk). Output is discarded. The file lives only for the
    duration of this call.

    The engine's post-processing draws from `np.random` (eye blinks). The RNG
    state is saved and restored around the warm-up so the first real request
    sees the same RNG sequence it would have seen without a warm-up.
    """
    fd, path = tempfile.mkstemp(prefix="dd-lam-warmup-", suffix=".wav")
    os.close(fd)
    try:
        with wave.open(path, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(sample_rate)
            w.writeframes(np.zeros(int(sample_rate * seconds), dtype=np.int16).tobytes())

        # 테스트 전용 고장 주입. 실제 워밍업 실패 분기(ready:false → exit 3)를 GPU 가
        # 있는 기계에서 재현할 다른 방법이 없다. 프로덕션 환경에는 이 변수가 없다.
        if os.environ.get("DD_LAM_WARMUP_FAULT"):
            raise RuntimeError("injected warm-up fault (DD_LAM_WARMUP_FAULT)")

        t_load = time.perf_counter()
        audio, sr = lam_audio.load(path, sr=cfg.audio_sr)
        decode_ms = round((time.perf_counter() - t_load) * 1000, 1)

        if torch.cuda.is_available():
            torch.cuda.reset_peak_memory_stats()
        rng_state = np.random.get_state()
        t_inf = time.perf_counter()
        try:
            arr = run_streaming(audio, sr)
        finally:
            np.random.set_state(rng_state)
        infer_ms_ = round((time.perf_counter() - t_inf) * 1000, 1)
        if not np.isfinite(arr).all():
            raise RuntimeError("warm-up produced non-finite output")
        return {
            "warmup_seconds": seconds,
            "warmup_decode_ms": decode_ms,
            "warmup_infer_ms": infer_ms_,
            "warmup_frames": int(arr.shape[0]),
            "warmup_peak_vram_allocated": int(torch.cuda.max_memory_allocated())
            if torch.cuda.is_available() else None,
        }
    finally:
        try:
            os.remove(path)
        except OSError:
            pass


t_warm = time.perf_counter()
try:
    warm = warm_up()
except Exception as exc:  # READY must not be announced over a broken first call
    print(json.dumps({"ready": False, "engine": "LAM-A2E", "stage": "warmup",
                      "error": f"{type(exc).__name__}: {exc}",
                      "model_load_ms": load_ms}), flush=True)
    sys.exit(3)
warm["warmup_ms"] = round((time.perf_counter() - t_warm) * 1000, 1)

print(json.dumps({"ready": True, "engine": "LAM-A2E",
                  "device": str(next(infer.model.parameters()).device),
                  "parameter_count": int(sum(p.numel() for p in infer.model.parameters())),
                  "checkpoint_sha256": sha256(CKPT),
                  "audio_sr": int(cfg.audio_sr), "fps": float(cfg.fps),
                  "model_load_ms": load_ms,
                  "ready_ms": round(load_ms + warm["warmup_ms"], 1),
                  # 증거: shim 이 실제로 librosa 의 lazy 서브모듈 로드(= numba 컴파일)를
                  # 막았는지. 기대 기준선은 ["librosa.version"] 하나다 — engines.infer 의
                  # 최상위 `import librosa` 가 남기는 10 ms 짜리 껍데기. core/util/feature
                  # 가 보이면 세금 경로가 열린 것이다.
                  "librosa_submodules_loaded": sorted(m for m in sys.modules
                                                      if m.startswith("librosa.")),
                  "librosa_lazy_loaded": any(m.startswith("librosa.") and m != "librosa.version"
                                             for m in sys.modules),
                  **warm}), flush=True)

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        req = json.loads(line)
        wav_path = os.path.abspath(req["wav"])

        t_load = time.perf_counter()
        audio, sr = lam_audio.load(wav_path, sr=cfg.audio_sr)
        load_ms_req = round((time.perf_counter() - t_load) * 1000, 1)
        torch.cuda.reset_peak_memory_stats()

        t0 = time.perf_counter()
        arr = run_streaming(audio, sr)
        infer_ms = round((time.perf_counter() - t0) * 1000, 1)

        fps = float(cfg.fps)
        jaw = arr[:, CH["jaw"]].astype(np.float64)
        frames = [{
            "t": round(i / fps, 6),
            "jaw": round(float(arr[i, CH["jaw"]]), 6),
            "round": round(float(arr[i, CH["round"]]), 6),
            "stretch": round(float((arr[i, CH["stretchL"]] + arr[i, CH["stretchR"]]) / 2.0), 6),
            "upperLift": round(float(arr[i, CH["upperLift"]]), 6),
        } for i in range(arr.shape[0])]

        print(json.dumps({
            "id": req.get("id"), "ok": True,
            "lam_source_sha256": sha256(wav_path),
            "preprocessing": ("lam_audio.load(canonical_wav, sr=cfg.audio_sr) — soundfile decode + "
                              "soxr_hq resample, a bit-exact reimplementation of librosa.load as "
                              "LAM's own loader calls it at engines/infer.py:121; sample rate from "
                              "the model config. Equivalence: runpod/p3/preprocess-equivalence.py"),
            "target_sample_rate": int(cfg.audio_sr),
            "samples_at_16k": int(audio.shape[0]),
            "audio_duration_s": round(audio.shape[0] / sr, 4),
            "fps": fps,
            "frame_count": int(arr.shape[0]),
            "timeline_duration_s": round(arr.shape[0] / fps, 4),
            "output_shape": list(arr.shape),
            "nan_count": int(np.isnan(arr).sum()),
            "inf_count": int(np.isinf(arr).sum()),
            "jawopen_max": float(jaw.max()),
            "jawopen_distinct": int(np.unique(np.round(jaw, 6)).size),
            "activation_threshold": L2_SILENCE_JAWOPEN_MAX,
            "frames_above_threshold": int((jaw > L2_SILENCE_JAWOPEN_MAX).sum()),
            "inference_ms": infer_ms,
            "load_ms": load_ms_req,
            "peak_vram_allocated": int(torch.cuda.max_memory_allocated()),
            "channels": {"jaw": "jawOpen[24]", "round": "mouthPucker[37]",
                         "stretch": "mean(mouthStretchLeft[45], mouthStretchRight[46])",
                         "upperLift": "mouthShrugUpper[42]"},
            "frames": frames,
        }), flush=True)
    except Exception as exc:
        print(json.dumps({"id": json.loads(line).get("id") if line.startswith("{") else None,
                          "ok": False, "error": f"{type(exc).__name__}: {exc}"}),
              flush=True)
