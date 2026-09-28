import type { DocentRequestStatus } from "../docentStatus";
import type { VoiceLifecycle } from "../voiceLifecycle";
import { DOCENT_RENDERED_SILHOUETTE } from "../avatarFraming";

/**
 * 홀로그램 챔버의 단일 진실 공급원. 색·치수·상태별 강도가 컴포넌트마다 흩어지면
 * 한 곳을 고쳐도 나머지가 따라오지 않는다.
 *
 * 치수는 전부 아바타 모델 공간(월드 단위)이다. 카메라는 avatarFraming 이 측정한
 * 실루엣으로 맞추므로 세로 가시 범위는 약 y ∈ [-0.150, 0.216] 로 고정이다.
 * 받침은 이 범위의 하단 16% 안에 들어가야 한다.
 */
export const HOLOGRAM_PALETTE = {
  /** 챔버 바닥·배경. CSS 배경과 같은 계열. */
  deep: "#050b17",
  /** 주 투사광. 부드러운 시안-블루. */
  primary: "#4fc3f7",
  /** 보조 — 차가운 흰빛. 가장 밝은 코어에만. */
  secondary: "#d6ecff",
  /** 받침 금속. 중립에 가까운 짙은 남색 — 빛이 아니라 덩어리로 읽혀야 한다. */
  housing: "#101a28",
  /** 윗모서리 립 — 하우징보다 한 톤 밝아 키 라이트에 모서리가 선다. */
  lip: "#243142",
  plate: "#0b121d",
  /** 이미터 우물 — 가장 어둡다. 코어가 그늘 속에 앉는다. */
  well: "#03060c",
  /** 실패 상태 강조 — 전체를 붉게 바꾸지 않고 액센트만 호박색. */
  amber: "#fbbf24",
} as const;

const NECK_END_Y = DOCENT_RENDERED_SILHOUETTE.minY;

export const HOLOGRAM_GEOMETRY = {
  /**
   * 받침 윗면. Pass 1 실측에서 받침 뒤 테두리가 목 끝과 같은 행에 걸려 목이 받침에
   * "얹힌" 흉상으로 읽혔다. 원근 때문에 넓은 받침의 뒤 테두리는 화면에서 수평선 쪽으로
   * 올라온다 — 화면 높이 ∝ (카메라 y − floorY) / (카메라 z + 반경). 바닥만 내려서는
   * 안 떨어지고 반경도 줄여야 한다:
   *   floor -0.11, R 0.150 → 뒤 테두리가 목 끝보다 위
   *   floor -0.12, R 0.105 → 목 끝보다 ~10px 아래 (318px 캔버스), 앞 모서리는 프레임 98%
   */
  floorY: NECK_END_Y - 0.0282,
  baseRadius: 0.105,
  housingHeight: 0.04,
  /** 이미터 우물: 윗판보다 파여 있어 코어가 그늘 속에 앉는다(물리적 깊이). */
  well: { radius: 0.062, depth: 0.005 },
  /** 주 조리개(가장 밝고 얇다)와 보조 링(흐리고 두껍다) — 빛나는 링은 이 둘뿐. */
  aperture: { radius: 0.03 },
  secondaryRing: { inner: 0.044, outer: 0.05 },
  cylinderRadius: 0.158,
  cylinderTop: 0.3,
  /**
   * 빔 — 조리개에서 목으로 벌어지는 깔때기(선반 단면, [반경, 높이]).
   * 목 끝에서 칼라 단면만큼 넓어져 칼라와 만나고, 턱 위로는 거의 사라진다.
   */
  beam: {
    // 받침(-0.12)에서 목 끝(-0.0875)까지 0.0325 — 이 틈이 빔이 보이는 자리다.
    profile: [
      [0.028, 0],
      [0.048, 0.008],
      [0.072, 0.018],
      [0.092, 0.027],
      [0.106, 0.035],
      [0.114, 0.05],
      [0.12, 0.085],
    ] as ReadonlyArray<readonly [number, number]>,
    /** 이 높이까지 가장 강하다 (목 끝). */
    strongUntilY: -0.086,
    /** 이 높이에서 사라진다 (턱선 아래). */
    fadeOutY: -0.045,
  },
  /** 세로로 긴 타원 후광 — 머리칼 분리용. */
  halo: { y: 0.07, z: -0.21, width: 0.44, height: 0.58 },
  /** 머리 위 아주 희미한 천장 링 (프레임 상단 y ≈ 0.216 근처). */
  topAperture: { y: 0.19, radius: 0.15 },
  /**
   * 목 물질화 (머리 공간 — 아이들 흔들림·끄덕임을 따라간다).
   * GLB 정점 1mm 슬라이스 실측 (2026-09-28):
   *   턱 아래면  y ≈ -0.0625 (앞 윤곽 z 가 0.051 → 0.066 으로 뛰는 자리)
   *   메쉬 바닥  y = -0.0875 (피부 프리미티브. 구강 -0.054, 치아 -0.048 은 목과 무관)
   *   바닥 단면  x ±0.097, z -0.093..0.032 — 목이 아래로 갈수록 넓어진다(0.070 → 0.097)
   * Box3 는 모프 때문에 ±0.043 부풀어 있어 쓰지 않는다.
   *
   *   A 고체      y > solidY
   *   B 물질화    solidY → energyY  : 얇은 스캔 행 분리 + 드문 픽셀 분해
   *   C 에너지    energyY → goneY   : 형상이 빛 속으로 사라진다
   * goneY 는 메쉬 끝보다 위 — 실제 잘린 단면은 그려지지 않는다.
   * 값은 브라우저 렌더 픽셀로 다시 확인한다 (tests 는 기하 관계만 고정).
   */
  neck: {
    chinUndersideY: -0.0625,
    solidY: -0.0645,
    energyY: -0.0745,
    goneY: -0.0842,
    meshBottomY: -0.0875,
    section: { centerZ: -0.03, radiusX: 0.106, radiusZ: 0.07 },
  },
  /**
   * 에너지 칼라 — 목이 끝나는 자리를 감싸고 위로 빛을 올린다.
   * 렌더 픽셀 실측(1920 사이드 패널): y 를 목 끝(-0.0845)에 두면 타원 앞쪽이 화면에서
   * 더 낮게 투영돼 빛의 정점이 마지막 피부 행보다 ~9px 아래에 선다. 그 사이의 어두운
   * 몇 행이 "잘린 목"으로 읽혔다. 정점을 에너지 구간(C)에 겹치도록 올린다.
   */
  collar: { y: -0.079, bandHeight: 0.05 },
} as const;

