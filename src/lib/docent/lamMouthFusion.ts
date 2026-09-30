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
  /** mouthLowerDownLeft[33] (Phase 2C). LAM 은 좌우를 대칭화하므로 실제로는 오른쪽과 같다. */
  lowerDownLeft?: number;
  /** mouthLowerDownRight[34] (Phase 2C) */
  lowerDownRight?: number;
  /**
   * 양순음 게이트 0~1 (Phase 2D, 실험). LAM 이 아니라 TTS 의 텍스트 정렬(Supertonic 의
   * text cross-attention 에서 읽은 자모 시각)에서 온다. ㅂ·ㅃ·ㅍ·ㅁ 이 소리 나는 동안 1.
   *
   * LAM 의 mouthLowerDown 은 양순음에서도 높아서, LAM 만으로는 "여기서 입술을 붙여야
   * 하는가" 를 가를 수 없었다(Phase 2B·2C). 게이트가 있으면 아랫입술 억제는 LAM 닫힘
   * 대신 게이트가 맡는다 — 양순음이 아닌 곳에서 아랫입술이 열린다. 없으면 이전과 같다.
   */
  bilabialGate?: number;
  /**
   * 모음 모양 보조층 (Phase 4A, 실험) — 같은 합성의 모음 자모 시각에서 온 0~1 채널
   * (vowelShape.buildVowelChannels). 없으면 이전과 똑같다.
   *   vowelSpread : 가로 벌림 목표(ㅣ ㅡ ㅢ, ㅐ ㅔ …)
   *   vowelRound  : 원순 목표(ㅗ ㅜ …)
   *   vowelUnround: 평순 모음 구간 — LAM 의 오므림을 누른다
   */
  vowelSpread?: number;
  vowelRound?: number;
  vowelUnround?: number;
  /** 모음별 턱 열림 목표 0~1 (Phase 4C, ㅏ = 1) */
  vowelOpen?: number;
}

/**
 * 아랫입술 독립 액추에이터 (Phase 2C).
 *
 * 운영 GLB(M2.13 runtime-compat)에는 이 모프가 없다. 런타임은 모프가 있는 자산에서만 구동한다 — 없는 자산에서는 이 값이 버려질 뿐 다른 다섯
 * 액추에이터는 그대로다.
 */
