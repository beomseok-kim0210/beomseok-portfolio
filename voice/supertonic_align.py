"""Same-synthesis jamo alignment for Supertonic 3 (Phase 2E; production since Phase 4D).

Supertonic exposes no alignment: the duration predictor returns one total length per
chunk. The alignment exists only inside vector_estimator, as the text cross-attention
of its main blocks. This module reads it from the very inference that produces the
returned waveform:

  tts.synthesize(...)            unchanged library call, one synthesis
    ├ dp_ort.run            ─── wrapped: records text_ids and the chunk duration
    └ vector_est_ort.run    ─── wrapped: runs an instrumented copy of the SAME graph
                                 (identical weights, extra outputs = the attention
                                 softmaxes) and returns only the latent, as before

Nothing is synthesised twice and nothing about the audio path changes — the wrapper
hands the library exactly the tensor the original session would have returned.

If anything about the capture fails, the wrapper falls back to the original session
for that call and the alignment is simply absent. Audio never fails because of this.

The alignment is reduced here, in the worker, to a 30 fps bilabial gate and a list of
vowel jamo times (orthographic NFKD jamo tokens — not phonemes). Raw attention never leaves
this process.

The instrumented copy is generated from the shipped vector_estimator.onnx by
runpod/instrument_vector_estimator.py: same nodes, same initializers, only the attention
softmax tensors added as graph outputs.
"""
from __future__ import annotations

import math
import unicodedata

import numpy as np

LATENT_SAMPLES = 3072  # base_chunk_size 512 × chunk_compress_factor 6

# Heads chosen on the discovery phrase only (C "바보가 밥을 먹고 배가 부릅니다.", five
# same-synthesis captures, 2026-09-29). Rule: fraction of latent frames whose argmax is a
# Hangul jamo × correlation of that argmax with latent position; top 8. The validation
# phrases were not synthesised when this was frozen.
# (step, main_block, head) — conditional CFG row (batch index 0).
SELECTED_HEADS: tuple[tuple[int, int, int], ...] = (
    (2, 9, 6), (1, 21, 2), (2, 9, 5), (0, 21, 2), (2, 3, 3), (2, 15, 5), (3, 9, 6), (1, 15, 5),
)

# Acoustic calibration offset (seconds): median(acoustic closure − token centroid) over the
# discovery phrase's high-confidence consonant events (n = 57).
OFFSET_S = 0.023263

# Gate shape (Phase 2D condition C, chosen on phrase C, not re-tuned).
GATE_CORE_S = 0.035
GATE_RAMP_S = 0.035
GATE_FPS = 30

# Orthographic bilabial jamo. Orthography, not phonology: 합니다 is written ᆸ and
# said [ㅁ] — still bilabial; ᆲ/ᆵ clusters are not listed (넓다 is said [널따]).
BILABIAL = frozenset("ᄇᄈᄑᄆᆸᇁᆷᆹ")


def _softmax_block(name: str) -> int | None:
    # /vector_estimator/vector_field/main_blocks.9/attn/Softmax_output_0
    if "/attn/" not in name:
        return None
    for part in name.split("/"):
        if part.startswith("main_blocks."):
            return int(part.split(".")[1])
    return None


class _DpRecorder:
    def __init__(self, inner, sink):
        self._inner, self._sink = inner, sink

    def run(self, output_names, feeds, *args, **kwargs):
        out = self._inner.run(output_names, feeds, *args, **kwargs)
        self._sink.begin_chunk(np.array(feeds["text_ids"][0]), float(out[0][0]))
        return out


class _VeCapture:
    """Stands in for the vector_estimator session. Same inputs, same first output."""

    def __init__(self, original, instrumented, sink):
        self._orig, self._inst, self._sink = original, instrumented, sink
        self._names = [o.name for o in instrumented.get_outputs()]
        self._blocks = [_softmax_block(n) for n in self._names]

    def run(self, output_names, feeds, *args, **kwargs):
        if self._sink.failed:
            return self._orig.run(output_names, feeds, *args, **kwargs)
        try:
            res = self._inst.run(None, feeds)
        except Exception as exc:  # capture must never cost the audio
            self._sink.fail(f"instrumented run: {type(exc).__name__}: {exc}")
            return self._orig.run(output_names, feeds, *args, **kwargs)
        step = int(feeds["current_step"][0])
        self._sink.record(step, {b: r for b, r in zip(self._blocks, res) if b is not None})
        return [res[0]]


