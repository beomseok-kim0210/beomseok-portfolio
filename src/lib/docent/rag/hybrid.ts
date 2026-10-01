/**
 * 채팅 라우트의 검색 진입점 — 질문 임베딩을 받아 하이브리드로 검색하고, 어느 단계든 실패하면
 * 조용히 BM25 로 내려간다. 사용자에게는 내부 오류를 보이지 않고, 서버 로그에만 남긴다:
 *
 *   hybrid_mode=dense+bm25            정상
 *   hybrid_mode=bm25_fallback reason=no_api_key | missing_artifact | stale_artifact |
 *                                    model_mismatch | invalid_artifact | timeout | 429 | 5xx | …
 *
 * 아티팩트 검증은 인스턴스마다 한 번(첫 질문)이다. 질문 임베딩은 매 질문 한 번의 API 호출로
 * 현재 질문과 문맥 질의를 함께 보낸다(입력 배열 2개).
 */
import { getCorpus } from "./corpus";
import {
  classifyEmbeddingError,
  denseIndexFromArtifact,
  getQueryEmbedder,
  readEmbeddingArtifact,
  withQueryCache,
  type DenseIndexStatus,
  type Embedder,
} from "./embeddings";
import { contextualQueryText, retrieve, type ConversationTurn, type RetrievalResult } from "./retrieval";
import type { PageContext } from "./types";

export type HybridMode = "dense+bm25" | "bm25_fallback";

export interface HybridRetrieval {
  retrieval: RetrievalResult;
  hybridMode: HybridMode;
  fallbackReason: string | null;
  /** 질문 임베딩 왕복(캐시 적중이면 ~0). dense 를 시도하지 않았으면 null. */
  queryEmbeddingMs: number | null;
  retrievalTotalMs: number;
}

let cachedStatus: DenseIndexStatus | null = null;
let loggedStatus = false;

/** 인스턴스 한 번만 아티팩트를 읽고 검증한다. 실패 사유는 첫 번째에 한 번 로그로 남긴다. */
export function denseIndexStatus(): DenseIndexStatus {
  if (!cachedStatus) {
    const artifact = readEmbeddingArtifact();
    cachedStatus = artifact === null ? { ok: false, reason: "missing_artifact" } : denseIndexFromArtifact(artifact, getCorpus());
    if (!cachedStatus.ok && !loggedStatus) {
      loggedStatus = true;
      console.warn("[docent-rag]", JSON.stringify({ hybrid_mode: "bm25_fallback", reason: cachedStatus.reason, note: "dense index disabled for this instance" }));
    }
  }
  return cachedStatus;
}

let cachedEmbedder: Embedder | null | undefined;
function defaultEmbedder(): Embedder | null {
  if (cachedEmbedder === undefined) {
    const inner = getQueryEmbedder();
    cachedEmbedder = inner ? withQueryCache(inner) : null;
  }
  return cachedEmbedder;
}

export interface HybridOptions {
  topK?: number;
  /** 테스트·평가용 주입. 생략하면 환경 설정(OPENAI_API_KEY)을 따른다. null 이면 dense 를 끈다. */
  embedder?: Embedder | null;
  indexStatus?: DenseIndexStatus;
}

export async function retrieveForChat(
  question: string,
  page: PageContext | null,
  history: ConversationTurn[],
  options: HybridOptions = {},
): Promise<HybridRetrieval> {
  const t0 = performance.now();
  const topK = options.topK ?? 8;
  const embedder = options.embedder === undefined ? defaultEmbedder() : options.embedder;
  const bm25Only = (reason: string, queryEmbeddingMs: number | null = null): HybridRetrieval => ({
    retrieval: retrieve(question, page, { history, topK }),
    hybridMode: "bm25_fallback",
    fallbackReason: reason,
    queryEmbeddingMs,
    retrievalTotalMs: Math.round((performance.now() - t0) * 10) / 10,
  });

  if (!embedder) return bm25Only("no_api_key");
  const status = options.indexStatus ?? denseIndexStatus();
  if (!status.ok) return bm25Only(status.reason);
  if (status.index.model !== embedder.model) return bm25Only("model_mismatch");

  const contextual = contextualQueryText(history, question);
  const te = performance.now();
  let vectors: Float32Array[];
  try {
    vectors = await embedder.embed(contextual ? [question.trim(), contextual] : [question.trim()]);
    if (vectors.some((v) => v.length !== status.index.dimensions)) throw new Error("dimension_mismatch");
  } catch (err) {
    const reason = err instanceof Error && err.message === "dimension_mismatch" ? "dimension_mismatch" : classifyEmbeddingError(err);
    return bm25Only(reason, Math.round((performance.now() - te) * 10) / 10);
  }
  const queryEmbeddingMs = Math.round((performance.now() - te) * 10) / 10;

  const retrieval = retrieve(question, page, {
    history,
    topK,
    dense: { index: status.index, current: vectors[0], contextual: vectors[1] ?? null },
  });
  return {
    retrieval,
    hybridMode: "dense+bm25",
    fallbackReason: null,
    queryEmbeddingMs,
    retrievalTotalMs: Math.round((performance.now() - t0) * 10) / 10,
  };
}

/** 테스트용: 인스턴스 캐시를 비운다. */
export function resetHybridCachesForTest(): void {
  cachedStatus = null;
  loggedStatus = false;
  cachedEmbedder = undefined;
}
