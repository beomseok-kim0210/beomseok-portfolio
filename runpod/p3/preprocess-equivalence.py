"""전처리 동등성 — librosa.load / librosa.feature.rms  vs  voice/lam_audio (soundfile + soxr + numpy).

표본마다 old/new 를 같은 프로세스에서 계산해 비트 단위로 비교한다. rms 는 LAM 엔진이 실제로
부르는 방식(청크 16000 샘플, frame_length = min(533, len), hop 533)을 그대로 재현해 비교한다.

  D:/dd-lam-a2e-v1/venv/Scripts/python.exe runpod/p3/preprocess-equivalence.py
"""
import hashlib
import json
import os
import sys

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "voice"))
import lam_audio  # noqa: E402
import librosa  # noqa: E402
import soxr  # noqa: E402

SAMPLES = "D:/dd-runpod-evidence/2026-09-14-soundfile-soxr/samples"
manifest = json.load(open(os.path.join(SAMPLES, "manifest.json"), encoding="utf-8"))
SR = 16000
FPS = 30


def sha(a):
    return hashlib.sha256(np.ascontiguousarray(a).tobytes()).hexdigest()


def compare(old, new):
    # 마지막 빈 청크의 rms 는 양쪽 다 [[nan]] 이다 (엔진은 그것을 volume[:0] 으로 버린다).
    # NaN 은 NaN 과 같지 않으므로 equal_nan 없이 비교하면 같은 값이 다르다고 나온다.
    eq = old.shape == new.shape and old.dtype == new.dtype and np.array_equal(old, new, equal_nan=True)
    d = np.abs(old.astype(np.float64) - new.astype(np.float64)) if old.shape == new.shape else None
    return {"dtype": [str(old.dtype), str(new.dtype)], "ndim": [old.ndim, new.ndim], "shape": [list(old.shape), list(new.shape)],
            "min": [float(old.min()), float(new.min())] if old.size and new.size else None,
            "max": [float(old.max()), float(new.max())] if old.size and new.size else None,
            "bitwise_equal": bool(eq), "nan_count": [int(np.isnan(old).sum()), int(np.isnan(new).sum())],
            "max_abs_error": float(np.nanmax(d)) if d is not None and d.size and not np.isnan(d).all() else None,
            "mean_abs_error": float(np.nanmean(d)) if d is not None and d.size and not np.isnan(d).all() else None,
            "sha_old": sha(old)[:16], "sha_new": sha(new)[:16]}


def lam_rms_calls(audio, rms_fn):
    """engines/infer.py:171 이 청크마다 부르는 정확한 호출을 재현한다."""
    out = []
    chunks = audio.shape[0] // SR + 1
    for i in range(chunks):
        a = audio[i * SR:(i + 1) * SR]
        # 엔진은 마지막 빈 청크(정확한 배수 길이일 때)에도 frame_length=0 으로 rms 를 부른다.
        # 그 호출도 그대로 재현한다 — 건너뛰면 "모든 호출을 재현했다" 가 거짓이 된다.
        fl = min(int(1 / FPS * SR), len(a)); hl = int(1 / FPS * SR)
        out.append(rms_fn(y=a, frame_length=fl, hop_length=hl)[0])
    return np.concatenate(out) if out else np.zeros(0, np.float32)


results = {}
all_pass = True
for name, meta in manifest.items():
    path = os.path.join(SAMPLES, f"{name}.wav")
    old, sr_old = librosa.load(path, sr=SR)
    new, sr_new = lam_audio.load(path, sr=SR)
    r = {"kind": meta["kind"], "duration_s": meta["duration_s"], "sr": [sr_old, sr_new], "load": compare(old, new)}
    # rms — LAM 이 부르는 방식 그대로, 각각 자기 경로의 배열에
    r["rms_on_own_array"] = compare(lam_rms_calls(old, librosa.feature.rms), lam_rms_calls(new, lam_audio.rms))
    # rms 함수 자체의 동등성 (같은 입력)
    r["rms_same_input"] = compare(lam_rms_calls(old, librosa.feature.rms), lam_rms_calls(old, lam_audio.rms))
    # soxr quality 문자열: librosa 가 넘기는 "soxr_hq" 와 soxr 문서의 "HQ"
    y44 = lam_audio.load(path, sr=None)[0]
    q1 = soxr.resample(y44, 44100, SR, quality="soxr_hq"); q2 = soxr.resample(y44, 44100, SR, quality="HQ")
    r["soxr_hq_vs_HQ_bitwise"] = bool(np.array_equal(q1, q2))
    ok = r["load"]["bitwise_equal"] and r["rms_on_own_array"]["bitwise_equal"] and r["rms_same_input"]["bitwise_equal"]
    r["PASS"] = bool(ok); all_pass &= ok
    results[name] = r
    print(f"{name:22s} {meta['duration_s']:7.3f}s  load {'==' if r['load']['bitwise_equal'] else '!='} "
          f"shape {r['load']['shape'][1]}  rms {'==' if r['rms_on_own_array']['bitwise_equal'] else '!='} "
          f"soxr_hq==HQ {r['soxr_hq_vs_HQ_bitwise']}  {'PASS' if ok else 'FAIL'}")

out = {"librosa": librosa.__version__, "soxr": soxr.__version__, "numpy": np.__version__,
       "cases": len(results), "all_bitwise": bool(all_pass), "results": results}
json.dump(out, open("D:/dd-runpod-evidence/2026-09-14-soundfile-soxr/preprocess-equivalence.json", "w"), indent=1)
print(f"\nCASES={len(results)} PREPROCESS_BITWISE_EQUIVALENCE={'PASS' if all_pass else 'FAIL'}")
