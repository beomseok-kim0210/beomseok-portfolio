import type { DocentStage } from "@/types/docent";
import type { VoiceLifecycle } from "./voiceLifecycle";

export type DocentRequestStatus = "searching" | "answering" | "ready" | "delayed" | "failed";
export type DocentSurfaceStatus = DocentRequestStatus | "warming_voice";

export interface DocentRequestState {
  status: DocentRequestStatus;
  stage: DocentStage;
  startedAt: number | null;
}

export type DocentRequestEvent =
  | { type: "SEND"; now: number }
  | { type: "STAGE"; stage: DocentStage }
  | { type: "DELAYED" }
  | { type: "DONE" }
  | { type: "FAILED"; stage: DocentStage };

export const initialDocentRequestState: DocentRequestState = {
  status: "ready",
  stage: "unknown",
  startedAt: null,
};

export function docentRequestReducer(
  state: DocentRequestState,
  event: DocentRequestEvent,
): DocentRequestState {
  switch (event.type) {
    case "SEND":
      return { status: "searching", stage: "network", startedAt: event.now };
    case "STAGE":
      return {
        ...state,
        status: event.stage === "llm" ? "answering" : "searching",
        stage: event.stage,
      };
    case "DELAYED":
      return state.status === "searching" || state.status === "answering"
        ? { ...state, status: "delayed" }
        : state;
    case "DONE":
      return { status: "ready", stage: state.stage, startedAt: null };
    case "FAILED":
      return { status: "failed", stage: event.stage, startedAt: null };
  }
}

export function resolveDocentSurfaceStatus(
  request: DocentRequestStatus,
  voice: VoiceLifecycle,
): DocentSurfaceStatus {
  if (request === "failed" || voice === "VOICE_ERROR") return "failed";
  if (request === "delayed" || voice === "VOICE_DELAYED") return "delayed";
  if (request === "searching" || request === "answering") return request;
  if (voice === "VOICE_WARMING" || voice === "VOICE_SYNTHESIZING") return "warming_voice";
  return "ready";
}

export const DOCENT_STATUS_COPY: Record<DocentSurfaceStatus, string> = {
  searching: "현재 페이지를 바탕으로 답변을 정리하는 중이에요…",
  answering: "답변을 작성하고 있어요…",
  warming_voice: "음성 기능을 준비하고 있어요…",
  ready: "질문할 준비가 되었어요",
  delayed: "텍스트 답변은 먼저 확인하실 수 있어요.",
  failed: "답변을 마치지 못했어요",
};