export type HologramState =
  | "ready"
  | "searching"
  | "generating"
  | "voice_warming"
  | "speaking"
  | "error";

export interface HologramTuning {
  /** 전체 투사 밝기 배율. */
  intensity: number;
  /** 빔 밝기. */
  beam: number;
  /** 이미터 코어 밝기. */
  core: number;
  /** 입자 밝기 — 개수는 바꾸지 않는다(버퍼 재생성 없음). */
  particles: number;
  /** 스캔 밴드 이동 속도. */
  scanSpeed: number;
  /** 받침 이미터 맥동 진폭. */
  emitterPulse: number;
  /** 원통·빔 노이즈 강도 — 실패 시 약간의 불안정. */
  noise: number;
  /** 입자 상승 속도 배율. */
  drift: number;
  /** 0 = 주 색, 1 = 호박 액센트. */
  accent: number;
}

export const HOLOGRAM_TUNING: Record<HologramState, HologramTuning> = {
  // emitterPulse 2–4%: 숨쉬는 게 눈에 보이면 과하다.
  ready: { intensity: 1, beam: 0.7, core: 1, particles: 0.6, scanSpeed: 0.35, emitterPulse: 0.02, noise: 0.25, drift: 1, accent: 0 },
  searching: { intensity: 1.04, beam: 0.85, core: 1.08, particles: 0.7, scanSpeed: 0.55, emitterPulse: 0.04, noise: 0.28, drift: 1.15, accent: 0 },
  generating: { intensity: 1.05, beam: 0.85, core: 1.1, particles: 0.9, scanSpeed: 0.5, emitterPulse: 0.03, noise: 0.28, drift: 1.3, accent: 0 },
  voice_warming: { intensity: 1.02, beam: 0.78, core: 1.3, particles: 0.65, scanSpeed: 0.4, emitterPulse: 0.03, noise: 0.25, drift: 1.05, accent: 0 },
  speaking: { intensity: 1.03, beam: 0.8, core: 1.1, particles: 0.7, scanSpeed: 0.4, emitterPulse: 0.02, noise: 0.25, drift: 1.1, accent: 0 },
  error: { intensity: 0.85, beam: 0.55, core: 0.8, particles: 0.45, scanSpeed: 0.3, emitterPulse: 0.01, noise: 0.7, drift: 0.7, accent: 1 },
};

export function resolveHologramState(
  request: DocentRequestStatus,
  voice: VoiceLifecycle,
  speaking: boolean,
): HologramState {
  if (request === "failed" || voice === "VOICE_ERROR") return "error";
  if (speaking || voice === "VOICE_SPEAKING") return "speaking";
  if (request === "searching") return "searching";
  if (request === "answering" || request === "delayed") return "generating";
  if (voice === "VOICE_WARMING" || voice === "VOICE_SYNTHESIZING" || voice === "VOICE_DELAYED") {
    return "voice_warming";
  }
  return "ready";
}

/**
 * 모바일은 정체성만 남긴다: 아바타·받침·칼라·빔·후광·단순 입자.
 * 목 전환(디졸브·칼라·가림 띠)과 빔은 모바일에서도 끄지 않는다 — 목이 이어져 보여야 한다.
 */
export interface HologramDetail {
  particles: number;
  arcs: boolean;
  /** 비대칭 진단 조각. */
  fragment: boolean;
  /** 원통 간섭 무늬·스캔. 끄면 프레넬 윤곽만. */
  cylinderDetail: boolean;
  topAperture: boolean;
  beam: boolean;
}

export const HOLOGRAM_DETAIL = {
  desktop: { particles: 150, arcs: true, fragment: true, cylinderDetail: true, topAperture: true, beam: true },
  mobile: { particles: 48, arcs: false, fragment: false, cylinderDetail: false, topAperture: false, beam: true },
} as const satisfies Record<string, HologramDetail>;
