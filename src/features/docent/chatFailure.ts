import type { DocentChatMessage, DocentFailure, DocentStage, DocentStreamEvent } from "@/types/docent";

const SAFE_FALLBACK = "답변을 불러오지 못했어요.";
const INTERNAL_DETAIL = /(?:[A-Za-z]:\\|\/(?:src|app|home|Users|var|etc)\/|process\.env|API_KEY|stack\s*trace)/i;

export function safeFailureMessage(value: unknown): string {
  if (typeof value !== "string") return SAFE_FALLBACK;
  const message = value.trim();
  if (!message || message.length > 180 || INTERNAL_DETAIL.test(message)) return SAFE_FALLBACK;
  return message;
}

export function parseRetryAfter(value: string | null, now = Date.now()): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);
  const date = Date.parse(value);
  if (!Number.isFinite(date)) return undefined;
  return Math.max(0, Math.ceil((date - now) / 1000));
}

export function preserveAssistantFailure(
  messages: DocentChatMessage[],
  failure: DocentFailure,
): DocentChatMessage[] {
  if (messages.length === 0) return messages;
  const next = [...messages];
  const last = next[next.length - 1];
  if (last.role !== "assistant") return messages;
  next[next.length - 1] = { ...last, failure };
  return next;
}

export function failureFromStreamError(
  event: Extract<DocentStreamEvent, { type: "error" }>,
  now = Date.now(),
): DocentFailure {
  return {
    message: safeFailureMessage(event.message),
    stage: event.failureStage ?? "unknown",
    ...(event.retryAfterSeconds === undefined
      ? {}
      : {
          retryAfterSeconds: event.retryAfterSeconds,
          retryAt: now + event.retryAfterSeconds * 1000,
        }),
  };
}

export async function failureFromResponse(
  response: Response,
  now = Date.now(),
): Promise<DocentFailure> {
  const payload = await response.json().catch(() => null) as {
    error?: unknown;
    failure_stage?: unknown;
  } | null;
  const allowed: readonly DocentStage[] = [
    "context", "retrieval", "llm", "voice_warm", "tts", "network", "unknown",
  ];
  const stage = allowed.includes(payload?.failure_stage as DocentStage)
    ? payload?.failure_stage as DocentStage
    : "network";
  const retryAfterSeconds = parseRetryAfter(response.headers.get("Retry-After"), now);
  return {
    message: safeFailureMessage(payload?.error),
    stage,
    ...(retryAfterSeconds === undefined
      ? {}
      : { retryAfterSeconds, retryAt: now + retryAfterSeconds * 1000 }),
  };
}
