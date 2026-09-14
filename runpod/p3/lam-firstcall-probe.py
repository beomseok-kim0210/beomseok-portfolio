"""LAM 첫 호출 비용을 단계별로 잰다 — 무료, 로컬 LAM venv.

P3 관측: 콜드 워커의 첫 LAM 호출 15,840 ms 중 `inference_ms` 는 1,711 ms.
그 차이 ~14 s 가 어디에 있는지를 새 프로세스에서 단계별 타이머로 본다.
컨테이너 조건(빈 numba 캐시)을 흉내 내기 위해 NUMBA_CACHE_DIR 을 빈 임시 디렉터리로 둔다.

  NUMBA_CACHE_DIR=<empty> D:/dd-lam-a2e-v1/venv/Scripts/python.exe runpod/p3/lam-firstcall-probe.py
"""
import json
import os
import sys
import tempfile
import time
import wave

import numpy as np

T = {}
def lap(name, t0):
    T[name] = round((time.perf_counter() - t0) * 1000, 1)

SRC = os.path.abspath(os.environ["DD_LAM_SRC"])
CKPT = os.path.abspath(os.environ["DD_LAM_CKPT"])
sys.path.insert(0, SRC)
os.chdir(SRC)

t = time.perf_counter(); import librosa; lap("import_librosa", t)  # noqa: E402
t = time.perf_counter(); import torch; lap("import_torch", t)  # noqa: E402
t = time.perf_counter()
from engines.defaults import default_config_parser, default_setup  # noqa: E402
from engines.infer import INFER  # noqa: E402
lap("import_engines", t)

t = time.perf_counter()
cfg = default_config_parser("configs/lam_audio2exp_config_streaming.py",
                            {"weight": CKPT, "audio_input": "", "save_path": os.path.join(SRC, "exp")})
cfg = default_setup(cfg)
infer = INFER.build(dict(type=cfg.infer.type, cfg=cfg))
infer.model.eval()
lap("model_build_and_load", t)
device = str(next(infer.model.parameters()).device)

# 합성 입력: 44.1 kHz mono PCM_16 WAV 1.0 s 무음 — 프로덕션 canonical WAV 와 같은 포맷.
def write_silence(path, seconds=1.0, sr=44100):
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(np.zeros(int(sr * seconds), dtype=np.int16).tobytes())

tmp = tempfile.mkdtemp(prefix="dd-probe-")
p1 = os.path.join(tmp, "silence-1s.wav"); write_silence(p1)

t = time.perf_counter(); a1, sr = librosa.load(p1, sr=cfg.audio_sr); lap("librosa_load_1st", t)
t = time.perf_counter(); a2, _ = librosa.load(p1, sr=cfg.audio_sr); lap("librosa_load_2nd", t)

def run(audio):
    context, out = None, []
    chunks = audio.shape[0] // cfg.audio_sr + 1
    for i in range(chunks):
        res, context = infer.infer_streaming_audio(audio[i * cfg.audio_sr:(i + 1) * cfg.audio_sr], cfg.audio_sr, context)
        out.append(res["expression"])
    if torch.cuda.is_available():
        torch.cuda.synchronize()
    return np.concatenate(out, axis=0)

if torch.cuda.is_available():
    torch.cuda.reset_peak_memory_stats()
t = time.perf_counter(); o1 = run(a1); lap("infer_1st", t)
peak1 = int(torch.cuda.max_memory_allocated()) if torch.cuda.is_available() else None
t = time.perf_counter(); o2 = run(a2); lap("infer_2nd", t)
peak2 = int(torch.cuda.max_memory_allocated()) if torch.cuda.is_available() else None
reserved = int(torch.cuda.memory_reserved()) if torch.cuda.is_available() else None

# 실제 발화 길이(2.86 s)에 가까운 입력으로도 한 번 — 워밍업 뒤 정상 길이 추론이 웜인지
p3 = os.path.join(tmp, "silence-3s.wav"); write_silence(p3, 2.86)
a3, _ = librosa.load(p3, sr=cfg.audio_sr)
t = time.perf_counter(); o3 = run(a3); lap("infer_3rd_2.86s", t)

for p in (p1, p3):
    os.remove(p)
os.rmdir(tmp)

print(json.dumps({"device": device, "numba_cache_dir": os.environ.get("NUMBA_CACHE_DIR"),
                  "timings_ms": T, "frames": [int(o1.shape[0]), int(o2.shape[0]), int(o3.shape[0])],
                  "peak_alloc_after_1st": peak1, "peak_alloc_after_2nd": peak2, "reserved_after": reserved}, indent=1))
