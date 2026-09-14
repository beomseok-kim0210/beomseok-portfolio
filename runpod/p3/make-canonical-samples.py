"""동등성 검증용 canonical WAV 표본을 만든다 — 실제 Supertonic 워커로.

프로덕션에서 나오는 그 포맷(Supertonic 의 save_audio: 44.1 kHz mono PCM_16)을 그대로 쓴다.
사용자 발화가 아니라 시험 표본이므로 합성 횟수 불변식과 무관하다.

  python runpod/p3/make-canonical-samples.py
"""
import json
import os
import subprocess
import sys

import numpy as np
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = "D:/dd-runpod-evidence/2026-09-14-soundfile-soxr/samples"
os.makedirs(OUT, exist_ok=True)

SUPERTONIC_PY = "D:/dd-supertonic-v1/venv/Scripts/python.exe"
TEXTS = {
    "s1-short": "네.",
    "s2-short2": "안녕하세요.",
    "s3-medium": "안녕하세요, 디지털 도슨트입니다.",
    "s4-long": "이 포트폴리오에는 매일 AI 뉴스를 자동으로 수집하고 교차 검증해 지식 노트로 쌓는 파이프라인이 돌고 있습니다. 그 노트에서 실제로 적용할 기술을 골라 구현한 결과가 지금 보시는 도슨트입니다.",
    "s5-verylong": "저는 김범석입니다. 인공지능 리서치에서 실제 제품까지 이어지는 과정을 좋아합니다. 구글이 공개한 파라메트릭 3D 헤드 모델을 바탕으로 얼굴을 만들고, 슈퍼토닉으로 목소리를 합성하고, 램 모델로 표정 타임라인을 뽑아 이 도슨트를 완성했습니다. 궁금한 것이 있으면 무엇이든 물어보세요. 프로젝트, 기술 스택, 그리고 제가 걸어온 길에 대해 성실하게 답하겠습니다.",
}

env = {**os.environ, "DD_SUPERTONIC_MODEL_DIR": "D:/dd-supertonic-v1/models/supertonic-3",
       "PYTHONIOENCODING": "utf-8", "PYTHONUNBUFFERED": "1"}
p = subprocess.Popen([SUPERTONIC_PY, os.path.join(ROOT, "voice", "supertonic_worker.py")],
                     stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                     env=env, text=True, encoding="utf-8", bufsize=1)

def next_json():
    while True:
        line = p.stdout.readline()
        if line == "":
            raise RuntimeError("supertonic worker exited")
        line = line.strip()
        if not line:
            continue
        try:
            return json.loads(line)
        except json.JSONDecodeError:
            continue

ready = next_json(); assert ready.get("ready"), ready
manifest = {}
for name, text in TEXTS.items():
    out = os.path.join(OUT, f"{name}.wav")
    p.stdin.write(json.dumps({"id": name, "text": text, "out": out}) + "\n"); p.stdin.flush()
    r = next_json(); assert r.get("ok"), r
    manifest[name] = {"kind": "supertonic", "text_len": len(text), "sample_rate": r["sample_rate"], "channels": r["channels"],
                      "subtype": r["subtype"], "frames": r["frames"], "duration_s": r["duration_s"], "sha256": r["sha256"]}
p.stdin.close(); p.wait(timeout=30)

# 합성 edge 표본 — 프로덕션 포맷 그대로 (44.1 kHz mono PCM_16), 소리만 인위적
def synth(name, samples, note):
    out = os.path.join(OUT, f"{name}.wav")
    sf.write(out, samples.astype(np.int16), 44100, subtype="PCM_16")
    info = sf.info(out)
    manifest[name] = {"kind": "synthetic", "note": note, "sample_rate": info.samplerate, "channels": info.channels,
                      "subtype": info.subtype, "frames": info.frames, "duration_s": round(info.duration, 4)}

synth("e1-silence-1s", np.zeros(44100, dtype=np.int16), "digital silence")
rng = np.random.default_rng(7)
synth("e2-nearsilence-3s", rng.integers(-1, 2, size=44100 * 3).astype(np.int16), "±1 LSB dither")
synth("e3-tiny-20ms", (rng.standard_normal(882) * 3000).astype(np.int16), "882 samples @44.1k → 320 @16k, shorter than one LAM frame (533)")
synth("e4-odd-length", (rng.standard_normal(44100 * 2 + 7) * 8000).astype(np.int16), "non-multiple length: 88207 samples → ceil(88207*16000/44100)")

# 실제 canonical 표본 (다른 시기·다른 기계에서 실제 생성된 것)
import shutil, hashlib
for name, src in [("r1-p3-runpod-cold2", "D:/dd-runpod-evidence/2026-09-11-p3-runpod-paid/cold-2.wav"),
                  ("r2-m2-sentence-10s", "C:/Users/kbs02/Desktop/digital-docent/public/__m2-sentence.wav")]:
    if os.path.exists(src):
        dst = os.path.join(OUT, f"{name}.wav"); shutil.copyfile(src, dst); info = sf.info(dst)
        manifest[name] = {"kind": "real-canonical", "source": src, "sample_rate": info.samplerate, "channels": info.channels,
                          "subtype": info.subtype, "frames": info.frames, "duration_s": round(info.duration, 4),
                          "sha256": hashlib.sha256(open(dst, "rb").read()).hexdigest()}

json.dump(manifest, open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
for k, v in manifest.items():
    print(f"{k:22s} {v['kind']:14s} {v['sample_rate']} Hz ch{v['channels']} {v['subtype']} {v['duration_s']:7.3f} s")
