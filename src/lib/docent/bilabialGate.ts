/**
 * 같은 합성의 양순음 게이트를 LAM 타임라인에 싣는다 (Phase 2E → 4D 운영).
 *
 * Supertonic 워커가 파형을 만든 바로 그 추론의 text cross-attention 에서 자모 시각을
 * 읽어, 30 fps 게이트(0~1)로 줄여 보낸다. 여기서는 그 값을 LAM 프레임에 인덱스로
 * 붙이기만 한다 — 둘 다 같은 WAV 의 0 초에서 시작하는 30 fps 격자다.
 *
 * 게이트는 세그먼트 페이로드 안의 프레임에만 산다. 따로 쥐고 있는 상태가 없으므로
 * 세그먼트 사이로 새지 않고, 발화를 취소하거나 마이크가 끼어들면 타임라인과 함께
 * 버려진다.
 *
 * 게이트 모양은 워커(voice/supertonic_align.gate_curve)가 정한다: 양순 자모 중심 ±35 ms 는 1,
 * 그 밖 35 ms 는 smoothstep 으로 내려간다.
 *
 * 게이트가 없거나 모양이 이상하면 붙이지 않는다. 그러면 융합은 게이트 이전과 똑같이
 * 동작한다(음성은 실패하지 않는다).
 */

/** 게이트가 LAM 보다 이만큼 짧은 것까지는 허용한다(끝부분은 0 으로 본다). */
const MAX_SHORTFALL_FRAMES = 2;

export type GateAttachResult<F> =
  | { attached: true; frames: (F & { bilabialGate: number })[] }
  | { attached: false; frames: F[]; reason: string };

export function attachBilabialGate<F extends object>(
  frames: F[],
  gate: unknown,
  gateFps: unknown,
  timelineFps: number,
): GateAttachResult<F> {
  const reject = (reason: string): GateAttachResult<F> => ({ attached: false, frames, reason });
  if (gate === undefined || gate === null) return reject("absent");
  if (!Array.isArray(gate) || gate.length === 0) return reject("not a non-empty array");
  if (gateFps !== timelineFps) return reject(`fps ${String(gateFps)} != ${timelineFps}`);
  for (const v of gate) {
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1) return reject("value outside [0, 1]");
  }
  if (gate.length + MAX_SHORTFALL_FRAMES < frames.length) {
    return reject(`gate ${gate.length} frames for a ${frames.length}-frame timeline`);
  }
  const values = gate as number[];
  return {
    attached: true,
    frames: frames.map((f, i) => ({ ...f, bilabialGate: i < values.length ? values[i] : 0 })),
  };
}
