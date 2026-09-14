/**
 * SEL cap1.6 — M2.13 머리가 동결된 바로 그 캘리브레이션. 단일 구현.
 *
 * 입력은 언제나 네 개의 원시 채널이다. 그 채널이 어디서 오든 상관없다.
 *
 *   LAM-A2E 52채널 출력   jawOpen[24] · mouthPucker[37]
 *                        mean(mouthStretchLeft[45], mouthStretchRight[46])
 *                        mouthShrugUpper[42]
 *   레거시 viseme 라벨    __t005-vowels.json 의 모음별 앵커
 *
 * 두 경로가 같은 곡선을 통과해야 얼굴이 같은 의미로 움직인다. 그래서 곡선은
 * 여기 한 번만 있고, 양쪽이 이것을 부른다.
 *
 * 출처
 *   곡선          public/__m2-opening.html  SEL(0.60, 1.60)
 *   corrective    public/__m2-final-mouth.html  min(jawOpen / 0.40, 1)
 */

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

/** 캘리브레이션이 읽는 원시 채널. 이름은 M2 신호 파일의 것과 같다. */
export interface RawMouthChannels {
  jaw: number;
  round: number;
  stretch: number;
  upperLift: number;
}

/** jawOpen 캡. jawOpenCorrective 파생 규칙의 분모이기도 하다. */
export const JAW_MAX = 0.4;

/** 각 액추에이터의 캘리브레이션 상한 */
export const SEMANTIC_MOUTH_CAP: SemanticMouthPose = Object.freeze({
  jawOpen: JAW_MAX,
  mouthRound: 1.0,
  mouthStretch: 2.0,
  jawOpenCorrective: 1.0,
  mouthShrugUpper: 1.6,
});

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** SEL cap1.6 의 감마 게이트: cap * clamp((x-X0)/(XREF-X0))^gamma */
const gate = (x: number, gamma: number, cap: number, x0: number, xref: number) =>
  cap * Math.pow(clamp01((x - x0) / (xref - x0)), gamma);

/** SEL cap1.6 의 선형 채널: min(x*gain, cap) */
const linear = (x: number, gain: number, cap: number) => Math.min(x * gain, cap);

/** 입을 다문 상태. 발화가 없을 때의 목표값. */
export const REST_POSE: SemanticMouthPose = Object.freeze({
  jawOpen: 0,
  mouthRound: 0,
  mouthStretch: 0,
  jawOpenCorrective: 0,
  mouthShrugUpper: 0,
});

/**
 * 원시 채널 → semantic 액추에이터 가중치.
 *
 * mouthShrugUpper 게이트의 하한 0.15 는 raw 우(.1238)보다 위, raw 오(.1896)보다
 * 아래에 있다. 선택적 개구가 원순 모음에서 빠지는 성질이 여기서 나온다.
 */
export function applySemanticMouthCalibration(raw: RawMouthChannels): SemanticMouthPose {
  const jawOpen = gate(raw.jaw, 0.6, JAW_MAX, 0.00394, 0.27758);
  return {
    jawOpen,
    mouthRound: gate(raw.round, 1.6, 1.0, 0.0111, 0.41678),
    mouthStretch: linear(raw.stretch, 8.3802, 2.0),
    mouthShrugUpper: gate(raw.upperLift, 1.0, 1.6, 0.15, 0.42),
    // 검증된 종속 규칙 — 독립 입력도, 별도 예측값도 아니다
    jawOpenCorrective: Math.min(jawOpen / JAW_MAX, 1),
  };
}

/** 감사/리뷰용 — 곡선의 정의와 그 출처 */
export function calibrationDescriptor() {
  return {
    name: "SEL cap1.6",
    source: "public/__m2-opening.html  SEL(0.60, 1.60)",
    corrective_rule: `jawOpenCorrective = min(jawOpen / ${JAW_MAX}, 1)`,
    corrective_source: "public/__m2-final-mouth.html",
    channels: {
      jaw: "gate(x, gamma 0.60, cap 0.40, X0 0.00394, XREF 0.27758)",
      round: "gate(x, gamma 1.60, cap 1.00, X0 0.01110, XREF 0.41678)",
      stretch: "linear(x, gain 8.3802, cap 2.00)",
      upperLift: "gate(x, gamma 1.00, cap 1.60, X0 0.15, XREF 0.42)",
    },
  };
}
