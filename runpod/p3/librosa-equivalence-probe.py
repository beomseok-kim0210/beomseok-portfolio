"""librosa.load(sr=16000) 과 soundfile+soxr 직접 호출의 수치 동등성 — 무료, 로컬 LAM venv.

결정을 위한 근거만 만든다. 워커 코드는 바꾸지 않는다.
"""
import json, os, sys, tempfile, time, wave
import numpy as np
WAV = "D:/dd-runpod-evidence/2026-09-11-p3-runpod-paid/cold-2.wav"
t = time.perf_counter(); import soundfile as sf; import soxr; t_direct_import = round((time.perf_counter()-t)*1000, 1)
def direct_load(path, target_sr=16000):
    y, sr = sf.read(path, dtype="float32", always_2d=True)
    y = y.T
    if y.shape[0] > 1: y = np.mean(y, axis=0)
    else: y = y[0]
    if sr != target_sr:
        n = int(np.ceil(y.shape[-1] * target_sr / sr))
        y = soxr.resample(y.T, sr, target_sr, quality="soxr_hq").T
        y = np.asarray(y, dtype=np.float32)
        if y.shape[-1] > n: y = y[..., :n]
        elif y.shape[-1] < n: y = np.pad(y, (0, n - y.shape[-1]))
    return y, target_sr
t = time.perf_counter(); d1, _ = direct_load(WAV); t_direct_first = round((time.perf_counter()-t)*1000, 1)
t = time.perf_counter(); d2, _ = direct_load(WAV); t_direct_second = round((time.perf_counter()-t)*1000, 1)
t = time.perf_counter(); import librosa; t_lib_import = round((time.perf_counter()-t)*1000, 1)
t = time.perf_counter(); l1, _ = librosa.load(WAV, sr=16000); t_lib_first = round((time.perf_counter()-t)*1000, 1)
fd, sil = tempfile.mkstemp(suffix=".wav"); os.close(fd)
with wave.open(sil, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(44100); w.writeframes(np.zeros(44100, dtype=np.int16).tobytes())
ls, _ = librosa.load(sil, sr=16000); ds, _ = direct_load(sil); os.remove(sil)
print(json.dumps({
  "numba_cache_dir": os.environ.get("NUMBA_CACHE_DIR"),
  "timings_ms": {"direct_import": t_direct_import, "direct_first": t_direct_first, "direct_second": t_direct_second,
                 "librosa_import": t_lib_import, "librosa_first_load": t_lib_first},
  "cold2_wav": {"shape_librosa": list(l1.shape), "shape_direct": list(d1.shape), "dtype": [str(l1.dtype), str(d1.dtype)],
                "bitwise_equal": bool(l1.shape == d1.shape and np.array_equal(l1, d1)),
                "max_abs_diff": float(np.max(np.abs(l1 - d1))) if l1.shape == d1.shape else None},
  "silence_1s": {"shape": [list(ls.shape), list(ds.shape)], "bitwise_equal": bool(ls.shape == ds.shape and np.array_equal(ls, ds))},
  "librosa_version": librosa.__version__, "soxr_version": soxr.__version__, "soundfile_version": sf.__version__,
}, indent=1))
