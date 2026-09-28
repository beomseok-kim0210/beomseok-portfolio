import { Color } from "three";
import { HOLOGRAM_PALETTE } from "./hologramConfig";

/**
 * 챔버 전체가 공유하는 uniform. 재질마다 같은 {value} 객체를 참조하므로
 * 챔버가 프레임당 한 번만 쓰면 모든 층이 같은 상태로 움직인다.
 */
export interface HologramUniforms {
  uTime: { value: number };
  /** 상태별 입자 속도를 적분한 시계. */
  uFlow: { value: number };
  uIntensity: { value: number };
  /** 빔 밝기 — 상태별로 감쇠한다. */
  uBeam: { value: number };
  /** 입자 밝기 — 개수는 그대로, 밝기로만 "더 조밀해 보이게" 한다. */
  uParticles: { value: number };
  uScanSpeed: { value: number };
  uNoiseStrength: { value: number };
  uPulse: { value: number };
  uColor: { value: Color };
  uColor2: { value: Color };
  /** 받침 립·부유 링만 쓰는 상태 액센트. 실패 시 이 둘만 호박색으로 기운다. */
  uAccent: { value: Color };
  /** 이미터 코어 밝기 — 음성 준비 중에는 천천히 차오른다. */
  uCore: { value: number };
  /** 0–1. 실패 시 받침 립에만 호박색이 걸리는 정도. */
  uAccentAmount: { value: number };
}

export function createHologramUniforms(): HologramUniforms {
  return {
    uTime: { value: 0 },
    uFlow: { value: 0 },
    uIntensity: { value: 1 },
    uBeam: { value: 0.7 },
    uParticles: { value: 0.6 },
    uScanSpeed: { value: 0.35 },
    uNoiseStrength: { value: 0.25 },
    uPulse: { value: 0 },
    uColor: { value: new Color(HOLOGRAM_PALETTE.primary) },
    uColor2: { value: new Color(HOLOGRAM_PALETTE.secondary) },
    uAccent: { value: new Color(HOLOGRAM_PALETTE.primary) },
    uCore: { value: 1 },
    uAccentAmount: { value: 0 },
  };
}
