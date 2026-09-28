/**
 * 아바타 WebGL 수명. 브라우저는 탭이 오래 숨겨져 있거나 GPU 메모리가 모자라면
 * WebGL 컨텍스트를 빼앗는다(webglcontextlost). 예전에는 그 한 번으로 영구히 이모지
 * 폴백으로 내려가 "2분쯤 지나면 얼굴이 이모티콘이 된다"로 보였다.
 *
 * 이제는:
 *   잃음 → 복원을 기다린다(restoreWaitMs)
 *        → 복원되면 그대로 얼굴
 *        → 안 되면(또는 탭이 다시 보이면) 캔버스를 새 컨텍스트로 다시 마운트
 *   짧은 시간에 반복해서 잃을 때만(lossWindowMs 안에 maxLosses 초과) 포기한다.
 */
export type AvatarGlStatus = "checking" | "ready" | "recovering" | "unavailable";

export interface AvatarGlState {
  status: AvatarGlStatus;
  /** 캔버스 key — 올리면 새 WebGL 컨텍스트로 다시 마운트된다. */
  canvasKey: number;
  /** 최근 컨텍스트 손실 시각(ms). 창 밖으로 밀려난 것은 버린다. */
  recentLosses: number[];
}

export type AvatarGlEvent =
  | { type: "PROBED"; available: boolean }
  | { type: "CREATED" }
  | { type: "LOST"; now: number }
  | { type: "RESTORED" }
  /** 복원 대기 시간이 지났거나 탭이 다시 보였다 — 새 컨텍스트로 다시 만든다. */
  | { type: "REMOUNT" }
  /** GLB 파싱 등 렌더 오류 — 손실과 같은 예산으로 다시 시도한다. */
  | { type: "RENDER_ERROR"; now: number };

export const AVATAR_RECOVERY = {
  restoreWaitMs: 1500,
  lossWindowMs: 60_000,
  maxLosses: 4,
} as const;

export const initialAvatarGlState: AvatarGlState = {
  status: "checking",
  canvasKey: 0,
  recentLosses: [],
};

function recordLoss(state: AvatarGlState, now: number): AvatarGlState {
  const recentLosses = [...state.recentLosses, now].filter(
    (at) => now - at <= AVATAR_RECOVERY.lossWindowMs,
  );
  if (recentLosses.length > AVATAR_RECOVERY.maxLosses) {
    return { ...state, status: "unavailable", recentLosses };
  }
  return { ...state, status: "recovering", recentLosses };
}

export function avatarGlReducer(state: AvatarGlState, event: AvatarGlEvent): AvatarGlState {
  switch (event.type) {
    case "PROBED":
      return { ...state, status: event.available ? "ready" : "unavailable" };
    case "CREATED":
    case "RESTORED":
      return state.status === "unavailable" ? state : { ...state, status: "ready" };
    case "LOST":
      return state.status === "unavailable" ? state : recordLoss(state, event.now);
    case "RENDER_ERROR": {
      if (state.status === "unavailable") return state;
      const next = recordLoss(state, event.now);
      return next.status === "unavailable" ? next : { ...next, canvasKey: state.canvasKey + 1 };
    }
    case "REMOUNT":
      return state.status === "recovering" ? { ...state, canvasKey: state.canvasKey + 1 } : state;
    default:
      return state;
  }
}
