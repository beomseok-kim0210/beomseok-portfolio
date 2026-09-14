"""Supertonic 3 / voice M1 — a long-lived synthesis worker.

Runs in the Supertonic venv (onnxruntime, CPU). The ONNX sessions are built once
and reused, because building them costs about a second and that cost has no
business being paid per utterance.

Protocol: one JSON object per line on stdin, one JSON object per line on stdout.

  in   {"id": "...", "text": "...", "out": "<absolute wav path>"}
  out  {"id": "...", "ok": true, "sha256": "...", "bytes": N, ...}

Settings are the frozen ones from the 2026-09-04 qualification, not new choices:
voice M1, lang ko, total_steps 8, speed 1.05, silence_duration 0.3.

synthesize() hands back the samples in process, so the file written here holds
exactly what was generated. Nothing re-synthesises it later — LAM reads this same
file, and the browser plays these same bytes.

The model draws a fresh latent per call and exposes no seed, so output is not
byte-deterministic. That is fine and it is the reason the pipeline must generate
once and share: two calls would produce two different voices.
"""
import hashlib
import json
import os
import sys
import time

import numpy as np
import soundfile as sf
from supertonic import TTS

sys.stdin.reconfigure(encoding="utf-8")
sys.stdout.reconfigure(encoding="utf-8")

MODEL_DIR = os.environ.get("DD_SUPERTONIC_MODEL_DIR")
VOICE, LANG, TOTAL_STEPS, SPEED, SILENCE = "M1", "ko", 8, 1.05, 0.3

t0 = time.perf_counter()
tts = TTS(model="supertonic-3", model_dir=MODEL_DIR, auto_download=False)
style = tts.get_voice_style(voice_name=VOICE)
load_ms = round((time.perf_counter() - t0) * 1000, 1)

print(json.dumps({"ready": True, "engine": "Supertonic 3", "voice_style": VOICE,
                  "sample_rate": int(tts.sample_rate), "model_load_ms": load_ms,
                  "settings": {"lang": LANG, "total_steps": TOTAL_STEPS,
                               "speed": SPEED, "silence_duration": SILENCE}}),
      flush=True)

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        req = json.loads(line)
        text, out = req["text"], os.path.abspath(req["out"])
        os.makedirs(os.path.dirname(out), exist_ok=True)

        t0 = time.perf_counter()
        wav, _dur = tts.synthesize(text, voice_style=style, total_steps=TOTAL_STEPS,
                                   speed=SPEED, silence_duration=SILENCE, lang=LANG)
        synth_ms = round((time.perf_counter() - t0) * 1000, 1)

        tts.save_audio(wav, out)
        blob = open(out, "rb").read()
        info = sf.info(out)
        mono = np.asarray(wav).reshape(-1)

        print(json.dumps({
            "id": req.get("id"), "ok": True,
            "sha256": hashlib.sha256(blob).hexdigest(),
            "bytes": len(blob),
            "sample_rate": info.samplerate, "channels": info.channels,
            "subtype": info.subtype, "frames": info.frames,
            "duration_s": round(info.duration, 4),
            "peak_abs": round(float(np.abs(mono).max()), 6),
            "synthesis_ms": synth_ms,
            "synthesis_count": 1,
            "voice_style": VOICE,
        }), flush=True)
    except Exception as exc:  # one bad request must not kill the worker
        print(json.dumps({"id": json.loads(line).get("id") if line.startswith("{") else None,
                          "ok": False, "error": f"{type(exc).__name__}: {exc}"}),
              flush=True)
