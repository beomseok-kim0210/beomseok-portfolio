/**
 * 폴백 어댑터 — 레거시 viseme 라벨 → M2.13 semantic 액추에이터.
 *
 * 주 경로가 아니다. 주 경로는 Supertonic 이 만든 실제 파형을 LAM-A2E 가 읽어
 * 프레임별 원시 채널을 내놓는 쪽이고(`useSupertonicVoice`), 이 파일은 그 경로가
 * 없을 때를 위한 브라우저 TTS 폴백이다.
 *
 * 두 경로는 같은 곡선을 통과한다 — `applySemanticMouthCalibration`. 다른 것은
 * 원시 채널이 어디서 오느냐뿐이다.
 *
 *   주 경로    LAM-A2E 가 실제 파형에서 프레임마다 측정한 값
 *   이 파일    __t005-vowels.json 의 모음별 앵커 (녹음에서 추출한 고정값)
 *
 * 라벨 구동은 정당화되지 않는다. 기존 런타임을 살려 두기 위한 다리일 뿐이다.
 */
import {
  REST_POSE,
  SEMANTIC_MOUTH_MORPHS,
  applySemanticMouthCalibration,
  type RawMouthChannels,
  type SemanticMouthMorph,
  type SemanticMouthPose,
} from "./semanticMouth";
import type { VisemeKey } from "./visemes";

export { REST_POSE, SEMANTIC_MOUTH_MORPHS };
export type { SemanticMouthMorph, SemanticMouthPose };

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
const RAW_ANCHORS: Record<VisemeKey, RawMouthChannels & { source: string }> = {
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
const TABLE: Record<VisemeKey, SemanticMouthPose> = Object.freeze({
  a: Object.freeze(applySemanticMouthCalibration(RAW_ANCHORS.a)),
  i: Object.freeze(applySemanticMouthCalibration(RAW_ANCHORS.i)),
  u: Object.freeze(applySemanticMouthCalibration(RAW_ANCHORS.u)),
  e: Object.freeze(applySemanticMouthCalibration(RAW_ANCHORS.e)),
  o: Object.freeze(applySemanticMouthCalibration(RAW_ANCHORS.o)),
  m: Object.freeze(applySemanticMouthCalibration(RAW_ANCHORS.m)),
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
    role: "fallback only — the primary driver is LAM-A2E on the Supertonic waveform",
    rows: (Object.keys(TABLE) as VisemeKey[]).map((k) => ({
      viseme: k,
      raw_source: RAW_ANCHORS[k].source,
      provenance: "measured",
      ...TABLE[k],
    })),
  };
}
