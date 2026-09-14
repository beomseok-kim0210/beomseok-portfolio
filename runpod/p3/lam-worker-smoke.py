"""실제 lam_worker.py 를 새 프로세스로 띄워 READY → 요청 1 건을 재고, 워밍업 지표를 기록한다.

무료. 로컬 LAM venv + 로컬 GPU. 사용자 발화는 P3 에서 실제로 만들어진 canonical WAV
(cold-2.wav) 를 그대로 쓴다 — Supertonic 은 부르지 않으므로 합성 횟수는 0 이다.

  python runpod/p3/lam-worker-smoke.py --numba-cache empty|keep
"""
import hashlib
import json
import os
import subprocess
import sys
import tempfile
import time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
WAV = "D:/dd-runpod-evidence/2026-09-11-p3-runpod-paid/cold-2.wav"
LAM_PY = "D:/dd-lam-a2e-v1/venv/Scripts/python.exe"
mode = sys.argv[sys.argv.index("--numba-cache") + 1] if "--numba-cache" in sys.argv else "empty"

env = {**os.environ,
       "DD_LAM_SRC": "D:/dd-lam-a2e-v1/src/LAM_Audio2Expression",
       "DD_LAM_CKPT": "D:/dd-lam-a2e-v1/models/extracted/pretrained_models/lam_audio2exp_streaming.tar",
       "HF_HUB_OFFLINE": "1", "TRANSFORMERS_OFFLINE": "1",
       "PYTHONIOENCODING": "utf-8", "PYTHONUNBUFFERED": "1"}
if mode == "empty":
    env["NUMBA_CACHE_DIR"] = tempfile.mkdtemp(prefix="dd-numba-empty-")
else:
    env["NUMBA_CACHE_DIR"] = os.path.join(tempfile.gettempdir(), "dd-numba-keep")
    os.makedirs(env["NUMBA_CACHE_DIR"], exist_ok=True)

t_spawn = time.perf_counter()
p = subprocess.Popen([LAM_PY, os.path.join(ROOT, "voice", "lam_worker.py")],
                     stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                     env=env, text=True, encoding="utf-8", bufsize=1)

def next_json():
    while True:
        line = p.stdout.readline()
        if line == "":
            raise RuntimeError("worker exited before answering")
        line = line.strip()
        if not line:
            continue
        try:
            return json.loads(line)
        except json.JSONDecodeError:
            continue

ready = next_json()
ready_wall_ms = round((time.perf_counter() - t_spawn) * 1000, 1)
if not ready.get("ready"):
    print(json.dumps({"READY": False, "announce": ready}, indent=1)); sys.exit(1)

t_req = time.perf_counter()
p.stdin.write(json.dumps({"id": "smoke-1", "wav": WAV}) + "\n"); p.stdin.flush()
r1 = next_json()
req1_wall_ms = round((time.perf_counter() - t_req) * 1000, 1)
t_req = time.perf_counter()
p.stdin.write(json.dumps({"id": "smoke-2", "wav": WAV}) + "\n"); p.stdin.flush()
r2 = next_json()
req2_wall_ms = round((time.perf_counter() - t_req) * 1000, 1)
# 실패 경로: 존재하지 않는 경로, WAV 가 아닌 파일 — 워커는 ok:false 로 답하고 계속 살아야 한다
bad_txt = os.path.join(tempfile.gettempdir(), "dd-smoke-not-a-wav.txt")
open(bad_txt, "w").write("this is not audio")
failures = []
for label, path in (("missing-path", os.path.join(tempfile.gettempdir(), "dd-smoke-missing.wav")), ("not-a-wav", bad_txt)):
    t_req = time.perf_counter()
    p.stdin.write(json.dumps({"id": label, "wav": path}) + "\n"); p.stdin.flush()
    r = next_json()
    failures.append({"label": label, "ok": r.get("ok"), "error_head": str(r.get("error", ""))[:80], "wall_ms": round((time.perf_counter() - t_req) * 1000, 1)})
os.remove(bad_txt)
t_req = time.perf_counter()
p.stdin.write(json.dumps({"id": "smoke-3-after-failures", "wav": WAV}) + "\n"); p.stdin.flush()
r3 = next_json()
after_fail = {"ok": r3.get("ok"), "frames": r3.get("frame_count"), "inference_ms": r3.get("inference_ms"), "wall_ms": round((time.perf_counter() - t_req) * 1000, 1)}
p.stdin.close(); p.wait(timeout=30)

sha = hashlib.sha256(open(WAV, "rb").read()).hexdigest()
out = {
    "numba_cache_mode": mode,
    "READY": True,
    "ready_wall_ms_from_spawn": ready_wall_ms,
    "model_load_ms": ready.get("model_load_ms"),
    "warmup_ms": ready.get("warmup_ms"),
    "warmup_decode_ms": ready.get("warmup_decode_ms"),
    "librosa_submodules_loaded": ready.get("librosa_submodules_loaded"),
    "warmup_infer_ms": ready.get("warmup_infer_ms"),
    "warmup_frames": ready.get("warmup_frames"),
    "warmup_peak_vram_allocated": ready.get("warmup_peak_vram_allocated"),
    "device": ready.get("device"),
    "request1": {"wall_ms": req1_wall_ms, "load_ms": r1.get("load_ms"), "inference_ms": r1.get("inference_ms"),
                 "frames": r1.get("frame_count"), "shape": r1.get("output_shape"),
                 "lam_source_sha256_matches_file": r1.get("lam_source_sha256") == sha,
                 "peak_vram_allocated": r1.get("peak_vram_allocated"), "nan": r1.get("nan_count")},
    "request2": {"wall_ms": req2_wall_ms, "load_ms": r2.get("load_ms"), "inference_ms": r2.get("inference_ms"),
                 "frames": r2.get("frame_count")},
    "malformed_inputs": failures,
    "request_after_failures": after_fail,
    "worker_exit_code": p.returncode,
    "temp_warmup_files_left": [f for f in os.listdir(tempfile.gettempdir()) if f.startswith("dd-lam-warmup-")],
}
print(json.dumps(out, indent=1))
