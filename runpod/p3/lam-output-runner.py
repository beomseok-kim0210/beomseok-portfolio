"""LAM 전체 expression 행렬 [N,52] 을 표본마다 덤프한다 — old(librosa) 또는 new(lam_audio+shim).

워커와 같은 설정·같은 run_streaming 루프. 새 프로세스로 mode 마다 따로 돌려 비교한다.

  python lam-output-runner.py --mode old|new --tag <name>
"""
import json
import os
import sys
import time

import numpy as np

mode = sys.argv[sys.argv.index("--mode") + 1]
tag = sys.argv[sys.argv.index("--tag") + 1]
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.abspath(os.environ["DD_LAM_SRC"]); CKPT = os.path.abspath(os.environ["DD_LAM_CKPT"])
SAMPLES = "D:/dd-runpod-evidence/2026-09-14-soundfile-soxr/samples"
OUT = os.path.join("D:/dd-runpod-evidence/2026-09-14-soundfile-soxr/lam-output", tag)
os.makedirs(OUT, exist_ok=True)
sys.path.insert(0, SRC); os.chdir(SRC)

import torch  # noqa: E402
from engines.defaults import default_config_parser, default_setup  # noqa: E402
import engines.infer as _engine  # noqa: E402
from engines.infer import INFER  # noqa: E402

T = {}
if mode == "new":
    sys.path.insert(0, os.path.join(ROOT, "voice"))
    import lam_audio
    _engine.librosa = lam_audio.LibrosaShim()
    load = lam_audio.load
else:
    import librosa
    load = lambda p, sr: librosa.load(p, sr=sr)  # noqa: E731

cfg = default_config_parser("configs/lam_audio2exp_config_streaming.py",
                            {"weight": CKPT, "audio_input": "", "save_path": os.path.join(SRC, "exp")})
cfg = default_setup(cfg)
infer = INFER.build(dict(type=cfg.infer.type, cfg=cfg)); infer.model.eval()

def run_streaming(audio, sr):
    chunks = audio.shape[0] // cfg.audio_sr + 1
    context, out = None, []
    for i in range(chunks):
        res, context = infer.infer_streaming_audio(audio[i * cfg.audio_sr:(i + 1) * cfg.audio_sr], sr, context)
        out.append(res["expression"])
    torch.cuda.synchronize()
    return np.concatenate(out, axis=0)

manifest = json.load(open(os.path.join(SAMPLES, "manifest.json"), encoding="utf-8"))
meta = {"mode": mode, "tag": tag, "device": str(next(infer.model.parameters()).device), "timings": {}}
first = True
for name in manifest:
    path = os.path.join(SAMPLES, f"{name}.wav")
    if "--seed" in sys.argv:
        # 후처리의 무작위 눈 깜빡임(np.random)을 고정한다 — 전처리 차이만 남기기 위해
        np.random.seed(int(sys.argv[sys.argv.index("--seed") + 1])); torch.manual_seed(0)
    t = time.perf_counter(); audio, sr = load(path, cfg.audio_sr); t_load = round((time.perf_counter() - t) * 1000, 1)
    t = time.perf_counter(); arr = run_streaming(audio, sr); t_inf = round((time.perf_counter() - t) * 1000, 1)
    np.save(os.path.join(OUT, f"{name}.npy"), arr.astype(np.float32))
    meta["timings"][name] = {"load_ms": t_load, "infer_ms": t_inf, "shape": list(arr.shape), "first_call": first}
    first = False
meta["librosa_submodules_loaded"] = sorted(m for m in sys.modules if m.startswith("librosa."))
json.dump(meta, open(os.path.join(OUT, "meta.json"), "w"), indent=1)
print(json.dumps({k: v for k, v in meta.items() if k != "timings"}), "| first sample:", json.dumps(meta["timings"][next(iter(manifest))]))
