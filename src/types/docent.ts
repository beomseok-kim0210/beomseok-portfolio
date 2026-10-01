export type DocentEmotion =
  | "neutral"
  | "smile"
  | "thinking"
  | "surprised"
  | "sad";

// "talking"은 모델이 고르는 감정이 아니라 스트리밍 중 클라이언트가 구동하는 모프.
export const DOCENT_EMOTIONS: readonly DocentEmotion[] = [
  "neutral",
  "smile",
  "thinking",
  "surprised",
  "sad",
] as const;

export type DocentChatRole = "user" | "assistant";

export type DocentStage =
  | "context"
  | "retrieval"
  | "llm"
  | "voice_warm"
  | "tts"
  | "network"
  | "unknown";

export interface DocentFailure {
  message: string;
  stage: DocentStage;
  retryAfterSeconds?: number;
  retryAt?: number;
}

export interface DocentChatMessage {
  role: DocentChatRole;
  content: string;
  /** Client-only presentation metadata. It is stripped from request history. */
  failure?: DocentFailure;
}

/**
 * live     — LLM 이 검색 근거를 바탕으로 생성한 답
 * evidence — LLM 없이 검색 근거를 발췌한 결정론적 답
 * fallback — 검색과 무관한 사전 작성 답변(인사·자기소개류)
 */
export type DocentMode = "live" | "evidence" | "fallback";

/** 클라이언트가 보내는 페이지 문맥. 서버가 검증한다 (rag/pageContext.ts). */
export interface DocentPageContext {
  pathname: string;
  pageType: "home" | "about" | "project" | "playground" | "knowledge" | "skills" | "other";
  projectSlug?: string;
  sectionId?: string;
}

/** 근거 출처 — 디버그/평가용. 화면에는 그리지 않고, 파일 경로는 담지 않는다. */
export interface DocentSource {
  chunkId: string;
  title: string;
  entityId: string;
  section: string;
  sourceId: string;
  score: number;
}

export interface DocentTimings {
  pageContextMs: number;
  retrievalMs: number;
  llmTtfbMs: number | null;
  llmTotalMs: number | null;
  chatTotalMs: number;
  stages: Record<DocentStage, number | null>;
  failureStage: DocentStage | null;
  /** 검색 세부(서버 계측). 하이브리드가 아니면 queryEmbeddingMs·denseSearchMs 는 null/0. */
  retrieval?: {
    hybridMode: "dense+bm25" | "bm25_fallback";
    queryEmbeddingMs: number | null;
    bm25Ms: number;
    denseSearchMs: number;
    fusionMs: number;
    retrievalTotalMs: number;
  };
}

// NDJSON 와이어 프로토콜 — 한 줄에 JSON 하나. 모르는 type 은 클라이언트가 무시한다.
export type DocentStreamEvent =
  | { type: "stage"; stage: DocentStage; status: "started" | "complete"; elapsedMs?: number }
  | { type: "meta"; emotion: DocentEmotion; mode: DocentMode; provider?: "openai" | "anthropic" | "none" }
  | { type: "sources"; grounded: boolean; activeProject: string | null; sources: DocentSource[] }
  | { type: "delta"; text: string }
  | { type: "done"; timings?: DocentTimings }
  | { type: "error"; message: string; failureStage: DocentStage; retryAfterSeconds?: number };

export function isDocentEmotion(value: unknown): value is DocentEmotion {
  return (
    typeof value === "string" &&
    (DOCENT_EMOTIONS as readonly string[]).includes(value)
  );
}
