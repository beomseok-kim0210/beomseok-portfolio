import type { DocentStage } from "@/types/docent";
import { ACTIVATION_PENDING_COPY } from "./docentStatus";

export type VoiceLifecycle =
  | "VOICE_OFF"
  | "VOICE_WARMING"
  | "VOICE_READY"
  | "VOICE_SYNTHESIZING"
  | "VOICE_SPEAKING"
  | "VOICE_DELAYED"
  | "VOICE_ERROR";

export interface VoiceLifecycleState {
  status: VoiceLifecycle;
  warmingSince: number | null;
  failureStage: DocentStage | null;
}

export type VoiceLifecycleEvent =
  | { type: "ENABLE"; now: number }
  | { type: "HEALTH_WAITING"; now: number }
  | { type: "HEALTH_READY" }
  | { type: "SYNTHESIS_STARTED" }
  | { type: "PLAYBACK_STARTED" }
  | { type: "PLAYBACK_FINISHED" }
  | { type: "FAILED"; stage?: DocentStage }
  | { type: "DISABLE" };

export const initialVoiceLifecycleState: VoiceLifecycleState = {
  status: "VOICE_OFF",
  warmingSince: null,
  failureStage: null,
};

export function voiceLifecycleReducer(
  state: VoiceLifecycleState,
  event: VoiceLifecycleEvent,
): VoiceLifecycleState {
  switch (event.type) {
    case "ENABLE":
      return { status: "VOICE_WARMING", warmingSince: event.now, failureStage: null };
    case "HEALTH_WAITING": {
      const warmingSince = state.warmingSince ?? event.now;
      return {
        status: event.now - warmingSince >= 5_000 ? "VOICE_DELAYED" : "VOICE_WARMING",
        warmingSince,
        failureStage: null,
      };
    }
    case "HEALTH_READY":
      return { status: "VOICE_READY", warmingSince: null, failureStage: null };
    case "SYNTHESIS_STARTED":
      return state.status === "VOICE_OFF"
        ? state
        : { status: "VOICE_SYNTHESIZING", warmingSince: null, failureStage: null };
    case "PLAYBACK_STARTED":
      return state.status === "VOICE_OFF"
        ? state
        : { status: "VOICE_SPEAKING", warmingSince: null, failureStage: null };
    case "PLAYBACK_FINISHED":
      return state.status === "VOICE_OFF"
        ? state
        : { status: "VOICE_READY", warmingSince: null, failureStage: null };
    case "FAILED":
      return state.status === "VOICE_OFF"
        ? state
        : { status: "VOICE_ERROR", warmingSince: null, failureStage: event.stage ?? "unknown" };
    case "DISABLE":
      return initialVoiceLifecycleState;
  }
}

export const VOICE_STATUS_COPY: Record<Exclude<VoiceLifecycle, "VOICE_OFF">, string> = {
  // 음성 워커는 쉬면 꺼진다(scale-to-zero). 다시 켜지는 동안의 문구.
  VOICE_WARMING: ACTIVATION_PENDING_COPY,
  VOICE_DELAYED: "텍스트 답변은 먼저 확인하실 수 있어요.",
  VOICE_READY: "음성 준비 완료",
  VOICE_SYNTHESIZING: "음성을 생성하고 있어요…",
  VOICE_SPEAKING: "DD가 설명 중입니다",
  VOICE_ERROR: "음성 연결이 지연되고 있어요. 텍스트 답변은 계속 이용할 수 있습니다.",
};

export function voiceStatusMessage(state: VoiceLifecycleState, now: number): string | null {
  void now; // Keep the clock parameter stable for callers and future time-based copy changes.
  if (state.status === "VOICE_OFF") return null;
  return VOICE_STATUS_COPY[state.status];
}

type HealthPayload = {
  status?: unknown;
  runpod?: { workers?: Record<string, unknown> };
};

function positive(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/** 서버의 실제 준비 신호만 해석한다. 조회 자체는 워커를 깨우지 않는다. */
export function isVoiceHealthReady(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const health = payload as HealthPayload;
  if (health.status === "ready") return true;
  const workers = health.runpod?.workers;
  return Boolean(workers && (positive(workers.ready) || positive(workers.idle)));
}

/** 2s → 4s → 8s → 10s(상한). */
export function voicePollDelay(attempt: number): number {
  return Math.min(2_000 * 2 ** Math.max(0, attempt), 10_000);
}
