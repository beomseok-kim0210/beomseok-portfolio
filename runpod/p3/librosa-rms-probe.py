"""librosa.feature.rms 의 첫 호출 비용 — LAM 엔진이 매 청크마다 부른다 (engines/infer.py:171).
load 를 soundfile+soxr 로 바꿔도 이 호출이 numba 컴파일을 대신 치르는지 새 프로세스·빈 캐시로 잰다."""
import json, os, time
import numpy as np
T = {}
t = time.perf_counter(); import librosa; T["import_librosa"] = round((time.perf_counter()-t)*1000, 1)
y = np.zeros(16000, dtype=np.float32)
t = time.perf_counter(); r1 = librosa.feature.rms(y=y, frame_length=533, hop_length=533)[0]; T["rms_first"] = round((time.perf_counter()-t)*1000, 1)
t = time.perf_counter(); r2 = librosa.feature.rms(y=y, frame_length=533, hop_length=533)[0]; T["rms_second"] = round((time.perf_counter()-t)*1000, 1)
# 그 뒤 load 를 부르면 추가 컴파일이 남아 있는가?
import tempfile, wave
fd, p = tempfile.mkstemp(suffix=".wav"); os.close(fd)
with wave.open(p, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(44100); w.writeframes(np.zeros(44100, dtype=np.int16).tobytes())
t = time.perf_counter(); librosa.load(p, sr=16000); T["load_first_after_rms"] = round((time.perf_counter()-t)*1000, 1)
os.remove(p)
print(json.dumps({"numba_cache_dir": os.environ.get("NUMBA_CACHE_DIR"), "timings_ms": T, "rms_shape": list(r1.shape)}))
