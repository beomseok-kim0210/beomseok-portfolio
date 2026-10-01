// 하이브리드 검색 계층 — 임베딩 아티팩트·지문(stale) 가드·폴백·RRF·prior 상한·질문 임베딩 캐시.
//
// 실제 API 를 부르지 않는다. 가짜 임베더(글자 n-gram 해시)와 정답 dense(one-hot)로 구조만 확인한다.
// 의미 검색 품질은 이 파일이 아니라 `npm run docent:eval`(키 + 아티팩트 필요)이 잰다.
import "./helpers/legacyCorpus";
import assert from "node:assert/strict";
import { test } from "node:test";

import { getCorpus } from "@/lib/docent/rag/corpus";
import {
  classifyEmbeddingError,
  corpusFingerprint,
  decodeVector,
  denseIndexFromArtifact,
  documentEmbeddingText,
  encodeVector,
  normalizeVector,
  resolveEmbeddingModel,
  withQueryCache,
  type EmbeddingArtifact,
  type Embedder,
} from "@/lib/docent/rag/embeddings";
import { retrieveForChat } from "@/lib/docent/rag/hybrid";
import { createHashingEmbedder, hashEmbed, MOCK_EMBEDDING_MODEL, mockDenseIndex } from "@/lib/docent/rag/mockEmbedder";
import { FOCUS_PRIOR, RRF_K, contextualQueryText, retrieve } from "@/lib/docent/rag/retrieval";

import { oracleQuery } from "./helpers/oracleDense";

const corpus = getCorpus();
const MOCK_ENV = { DOCENT_EMBEDDING_MODEL: MOCK_EMBEDDING_MODEL };

function mockArtifact(chunks = corpus, model = MOCK_EMBEDDING_MODEL): EmbeddingArtifact {
  return {
    version: 1,
    embeddingModel: model,
    dimensions: 256,
    requestedDimensions: null,
    corpusHash: corpusFingerprint(chunks, model, null),
    chunkCount: chunks.length,
    generatedAt: "2026-10-01T00:00:00.000Z",
    records: chunks.map((c) => ({ chunkId: c.id, vector: encodeVector(hashEmbed(documentEmbeddingText(c))) })),
  };
}

/* ------------------------------------------------------------- 설정 */

test("임베딩 모델은 환경변수로 바꿀 수 있고 기본은 text-embedding-3-small 이다", () => {
  assert.equal(resolveEmbeddingModel({}), "text-embedding-3-small");
  assert.equal(resolveEmbeddingModel({ DOCENT_EMBEDDING_MODEL: "text-embedding-3-large" }), "text-embedding-3-large");
});

/* ------------------------------------------------------------- 아티팩트 */

test("벡터는 base64 float32 로 손실 없이 왕복한다", () => {
  const v = normalizeVector([0.1, -0.2, 0.3, 0.4]);
  assert.deepEqual([...decodeVector(encodeVector(v))], [...v]);
});

test("코퍼스 지문은 조각 순서와 무관하고, 본문·모델·차원이 바뀌면 달라진다", () => {
  const a = corpusFingerprint(corpus, "m", null);
  assert.equal(a, corpusFingerprint([...corpus].reverse(), "m", null));
  assert.notEqual(a, corpusFingerprint(corpus, "m2", null));
  assert.notEqual(a, corpusFingerprint(corpus, "m", 512));
  const edited = corpus.map((c, i) => (i === 3 ? { ...c, text: `${c.text} (수정)` } : c));
  assert.notEqual(a, corpusFingerprint(edited, "m", null));
});

test("오래된 벡터를 조용히 쓰지 않는다 — 지문·모델·조각 누락이 다르면 거부한다", () => {
  assert.equal(denseIndexFromArtifact(mockArtifact(), corpus, MOCK_ENV).ok, true);

  // 코퍼스가 바뀐 뒤의 아티팩트(조각 하나 수정)
  const edited = corpus.map((c, i) => (i === 0 ? { ...c, text: `${c.text}!` } : c));
  const stale = denseIndexFromArtifact(mockArtifact(), edited, MOCK_ENV);
  assert.deepEqual(stale, { ok: false, reason: "stale_artifact" });

  // 설정된 모델과 다른 모델로 만든 아티팩트(질문 벡터와 공간이 다르다)
  assert.deepEqual(denseIndexFromArtifact(mockArtifact(), corpus, { DOCENT_EMBEDDING_MODEL: "text-embedding-3-small" }), { ok: false, reason: "model_mismatch" });

  // 조각이 하나 빠진 아티팩트(지문은 맞춰 놓아도 거부)
  const missing = mockArtifact();
  missing.records = missing.records.slice(1);
  assert.equal(denseIndexFromArtifact(missing, corpus, MOCK_ENV).ok, false);

  // 깨진 아티팩트
  assert.deepEqual(denseIndexFromArtifact({}, corpus, MOCK_ENV), { ok: false, reason: "invalid_artifact" });
});