export const LOWER_LIP_MORPHS = ["mouthLowerDownLeft", "mouthLowerDownRight"] as const;
export type LowerLipMorph = (typeof LOWER_LIP_MORPHS)[number];
export type FusedMouthPose = SemanticMouthPose & Record<LowerLipMorph, number>;

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

  /** 아랫입술 내림: norm(mouthLowerDown; X0, Xref)^γ, 상한 1. 값은 Phase 2C 스윕에서 정한다. */
  lowerDownX0: 0.2,
  lowerDownXref: 0.65,
  lowerDownGamma: 1.0,
  lowerDownMax: 1.0,
  /** 닫힘이 아랫입술 내림을 얼마나 누르는가. 1 이면 턱과 같이 닫힌다. */
  lowerDownClosureSuppression: 1.0,
  /**
   * 닫힘 비율의 분모에 아랫입술 내림을 얼마나 더하는가(0 = Phase 2 와 같다).
   * 입술 틈은 턱과 아랫입술 둘이 만든다 — 상쇄 신호가 그 둘을 다 덮어야 닫힌 것이다.
   */
  closureLowerDownWeight: 0,

  /**
   * 양순음 게이트(Phase 2D). 게이트가 1 이면 아랫입술 내림을 이만큼 누른다.
   * 게이트가 있는 프레임에서는 LAM 닫힘이 아랫입술을 누르지 않는다(lowerDownClosureSuppression 무시).
   */
  gateLowerDownSuppression: 1.0,
  /** 게이트가 닫힘에 더하는 양. 턱·윗입술·옆으로 벌림 억제도 같이 따라온다. 문장 C 에서만 골랐다. */
  gateClosureBoost: 0.5,

  /**
   * 모음 모양 보조층(Phase 4A). 가로 벌림 = max(LAM, vowelStretchTarget × vowelSpread),
   * 원순 = max(LAM × (1 − vowelUnroundSuppression × vowelUnround), vowelRoundTarget × vowelRound).
   * 채널이 없으면 쓰이지 않는다. 값은 발견 코퍼스에서만 골랐다(보고서 Phase 4A).
   */
  vowelStretchTarget: 2.4,
  vowelRoundTarget: 0.5,
  vowelUnroundSuppression: 1.0,
  /**
   * 모음 구간에서 LAM 닫힘을 이만큼 푼다(1 = 모음 한가운데서는 LAM 닫힘 없음). ㅣ/ㅡ 처럼 턱이 거의 0 인
   * 모음에서 닫힘 비율이 치솟아 모음 중에 입이 다물리던 것(2026-09-30 실측, 중앙값 1.0)을 막는다.
   * 양순음 게이트가 켜진 곳에서는 풀지 않고, 게이트의 닫힘 보강은 이 뒤에 더해진다.
   */
  vowelClosureRelease: 0.5,
  /**
   * 모음별 열림(Phase 4C): 턱 = max(LAM 턱, JAW_MAX × vowelOpenScale × vowelOpen), 그 뒤 닫힘 억제.
   * LAM 턱만으로는 ㅏ 가 JAW_MAX 의 20% 에 머물렀다. 값은 발견 코퍼스에서만 고른다.
   * Phase 4D: 1.0 은 사람 검토에서 "살짝 많이", 4A 는 "살짝 덜" — 둘의 중간(발견 OPEN 0.136)에 가장 가까운 0.75.
   */
  vowelOpenScale: 0.75,
  /**
   * 모음별 열림이 있을 때(vowelOpen 채널)의 게이트 닫힘 보강. 턱이 커진 만큼 ㅂ/ㅁ 에서 끝까지 닫아야 한다
   * (Phase 4C 발견: 0.5 로는 양순음 재현율이 31 → 23~28). 채널이 없으면 gateClosureBoost 를 쓴다.
   */
  vowelOpenGateBoost: 1.0,
});

/** 융합 설정의 형태. 실험·테스트가 다른 값을 넣을 수 있게 숫자로 넓힌다. */
export type LamFusionConfig = { readonly [K in keyof typeof LAM_FUSION]: number };

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const finite = (x: number | undefined) => (typeof x === "number" && Number.isFinite(x) ? x : 0);
const norm = (x: number, x0: number, xref: number) => clamp01((x - x0) / (xref - x0));
const smoothstep = (x: number) => x * x * (3 - 2 * x);

/** 0(열림) ~ 1(입술이 붙음). jawOpen 을 입술 채널들이 얼마나 상쇄하는가. */
export function lamClosure(raw: LamMouthChannels, c: LamFusionConfig = LAM_FUSION): number {
  const lower = Math.max(finite(raw.lowerDownLeft), finite(raw.lowerDownRight), 0);
  const jaw = Math.max(finite(raw.jaw), 0) + c.closureLowerDownWeight * lower;
  const cancel = c.closeWeight * Math.max(finite(raw.close), 0)
    + c.pressWeight * Math.max(finite(raw.press), 0)
    + c.rollWeight * Math.max(finite(raw.roll), 0);
  if (cancel <= 0) return 0;
  const ratio = cancel / Math.max(jaw, c.jawEpsilon);
  return smoothstep(norm(ratio, c.ratioStart, c.ratioFull))
    * smoothstep(norm(cancel, c.cancelStart, c.cancelFull));
}