class AlignmentSink:
    def __init__(self, selected):
        self.selected = selected
        self.reset()

    def reset(self):
        self.chunks: list[dict] = []
        self.failed = False
        self.error: str | None = None

    def fail(self, why):
        self.failed, self.error = True, why

    def begin_chunk(self, text_ids, dur_raw):
        self.chunks.append({"ids": text_ids, "dur_raw": dur_raw, "att": {}})

    def record(self, step, by_block):
        if not self.chunks:
            self.fail("attention before duration")
            return
        c = self.chunks[-1]
        for s, b, h in self.selected:
            if s == step and b in by_block:
                c["att"][(s, b, h)] = np.array(by_block[b][h, 0])  # conditional row


class Aligner:
    """Install once per TTS instance; call synthesize() instead of tts.synthesize()."""

    def __init__(self, tts, instrumented_path, selected=None, offset_s=None):
        import onnxruntime as ort

        self.tts = tts
        self.selected = tuple(selected if selected is not None else SELECTED_HEADS)
        self.offset_s = OFFSET_S if offset_s is None else float(offset_s)
        self.sink = AlignmentSink(self.selected)
        inst = ort.InferenceSession(instrumented_path, providers=["CPUExecutionProvider"])
        m = tts.model
        self._orig_ve, self._orig_dp = m.vector_est_ort, m.dp_ort
        m.vector_est_ort = _VeCapture(self._orig_ve, inst, self.sink)
        m.dp_ort = _DpRecorder(self._orig_dp, self.sink)
        indexer = m.text_processor.indexer
        self._id_to_char = {}
        for code, idx in enumerate(indexer):
            if idx >= 0 and idx not in self._id_to_char:
                self._id_to_char[idx] = chr(code)
        self.sample_rate = int(tts.sample_rate)

    def synthesize(self, text, **kwargs):
        """One synthesis. Returns (wav, dur, alignment|None, error|None)."""
        self.sink.reset()
        wav, dur = self.tts.synthesize(text, **kwargs)
        if self.sink.failed:
            return wav, dur, None, self.sink.error
        try:
            return wav, dur, self._reduce(wav, kwargs.get("speed", 1.05), kwargs.get("silence_duration", 0.3)), None
        except Exception as exc:
            return wav, dur, None, f"reduce: {type(exc).__name__}: {exc}"

    # ---------------------------------------------------------------- reduction
    def _reduce(self, wav, speed, silence_duration):
        sr = self.sample_rate
        lf = LATENT_SAMPLES / sr
        total_samples = int(np.asarray(wav).reshape(-1).shape[0])
        silence = int(silence_duration * sr)
        start = 0
        tokens, times, bil = [], [], []
        for c in self.sink.chunks:
            if len(c["att"]) != len(self.selected) or not self.selected:
                raise ValueError(f"captured {len(c['att'])}/{len(self.selected)} heads")
            A = np.mean([c["att"][k] for k in self.selected], axis=0)  # latent × tokens
            latent_len = A.shape[0]
            col = A / np.maximum(A.sum(0, keepdims=True), 1e-12)
            centroid = (col * np.arange(latent_len)[:, None]).sum(0)
            t_tok = start / sr + (centroid + 0.5) * lf + self.offset_s
            for i, tid in enumerate(c["ids"]):
                ch = self._id_to_char.get(int(tid), "")
                tokens.append(ch)
                times.append(float(t_tok[i]))
            start += latent_len * LATENT_SAMPLES + silence
        bil = bilabial_neighbors(tokens, times)
        if start - silence != total_samples:
            raise ValueError(f"chunk samples {start - silence} != wav samples {total_samples}")
        if not all(math.isfinite(t) for t in times):
            raise ValueError("non-finite token time")
        duration = total_samples / sr
        gate = gate_curve([b["t"] for b in bil], duration)
        return {
            "granularity": "token",
            "frame_duration_ms": round(lf * 1000, 3),
            "offset_ms": round(self.offset_s * 1000, 2),
            "chunks": len(self.sink.chunks),
            "token_count": len(tokens),
            "bilabial": bil,
            "vowels": vowel_tokens(tokens, times),
            "gate_fps": GATE_FPS,
            "bilabial_gate": gate,
        }