/* ------------------------------------------------------------- 폴백 */

test("키가 없으면 dense 를 시도하지 않고 BM25 로 답한다 (hybrid_mode=bm25_fallback reason=no_api_key)", async () => {
  const r = await retrieveForChat("ARMI가 뭔데?", null, [], { embedder: null });
  assert.equal(r.hybridMode, "bm25_fallback");
  assert.equal(r.fallbackReason, "no_api_key");
  assert.equal(r.retrieval.mode, "bm25");
  assert.equal(r.retrieval.activeProject, "armi");
  assert.equal(r.queryEmbeddingMs, null);
});

test("아티팩트가 없거나 오래됐으면 질문 임베딩을 부르지 않고 BM25 로 답한다", async () => {
  for (const reason of ["missing_artifact", "stale_artifact", "model_mismatch", "invalid_artifact"] as const) {
    const embedder = createHashingEmbedder();
    const r = await retrieveForChat("ARMI가 뭔데?", null, [], { embedder, indexStatus: { ok: false, reason } });
    assert.equal(r.hybridMode, "bm25_fallback");
    assert.equal(r.fallbackReason, reason);
    assert.equal(embedder.calls, 0, "오래된 색인으로 API 비용을 쓰지 않는다");
  }
});

test("임베딩 API 가 timeout·429·5xx 로 실패해도 채팅은 BM25 로 계속된다 — 사유만 로그용으로 남긴다", async () => {
  const index = mockDenseIndex(corpus);
  const failing = (err: unknown): Embedder => ({ model: MOCK_EMBEDDING_MODEL, async embed() { throw err; } });
  const abort = new Error("aborted");
  abort.name = "AbortError";
  for (const [err, reason] of [[abort, "timeout"], [new Error("boom"), "unknown"]] as const) {
    const r = await retrieveForChat("ARMI가 뭔데?", null, [], { embedder: failing(err), indexStatus: { ok: true, index } });
    assert.equal(r.hybridMode, "bm25_fallback");
    assert.equal(r.fallbackReason, reason);
    assert.ok(r.retrieval.results.length > 0);
    assert.ok((r.queryEmbeddingMs ?? -1) >= 0);
  }
  // SDK 오류 분류는 메시지 없이 종류만 — 키가 섞일 여지가 없다
  const OpenAI = (await import("openai")).default;
  const headers = new Headers();
  assert.equal(classifyEmbeddingError(new OpenAI.RateLimitError(429, undefined, "rate", headers)), "429");
  assert.equal(classifyEmbeddingError(new OpenAI.InternalServerError(503, undefined, "x", headers)), "5xx");
  assert.equal(classifyEmbeddingError(new OpenAI.APIConnectionTimeoutError()), "timeout");
});

test("차원이 다른 질문 벡터는 dense 에 쓰지 않는다", async () => {
  const index = mockDenseIndex(corpus);
  const wrongDims: Embedder = { model: MOCK_EMBEDDING_MODEL, async embed(texts) { return texts.map(() => normalizeVector([1, 0, 0])); } };
  const r = await retrieveForChat("ARMI가 뭔데?", null, [], { embedder: wrongDims, indexStatus: { ok: true, index } });
  assert.equal(r.fallbackReason, "dimension_mismatch");
});

test("정상 경로: 한 번의 임베딩 호출로 현재 질문과 대화 문맥 질의를 함께 보내고 하이브리드로 답한다", async () => {
  const index = mockDenseIndex(corpus);
  const embedder = createHashingEmbedder();
  const seen: string[][] = [];
  const spy: Embedder = { model: embedder.model, embed: async (texts) => { seen.push(texts); return embedder.embed(texts); } };
  const history = [{ role: "user" as const, content: "ARMI가 뭔데?" }, { role: "assistant" as const, content: "ARMI는 병상 보조 로봇이에요." }];
  const r = await retrieveForChat("왜?", null, history, { embedder: spy, indexStatus: { ok: true, index } });
  assert.equal(r.hybridMode, "dense+bm25");
  assert.equal(r.retrieval.mode, "hybrid");
  assert.equal(seen.length, 1);
  assert.equal(seen[0][0], "왜?");
  assert.match(seen[0][1], /^\[context\]\nUser: ARMI가 뭔데\?\nAssistant: ARMI는 병상 보조 로봇이에요\.\n\[current\]\n왜\?$/);
  assert.equal(r.retrieval.activeProject, "armi");
  assert.ok(r.retrieval.results.some((x) => x.ranks.dense !== null || x.ranks.denseContext !== null));
  const t = r.retrieval.timings;
  assert.ok(t.bm25Ms >= 0 && t.denseSearchMs >= 0 && t.fusionMs >= 0 && r.retrievalTotalMs >= 0);
});

