import { MathUtils } from "three";

import { LAM_FUSION, fuseLamMouth, type FusedMouthPose, type LamFusionConfig, type LamMouthChannels } from "./lamMouthFusion";

/**
 * 양순음 게이트의 렌더 타이밍 보정 (Phase 3A → 4D 운영값).
 *
 * 입 모양은 λ=18 로 감쇠되어 렌더된다(시상수 약 55 ms). 게이트가 정확한 시각에 1 이
 * 되어도 입술은 그만큼 늦게 닫히고, 늦게 열린다 — 닫힘이 옆 음절로 번진다.
 * 보정 두 가지를 같은 자리에서 비교한다:
 *
 *   · 선행(pre-advance): 게이트만 currentTime + advance 에서 읽는다. LAM·오디오·다른
 *     액추에이터의 시각은 그대로다.
 *   · 닫힘 전용 빠른 응답: 게이트가 만든 보정분(게이트가 있을 때와 게이트 0 일 때의
 *     차이)만 따로 감쇠한다. 닫을 때 closeLambda, 풀 때 releaseLambda. 나머지 입
 *     움직임은 늘 쓰던 λ=18 그대로다.
 *
 * 운영값(MOUTH_TIMING)은 4D 검토에 쓴 값이다: 정렬 채널 30 ms 선행, 닫힘 36, 풀림 18.
 * 두 값 모두 정렬 채널(게이트·모음)이 있을 때만 효과가 있다 — 선행은 정렬 채널에만 걸리고,
 * 닫힘 λ 는 게이트 보정분에만 걸린다. 정렬이 없는 LAM 전용 경로는 λ=18 한 갈래와 같다
 * (감쇠는 선형이라 같은 λ 로 두 갈래를 따로 감쇠시킨 합은 합을 한 번 감쇠시킨 것과 같다).
 */

export const BASE_MOUTH_LAMBDA = 18;

export interface ClosureTimingPolicy {
  /** 게이트를 이만큼 앞의 시각에서 읽는다(초). */
  gateAdvanceSeconds: number;
  /** 게이트 보정분이 커질 때(닫힐 때)의 감쇠. */
  closeLambda: number;
  /** 게이트 보정분이 줄 때(풀릴 때)의 감쇠. */
  releaseLambda: number;
}

export const MOUTH_TIMING: ClosureTimingPolicy = Object.freeze({
  gateAdvanceSeconds: 0.03,
  closeLambda: 36,
  releaseLambda: BASE_MOUTH_LAMBDA,
});

export type MouthActuator = keyof FusedMouthPose;

/** 게이트가 만든 보정분. 게이트가 없는 프레임에는 없다. */
export type GateCorrection = Partial<Record<MouthActuator, number>>;
export type MouthTarget = FusedMouthPose & { gateCorrection?: GateCorrection };

const hasGate = (raw: LamMouthChannels) =>
  typeof raw.bilabialGate === "number" && Number.isFinite(raw.bilabialGate);

/**
 * 융합 목표와, 그중 게이트 몫. 보정분 = fuse(raw) − fuse(raw, gate 0).
 * 게이트 0 인 경로(아랫입술이 LAM 닫힘에 눌리지 않는 경로)가 기준이다.
 */
export function fuseWithGateCorrection(raw: LamMouthChannels, c: LamFusionConfig = LAM_FUSION): MouthTarget {
  const pose = fuseLamMouth(raw, c);
  if (!hasGate(raw) || raw.bilabialGate === 0) return pose;
  const base = fuseLamMouth({ ...raw, bilabialGate: 0 }, c);
  const gateCorrection: GateCorrection = {};
  for (const k of Object.keys(pose) as MouthActuator[]) {
    const d = pose[k] - base[k];
    if (d !== 0) gateCorrection[k] = d;
  }
  return { ...pose, gateCorrection };
}

/** 두 갈래 감쇠 상태. 값뿐이다 — 시각이나 세그먼트를 기억하지 않는다. */
export interface MouthDampState {
  base: Record<string, number>;
  corr: Record<string, number>;
}

export function createMouthDampState(): MouthDampState {
  return { base: {}, corr: {} };
}

/**
 * 한 프레임 감쇠. target 이 null 이면 모두 0 으로 돌아간다(평소 감쇠).
 * 반환값은 렌더할 가중치(0 미만은 0).
 */
export function dampMouth(
  state: MouthDampState,
  names: readonly string[],
  target: { readonly [k: string]: unknown } | null,
  delta: number,
  policy: ClosureTimingPolicy = MOUTH_TIMING,
): Record<string, number> {
  const out: Record<string, number> = {};
  const corrT = (target?.gateCorrection ?? undefined) as Record<string, unknown> | undefined;
  for (const name of names) {
    const total = finite(target?.[name]);
    const ct = finite(corrT?.[name]);
    const b = MathUtils.damp(state.base[name] ?? 0, total - ct, BASE_MOUTH_LAMBDA, delta);
    const c0 = state.corr[name] ?? 0;
    // 보정분은 닫는 쪽(음수, 가중치를 줄인다)이다. 절댓값이 커지면 닫히는 중이다.
    const lambda = Math.abs(ct) > Math.abs(c0) ? policy.closeLambda : policy.releaseLambda;
    const c = Number.isFinite(lambda) ? MathUtils.damp(c0, ct, lambda, delta) : ct;
    state.base[name] = b;
    state.corr[name] = c;
    const v = b + c;
    out[name] = v > 0 ? v : 0;
  }
  return out;
}

const finite = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : 0);