def _is_sounding_consonant(ch):
    """JAMO_TOKEN_BOUNDARY 에 참여하는 토큰: 소리 나는 자음 자모만.

    초성 U+1100–U+1112 중 무음 ㅇ(U+110B)을 뺀 것, 종성 U+11A8–U+11C2 전부.
    모음(중성)은 빠진다 — 첫소리 양순음 바로 뒤 토큰은 늘 자기 음절의 모음이라,
    모음을 넣으면 '다음 사건' 이 아니라 같은 음절의 모음이 경계가 된다.
    표기 자모이지 음소가 아니다(G2P 없음).
    """
    o = ord(ch) if ch else 0
    return (0x1100 <= o <= 0x1112 and o != 0x110B) or 0x11A8 <= o <= 0x11C2


def bilabial_neighbors(tokens, times):
    """양순 자모마다 중심 시각과 앞뒤 '소리 나는 자음 자모' 토큰의 중심(없으면 None)."""
    cons = [(i, t, tokens[i] in BILABIAL) for i, t in enumerate(times) if _is_sounding_consonant(tokens[i])]
    out = []
    for k, (i, t, is_bil) in enumerate(cons):
        if not is_bil:
            continue
        prev = cons[k - 1] if k > 0 else None
        nxt = cons[k + 1] if k + 1 < len(cons) else None
        out.append({
            "t": round(float(t), 4),
            "coda": unicodedata.name(tokens[i], "").startswith("HANGUL JONGSEONG"),
            "prev": None if prev is None else round(float(prev[1]), 4),
            "prevBilabial": None if prev is None else bool(prev[2]),
            "next": None if nxt is None else round(float(nxt[1]), 4),
            "nextBilabial": None if nxt is None else bool(nxt[2]),
        })
    return out


# Phase 4A 모음 분류(표기 중성 자모 기준, 음성학적 모음이 아니다).
# spread: 입을 옆으로 — ㅣ ㅡ ㅢ / spreadMid: ㅐ ㅒ ㅔ ㅖ / open: ㅏ ㅑ ㅓ ㅕ(평순)
# round: ㅗ ㅛ ㅜ ㅠ / roundGlide: ㅘ ㅙ ㅚ ㅝ ㅞ ㅟ (원순으로 시작하는 이중모음)
VOWEL_CLASS = {
    **{chr(c): "spread" for c in (0x1175, 0x1173, 0x1174)},
    **{chr(c): "spreadMid" for c in (0x1162, 0x1164, 0x1166, 0x1168)},
    **{chr(c): "open" for c in (0x1161, 0x1163, 0x1165, 0x1167)},
    **{chr(c): "round" for c in (0x1169, 0x116D, 0x116E, 0x1172)},
    **{chr(c): "roundGlide" for c in (0x116A, 0x116B, 0x116C, 0x116F, 0x1170, 0x1171)},
}


def vowel_tokens(tokens, times):
    """모음 자모마다 중심 시각·분류와 바로 앞/뒤 자모 토큰(자음·모음 모두)의 중심. 없으면 None."""
    jamo = [(i, t) for i, t in enumerate(times) if tokens[i] and 0x1100 <= ord(tokens[i]) <= 0x11FF]
    out = []
    for k, (i, t) in enumerate(jamo):
        cls = VOWEL_CLASS.get(tokens[i])
        if cls is None:
            continue
        prev = jamo[k - 1][1] if k > 0 else None
        nxt = jamo[k + 1][1] if k + 1 < len(jamo) else None
        out.append({"t": round(float(t), 4), "cls": cls, "j": tokens[i],
                    "prev": None if prev is None else round(float(prev), 4),
                    "next": None if nxt is None else round(float(nxt), 4)})
    return out


def gate_curve(centers, duration_s, core=GATE_CORE_S, ramp=GATE_RAMP_S, fps=GATE_FPS):
    """Trapezoid per bilabial token, max-combined, sampled at t = i / fps."""
    n = int(math.ceil(duration_s * fps)) + 1
    out = []
    for i in range(n):
        t, g = i / fps, 0.0
        for c in centers:
            d = abs(t - c)
            if d <= core:
                v = 1.0
            elif d < core + ramp:
                x = (d - core) / ramp
                v = 1.0 - x * x * (3 - 2 * x)
            else:
                v = 0.0
            if v > g:
                g = v
        out.append(round(g, 4))
    return out