/* ------------------------------------------------------------- 융합 */

test("RRF: 두 목록의 순위만 쓴다 — 점수 척도를 섞지 않는다", () => {
  const dense = oracleQuery(["project:armi:architecture:realtime-flow", "project:armi:overview:recap"]);
  const r = retrieve("ARMI STOMP", null, { topK: 10, dense });
  const flow = r.results.find((x) => x.chunk.id === "project:armi:architecture:realtime-flow")!;
  assert.ok(flow, "dense 1위가 결과에 있다");
  assert.equal(flow.ranks.dense, 1);
  const base = (flow.ranks.bm25 ? 1 / (RRF_K + flow.ranks.bm25) : 0) + 1 / (RRF_K + 1);
  assert.ok(Math.abs(flow.score - base * flow.priors.focus * flow.priors.source) < 1e-9);
});

test("메타데이터 prior 는 의미 순위를 크게 뒤집지 못한다 — RRF 1위와 10위 사이를 넘지 못한다", () => {
  // 하이브리드에서 대화·페이지 prior 는 RRF 점수에 곱해진다. 다른 프로젝트의 1위 조각(× other)이
  // 가리킨 프로젝트의 10위 조각(× match)보다 항상 위여야 한다 — prior 는 동점 근처만 가른다.
  const { match, other } = FOCUS_PRIOR.fused;
  assert.ok((1 / (RRF_K + 1)) * other > (1 / (RRF_K + 10)) * match);
  // BM25 모드 prior(1.5 / 0.7)는 예전 평가로 정한 값 그대로다 — BM25 점수 척도에서의 힌트.
  assert.deepEqual(FOCUS_PRIOR.bm25, { match: 1.5, other: 0.7 });
});

test("dense 순위가 포트폴리오 목록·개요를 올리면 정규식 없이 포트폴리오 전체 범위가 된다", () => {
  const dense = oracleQuery(["profile:portfolio:projects", "project:armi:overview:recap", "project:hangarae:overview:recap", "project:wedding:overview:recap", "project:claw-dev:overview:recap", "project:docent:overview:detail"]);
  const r = retrieve("뭐 만들었어?", null, { topK: 8, dense });
  assert.equal(r.scope, "portfolio");
  assert.deepEqual([...new Set(r.results.map((x) => x.chunk.projectId).filter(Boolean))].sort(), ["armi", "claw-dev", "docent", "hangarae", "wedding"]);
});

test("문맥 질의 문자열: 직전 1~2 턴만, 어시스턴트 답은 잘라서 넣는다", () => {
  assert.equal(contextualQueryText([], "왜?"), null);
  const long = "가".repeat(1000);
  const text = contextualQueryText([
    { role: "user", content: "첫 질문" }, { role: "assistant", content: "첫 답" },
    { role: "user", content: "둘째 질문" }, { role: "assistant", content: "둘째 답" },
    { role: "user", content: "셋째 질문" }, { role: "assistant", content: long },
  ], "왜?")!;
  assert.ok(!text.includes("첫 질문"), "2 턴보다 오래된 대화는 넣지 않는다");
  assert.ok(text.includes("둘째 질문") && text.includes("셋째 질문"));
  assert.ok(text.length < 700, String(text.length));
});

/* ------------------------------------------------------------- 캐시 */

test("같은 질문은 질문 임베딩 API 를 다시 부르지 않는다", async () => {
  const inner = createHashingEmbedder();
  const cached = withQueryCache(inner, 4);
  const a = await cached.embed(["ARMI가 뭔데?"]);
  const b = await cached.embed(["ARMI가 뭔데?"]);
  assert.equal(inner.calls, 1);
  assert.deepEqual([...a[0]], [...b[0]]);
  await cached.embed(["1", "2", "3", "4", "5"]);
  assert.equal(inner.calls, 2);
});