/** pucker 와 funnel 을 각자 정규화한 뒤 합친 원순 정도(0~1, 곡선 적용 전). */
export function lamRoundness(raw: LamMouthChannels, c: LamFusionConfig = LAM_FUSION): number {
  const p = norm(finite(raw.round), c.roundPuckerX0, c.roundPuckerXref);
  const f = c.roundFunnelWeight * norm(finite(raw.funnel), c.roundFunnelX0, c.roundFunnelXref);
  return clamp01(Math.max(p, f) + c.roundBlend * Math.min(p, f));
}

/** 한쪽 아랫입술 내림 가중치. gate 가 null 이면(게이트 없는 타임라인) Phase 2C 와 같다. */
function lowerDown(x: number | undefined, closure: number, gate: number | null, c: LamFusionConfig): number {
  const base = c.lowerDownMax * Math.pow(norm(finite(x), c.lowerDownX0, c.lowerDownXref), c.lowerDownGamma);
  if (gate === null) return base * (1 - closure * c.lowerDownClosureSuppression);
  return base * (1 - gate * c.gateLowerDownSuppression);
}

export function fuseLamMouth(raw: LamMouthChannels, c: LamFusionConfig = LAM_FUSION): FusedMouthPose {
  const gate = typeof raw.bilabialGate === "number" && Number.isFinite(raw.bilabialGate)
    ? clamp01(raw.bilabialGate)
    : null;
  const vowelPresence = Math.max(clamp01(finite(raw.vowelUnround)), clamp01(finite(raw.vowelRound)));
  // 양순음 게이트가 켜진 곳에서는 풀지 않는다 — 모음 지지가 옆 ㅂ/ㅁ 순간까지 닿기 때문이다.
  const gateNow = gate === null ? 0 : gate;
  const lamOnly = lamClosure(raw, c) * (1 - c.vowelClosureRelease * vowelPresence * (1 - gateNow));
  const boost = typeof raw.vowelOpen === "number" && Number.isFinite(raw.vowelOpen) ? c.vowelOpenGateBoost : c.gateClosureBoost;
  const closure = gate === null ? lamOnly : Math.min(1, lamOnly + gate * boost);
  const baseJaw = JAW_MAX * Math.pow(norm(finite(raw.jaw), c.jawX0, c.jawXref), c.jawGamma);
  const vowelJaw = JAW_MAX * c.vowelOpenScale * clamp01(finite(raw.vowelOpen));
  const jawOpen = Math.max(baseJaw, vowelJaw) * (1 - closure * c.jawClosureSuppression);

  const baseUpper = SEMANTIC_MOUTH_CAP.mouthShrugUpper
    * Math.pow(norm(finite(raw.upperLift), c.upperX0, c.upperXref), c.upperGamma);
  const lamStretch = Math.min(Math.max(finite(raw.stretch), 0) * c.stretchGain, SEMANTIC_MOUTH_CAP.mouthStretch);
  const vSpread = clamp01(finite(raw.vowelSpread)), vRound = clamp01(finite(raw.vowelRound)), vUnround = clamp01(finite(raw.vowelUnround));
  const baseStretch = Math.max(lamStretch, c.vowelStretchTarget * vSpread);
  const lamRound = SEMANTIC_MOUTH_CAP.mouthRound * Math.pow(lamRoundness(raw, c), c.roundGamma);
  const round = Math.max(lamRound * (1 - c.vowelUnroundSuppression * vUnround), c.vowelRoundTarget * vRound);

  return {
    jawOpen,
    mouthRound: round,
    mouthStretch: baseStretch * (1 - closure * c.stretchClosureSuppression),
    mouthShrugUpper: baseUpper * (1 - closure * c.upperClosureSuppression),
    // 억제된 턱을 따른다. 억제 전 값을 쓰면 턱은 닫혔는데 보정 형상은 열린 채로 남는다.
    jawOpenCorrective: Math.min(jawOpen / JAW_MAX, 1),
    mouthLowerDownLeft: lowerDown(raw.lowerDownLeft, closure, gate, c),
    mouthLowerDownRight: lowerDown(raw.lowerDownRight, closure, gate, c),
  };
}
