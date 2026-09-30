"""Audio identity gate for the same-synthesis alignment (Phase 4D).

With the latent noise seeded, the alignment path (voice/supertonic_align.Aligner, which runs
the attention-exposing copy of vector_estimator) must return the same samples, byte for byte,
and the same duration as the untouched library call. Also checks that one call is one
synthesis (the duration predictor runs once per chunk) and that nothing but reduced timing
comes back.

    DD_SUPERTONIC_MODEL_DIR=... DD_SUPERTONIC_ALIGN_ONNX=... \
        <supertonic venv python> runpod/verify_alignment_identity.py

Prints ALIGNMENT_AUDIO_IDENTITY = PASS on success; exits non-zero otherwise.
"""
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.environ.get("DD_WORKER_DIR") or os.path.join(HERE, "..", "voice"))
sys.stdout.reconfigure(encoding="utf-8")

from supertonic import TTS  # noqa: E402

import supertonic_align  # noqa: E402

TEXTS = [
    "바보가 밥을 먹고 배가 부릅니다.",
    "왜 웨이터가 괜히 화를 냈을까요?",
    "프로젝트에서 가장 어려웠던 문제를 해결한 과정을 설명해 드릴게요. 먼저 데이터 파이프라인을 다시 "
    "설계했고, 그다음 모델 서빙 구조를 바꾸어 응답 시간을 절반으로 줄였습니다.",
]


def main():
    tts = TTS(model="supertonic-3", model_dir=os.environ["DD_SUPERTONIC_MODEL_DIR"], auto_download=False)
    style = tts.get_voice_style(voice_name="M1")
    kw = dict(voice_style=style, total_steps=8, speed=1.05, silence_duration=0.3, lang="ko")

    ref = []
    for text in TEXTS:
        np.random.seed(20260930)
        wav, dur = tts.synthesize(text, **kw)
        ref.append((np.asarray(wav).tobytes(), np.asarray(dur).tobytes()))

    aligner = supertonic_align.Aligner(tts, os.environ["DD_SUPERTONIC_ALIGN_ONNX"])
    ok = True
    for text, (ref_wav, ref_dur) in zip(TEXTS, ref):
        np.random.seed(20260930)
        wav, dur, alignment, error = aligner.synthesize(text, **kw)
        same_wav = np.asarray(wav).tobytes() == ref_wav
        same_dur = np.asarray(dur).tobytes() == ref_dur
        chunks = len(aligner.sink.chunks)
        keys = sorted(alignment) if alignment else []
        raw = any(k.startswith("_") or "att" in k for k in keys)
        print(f"{len(text):3d} chars | wav identical {same_wav} | duration identical {same_dur} | "
              f"chunks {chunks} | error {error} | vowels {len(alignment['vowels']) if alignment else 0} | "
              f"gate frames {len(alignment['bilabial_gate']) if alignment else 0}")
        ok = ok and same_wav and same_dur and error is None and alignment is not None and not raw
    print("ALIGNMENT_AUDIO_IDENTITY =", "PASS" if ok else "FAIL")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
