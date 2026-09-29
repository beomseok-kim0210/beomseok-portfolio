import {
  JAW_MAX,
  SEMANTIC_MOUTH_CAP,
  type RawMouthChannels,
  type SemanticMouthPose,
} from "./semanticMouth";

/**
 * LAM-A2E 52채널 → 기존 5개 입 액추에이터. 의미 단위 압축(semantic fusion).
 *
 * GLB 에는 ARKit 52개에 대응하는 모프가 없다. 그래서 1:1 로 옮기지 않고, 여러 LAM
 * 채널을 모아 기존 액추에이터(jaw · round · stretch · upperLift · corrective)의 입력을
 * 풍부하게 만든다. Phase 1 까지 버려지던 채널 중 넷(입 다물기·입술 누르기·말아 넣기·
 * 깔때기)이 여기서 쓰인다.
 *
 *   closure   = (mouthClose + mouthPress + mouthRoll) 이 jawOpen 을 얼마나 상쇄하는가
 *   jaw       = gate(jawOpen) × (1 − closure × 0.95)
 *   corrective= effective jaw 에서 파생 (억제 전 값이 아니다)
 *   upperLift = gate(mouthShrugUpper, 넓힌 기준) × (1 − closure × 0.9)
 *   stretch   = linear(mouthStretch) × (1 − closure × 0.7)
 *   round     = max(pucker, funnel) + 약한 합 — 둘 다 먼저 정규화한 뒤
 *
 * closure 를 비율로 정의한 이유. ARKit 에서 mouthClose 는 "턱이 열린 채로 입술을 붙이는"
 * 채널이다 — 입술 틈은 대략 jawOpen − mouthClose 다. 실측(2026-09-29, 문장 A–E):
 *   문장 C 의 양순음 창      close/jaw ≈ 2~4   (입술이 붙어야 한다)
 *   문장 A 의 열린 모음      close/jaw ≈ 0.04  (영향이 없어야 한다)
 *   문장 B 의 "오"          close/jaw ≈ 0.9   (입술이 좁아진다 — 원순)
 * mouthClose 의 절댓값만 보면 B 의 원순 모음(0.24)이 C 의 양순음(0.07~0.17)보다 커서
 * 모음이 다물린다. 비율은 그 둘을 가른다.
 *
 * 곡선과 상수의 출처는 문장 A–E 의 실측 분포다. 근거와 스윕 결과는 Phase 2 보고서에 있다.
 * 순수 함수이고 프레임마다 스칼라 연산뿐이다 — 배열을 만들지 않는다.
 */

/** Phase 2 에서 워커가 더 내보내는 원시 채널. 없으면(구버전 워커) 0 으로 본다. */
export interface LamMouthChannels extends RawMouthChannels {
  /** mouthClose[26] */
  close?: number;
  /** mean(mouthPressLeft[35], mouthPressRight[36]) */
  press?: number;
  /** mean(mouthRollLower[39], mouthRollUpper[40]) */
  roll?: number;
  /** mouthFunnel[31] */
  funnel?: number;
}

