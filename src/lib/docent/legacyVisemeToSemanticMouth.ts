/**
 * 임시 호환 어댑터 — 레거시 viseme 라벨 → M2.13 semantic 액추에이터.
 *
 * M2.13 머리는 입 모양을 vowel 모프로 갖고 있지 않다. 입은 다섯 개의 의미
 * 액추에이터(jawOpen / mouthRound / mouthStretch / jawOpenCorrective /
 * mouthShrugUpper)가 소유한다. 현행 런타임은 아직 텍스트에서 뽑은 viseme
 * 라벨을 내보내므로, 그 라벨을 액추에이터 가중치로 옮겨 주는 층이 필요하다.
 *
 * 이 어댑터는 최종 구조가 아니다. 최종 런타임은
 *   Supertonic WAV → LAM → semantic 액추에이터
 * 이며, 그때 이 파일은 통째로 사라진다. 여기서 라벨을 쓰는 것은 기존 런타임을
 * 살려 두기 위한 임시 조치일 뿐, 라벨 구동을 정당화하지 않는다.
 *
 * 가중치는 지어내지 않았다. 두 가지 측정 증거만 조합한다.
 *
 *  1) 원시 채널 값 — public/__t005-vowels.json
 *     실제 발화 녹음에서 추출한 모음별 앵커. 각 발화의 최대 입 신호 대비
 *     50% 이상인 프레임들의 평균. 'm'(양순 폐쇄)은 같은 파일의 `closed`
 *     항목으로, 15개 ko-bilabial 발화의 선행 무음 구간 평균이다.
 *
 *  2) 보정 곡선 — SEL cap1.6 (public/__m2-opening.html 의 SEL(0.60, 1.60))
 *     M2.13이 동결된 바로 그 캘리브레이션. mouthShrugUpper 게이트의 하한
 *     0.15가 raw 우(0.1238)보다 위, raw 오(0.1896)보다 아래에 있어서 원순
 *     모음이 선택적 개구에서 빠지는 구조다.
 *
 * jawOpenCorrective는 독립 채널이 아니라 jawOpen에 종속된 파생값이며,
 * public/__m2-final-mouth.html 의 검증된 규칙 min(jawOpen / 0.40, 1)을 그대로
 * 쓴다.
 */
import type { VisemeKey } from "./visemes";

/** M2.13 GLB가 반드시 노출해야 하는 입 액추에이터 이름 */
export const SEMANTIC_MOUTH_MORPHS = [
  "jawOpen",
  "mouthRound",
  "mouthStretch",
  "jawOpenCorrective",
  "mouthShrugUpper",
] as const;

export type SemanticMouthMorph = (typeof SEMANTIC_MOUTH_MORPHS)[number];
export type SemanticMouthPose = Record<SemanticMouthMorph, number>;

/** 폐기된 레거시 입 모프. 새 에셋에 하나라도 있으면 오염이다. */
export const DEPRECATED_LEGACY_MOUTH_MORPHS = [
  "viseme_a",
  "viseme_i",
  "viseme_u",
  "viseme_e",
  "viseme_o",
  "viseme_m",
] as const;

/** 측정 원시 채널 값. 출처: public/__t005-vowels.json (provenance: measured) */
const RAW_ANCHORS: Record<
  VisemeKey,
  { jaw: number; round: number; stretch: number; upperLift: number; source: string }
> = {
  a: { jaw: 0.075608, round: 0.14595372, stretch: 0.07555307, upperLift: 0.46378078, source: "t005-vowels.a" },
  i: { jaw: 0.053575, round: 0.06440548, stretch: 0.06183818, upperLift: 0.38106397, source: "t005-vowels.i" },
  u: { jaw: 0.01108227, round: 0.20036241, stretch: 0.0188772, upperLift: 0.12384698, source: "t005-vowels.u" },
  e: { jaw: 0.08333715, round: 0.07288839, stretch: 0.10662551, upperLift: 0.4108467, source: "t005-vowels.e" },
  o: { jaw: 0.02605565, round: 0.32597555, stretch: 0.03170929, upperLift: 0.18955322, source: "t005-vowels.o" },
  m: { jaw: 0.00244781, round: 0.00359906, stretch: 0.00226035, upperLift: 0.00517274, source: "t005-vowels.closed" },
};