export const LAM_FUSION = Object.freeze({
  /**
   * jaw 게이트 γ. 0.6 은 작은 값을 부풀려(원시 0.02 → 상한의 18%) 음절 사이에 턱이 닫히지
   * 않았다. 스윕(0.6·0.75·0.9·1.0): 양순음 봉합 80% 이상을 만족하는 값 중 짧고 작은
   * 발화(문장 E)의 열림을 가장 많이 남기는 0.75. 0.9·1.0 은 E 의 턱 최대가 기준선의
   * 57~65% 로 줄었다.
   */
  jawGamma: 0.75,
  jawX0: 0.00394,
  jawXref: 0.27758,

  /** closure 원시 합의 가중치 (jaw 단위). press 는 양순 비음·파열음에서 close 를 대신한다. */
  closeWeight: 1.0,
  pressWeight: 1.0,
  rollWeight: 1.0,
  /** 비율 항: smoothstep(ratio; ratioStart, ratioFull). 비율이 이 아래면 0 — 모음을 다물지 않는다. */
  ratioStart: 0.5,
  ratioFull: 1.25,
  /**
   * 절대량 항: smoothstep(cancel; cancelStart, cancelFull). 턱도 입술 채널도 아주 작은 구간
   * (짧고 작은 발화, 모음 사이 잡음)에서 비율만 커져 모음이 다물리는 것을 막는다.
   * 실측: 양순음 창의 cancel 0.11~0.23, 열린 모음 ~0.02.
   */
  cancelStart: 0.05,
  cancelFull: 0.1,
  /** jawOpen 이 이만큼 작으면 비율이 의미를 잃는다(0 으로 나누기). */
  jawEpsilon: 0.01,

  jawClosureSuppression: 0.95,
  upperClosureSuppression: 0.9,
  stretchClosureSuppression: 0.7,

  /**
   * mouthShrugUpper: 기준 0.42 는 발화의 대부분에서 상한을 쳤다(문장 D 59.8%). 원시 값의
   * 발화 p95 가 0.67~0.84 라 기준을 넓힌다. 0.65 에서 상한 도달 프레임 0~6.8%,
   * 평균 크기는 상한의 20~30% 로 남는다(0.85 는 0% 로 과했다).
   */
  upperX0: 0.15,
  upperXref: 0.65,
  upperGamma: 1.0,

  stretchGain: 8.3802,

  /**
   * 원순이 아닌 모음에도 pucker 가 0.05~0.12 깔려 있다(발화 p50). 바닥을 올려 그 잔여를
   * 지운다 — 문장 B 원순/비원순 대비 2.37 → 2.95, 원순 모음의 값은 그대로(0.55 → 0.56).
   */
  roundPuckerX0: 0.08,
  roundPuckerXref: 0.41678,
  roundFunnelX0: 0.005,
  roundFunnelXref: 0.08,
  roundFunnelWeight: 0.8,
  /** 둘 중 작은 쪽을 얼마나 더할지. 합을 그대로 쓰면 상한을 쉽게 친다. */
  roundBlend: 0.25,
  roundGamma: 1.6,
});

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const finite = (x: number | undefined) => (typeof x === "number" && Number.isFinite(x) ? x : 0);
const norm = (x: number, x0: number, xref: number) => clamp01((x - x0) / (xref - x0));
const smoothstep = (x: number) => x * x * (3 - 2 * x);

/** 0(열림) ~ 1(입술이 붙음). jawOpen 을 입술 채널들이 얼마나 상쇄하는가. */
export function lamClosure(raw: LamMouthChannels, c = LAM_FUSION): number {
  const jaw = Math.max(finite(raw.jaw), 0);
  const cancel = c.closeWeight * Math.max(finite(raw.close), 0)
    + c.pressWeight * Math.max(finite(raw.press), 0)
    + c.rollWeight * Math.max(finite(raw.roll), 0);
  if (cancel <= 0) return 0;
  const ratio = cancel / Math.max(jaw, c.jawEpsilon);
  return smoothstep(norm(ratio, c.ratioStart, c.ratioFull))
    * smoothstep(norm(cancel, c.cancelStart, c.cancelFull));
}

/** pucker 와 funnel 을 각자 정규화한 뒤 합친 원순 정도(0~1, 곡선 적용 전). */
export function lamRoundness(raw: LamMouthChannels, c = LAM_FUSION): number {
  const p = norm(finite(raw.round), c.roundPuckerX0, c.roundPuckerXref);
  const f = c.roundFunnelWeight * norm(finite(raw.funnel), c.roundFunnelX0, c.roundFunnelXref);
  return clamp01(Math.max(p, f) + c.roundBlend * Math.min(p, f));
}

export function fuseLamMouth(raw: LamMouthChannels, c = LAM_FUSION): SemanticMouthPose {
  const closure = lamClosure(raw, c);
  const baseJaw = JAW_MAX * Math.pow(norm(finite(raw.jaw), c.jawX0, c.jawXref), c.jawGamma);
  const jawOpen = baseJaw * (1 - closure * c.jawClosureSuppression);

  const baseUpper = SEMANTIC_MOUTH_CAP.mouthShrugUpper
    * Math.pow(norm(finite(raw.upperLift), c.upperX0, c.upperXref), c.upperGamma);
  const baseStretch = Math.min(Math.max(finite(raw.stretch), 0) * c.stretchGain, SEMANTIC_MOUTH_CAP.mouthStretch);

  return {
    jawOpen,
    mouthRound: SEMANTIC_MOUTH_CAP.mouthRound * Math.pow(lamRoundness(raw, c), c.roundGamma),
    mouthStretch: baseStretch * (1 - closure * c.stretchClosureSuppression),
    mouthShrugUpper: baseUpper * (1 - closure * c.upperClosureSuppression),
    // 억제된 턱을 따른다. 억제 전 값을 쓰면 턱은 닫혔는데 보정 형상은 열린 채로 남는다.
    jawOpenCorrective: Math.min(jawOpen / JAW_MAX, 1),
  };
}