/**
 * 'm' 에 `closed` 를 쓰는 이유. 같은 파일에는 `ma_closed`(11 프레임)도 있다.
 * `closed` 는 15개 ko-bilabial 발화 각각에서 최대 입 신호의 20% 미만인 선행
 * 프레임들의 평균이다 — 양순 파열음 앞의 폐쇄 구간이 정확히 거기다. 표본이
 * 15발화로 더 넓어서 이쪽을 택했다.
 *
 * 두 창의 차이는 무시할 수준이다. `ma_closed` 로 바꾸면 mouthStretch 가
 * 0.018942 대신 0.014810 이 되고(캡 2.00 대비 0.21%), 나머지 네 채널은 SEL 게이트
 * 하한 아래라 어느 쪽이든 정확히 0이다. 어느 창을 고르든 입은 닫힌다.
 */

/** jawOpen 캡. jawOpenCorrective 파생 규칙의 분모이기도 하다. */
const JAW_MAX = 0.4;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** SEL cap1.6 의 감마 게이트: cap * clamp((x-X0)/(XREF-X0))^gamma */
const gate = (x: number, gamma: number, cap: number, x0: number, xref: number) =>
  cap * Math.pow(clamp01((x - x0) / (xref - x0)), gamma);

/** SEL cap1.6 의 선형 채널: min(x*gain, cap) */
const linear = (x: number, gain: number, cap: number) => Math.min(x * gain, cap);

function selCap16(raw: (typeof RAW_ANCHORS)[VisemeKey]): SemanticMouthPose {
  const jawOpen = gate(raw.jaw, 0.6, JAW_MAX, 0.00394, 0.27758);
  return {
    jawOpen,
    mouthRound: gate(raw.round, 1.6, 1.0, 0.0111, 0.41678),
    mouthStretch: linear(raw.stretch, 8.3802, 2.0),
    mouthShrugUpper: gate(raw.upperLift, 1.0, 1.6, 0.15, 0.42),
    // 검증된 종속 규칙 — 독립 입력이 아니다
    jawOpenCorrective: Math.min(jawOpen / JAW_MAX, 1),
  };
}

/** 입을 다문 상태. viseme 이 null 일 때의 목표값. */
export const REST_POSE: SemanticMouthPose = Object.freeze({
  jawOpen: 0,
  mouthRound: 0,
  mouthStretch: 0,
  jawOpenCorrective: 0,
  mouthShrugUpper: 0,
});

const TABLE: Record<VisemeKey, SemanticMouthPose> = Object.freeze({
  a: Object.freeze(selCap16(RAW_ANCHORS.a)),
  i: Object.freeze(selCap16(RAW_ANCHORS.i)),
  u: Object.freeze(selCap16(RAW_ANCHORS.u)),
  e: Object.freeze(selCap16(RAW_ANCHORS.e)),
  o: Object.freeze(selCap16(RAW_ANCHORS.o)),
  m: Object.freeze(selCap16(RAW_ANCHORS.m)),
}) as Record<VisemeKey, SemanticMouthPose>;

/** viseme 라벨(또는 무음)에 대응하는 semantic 액추에이터 목표 자세 */
export function semanticMouthPose(viseme: VisemeKey | null): SemanticMouthPose {
  return viseme ? TABLE[viseme] : REST_POSE;
}

/** 감사/리뷰용 — 파생된 표 전체와 그 출처 */
export function adapterTable() {
  return {
    calibration: "SEL cap1.6",
    calibration_source: "public/__m2-opening.html  SEL(0.60, 1.60)",
    raw_source: "public/__t005-vowels.json",
    corrective_rule: "jawOpenCorrective = min(jawOpen / 0.40, 1)",
    corrective_source: "public/__m2-final-mouth.html",
    rows: (Object.keys(TABLE) as VisemeKey[]).map((k) => ({
      viseme: k,
      raw_source: RAW_ANCHORS[k].source,
      provenance: "measured",
      ...TABLE[k],
    })),
  };
}
