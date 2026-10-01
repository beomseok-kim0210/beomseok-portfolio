/**
 * Dense 검색의 임베딩 계층 — 문서 벡터는 미리 만들고, 질문 벡터만 요청 때 만든다.
 *
 *   canonical corpus → scripts/docent/build-embeddings.ts (npm run docent:embed)
 *     → src/generated/docent-embeddings.json → 런타임 메모리 적재
 *
 * 벡터 DB 는 쓰지 않는다. 조각이 수백 개라 질문 벡터와 전수 코사인으로 충분하다(< 1 ms).
 * 조각이 수만 개가 되면 DenseIndex.search 뒤만 바꾸면 된다.
 *
 * 오래된 벡터를 조용히 쓰지 않는다: 아티팩트는 임베딩한 문자열 전체의 지문(corpusHash)과
 * 모델·차원을 함께 적는다. 지금 코퍼스로 다시 계산한 지문이나 설정된 모델이 다르면 dense 를
 * 끄고 BM25 로 내려간다(서버 로그에 사유). 테스트(tests/docent-embeddings.test.ts)와
 * `npm run docent:embed -- --check` 는 같은 불일치를 실패로 본다.
 *
 * 키는 OpenAI SDK 가 환경(OPENAI_API_KEY)에서 직접 읽는다. 이 모듈은 값을 만지지 않고,
 * 로그에는 오류의 종류(timeout / 429 / 5xx …)만 남긴다.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import OpenAI from "openai";

import type { RagChunk } from "./types";

type Env = Record<string, string | undefined>;

export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
/** 질문 임베딩 왕복 상한. 넘으면 그 질문은 BM25 로만 답한다. */
export const DEFAULT_EMBEDDING_TIMEOUT_MS = 1_500;

export function resolveEmbeddingModel(env: Env = process.env): string {
  return env.DOCENT_EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL;
}

/** 차원 축소(text-embedding-3 의 dimensions). 비우면 모델 기본 차원. */
export function resolveEmbeddingDimensions(env: Env = process.env): number | null {
  const n = Number(env.DOCENT_EMBEDDING_DIMENSIONS);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function resolveEmbeddingTimeoutMs(env: Env = process.env): number {
  const n = Number(env.DOCENT_EMBEDDING_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_EMBEDDING_TIMEOUT_MS;
}

/* ------------------------------------------------------------- 문서 텍스트 */

const MAX_DOCUMENT_CHARS = 2_000;

/**
 * 조각 하나를 임베딩할 때 넣는 문자열. 프로젝트 이름과 제목을 앞에 붙여 "ARMI" 같은 고유명이
 * 본문에 없는 조각도 그 프로젝트의 의미 공간에 놓이게 한다. 이 문자열이 바뀌면 지문도 바뀐다.
 */
export function documentEmbeddingText(chunk: RagChunk): string {
  const owner = chunk.projectTitle ?? chunk.entityType;
  // 제목이 이미 프로젝트 이름으로 시작하면(큐레이션 스냅샷: "ARMI · voice") 이름을 두 번 넣지 않는다 — 이름 비중이
  // 커질수록 짧은 조각이 "이름만 있는 질문" 에 허브가 된다(실측, docs/rag/README.md §7).
  const head = chunk.title.toLowerCase().startsWith(owner.toLowerCase()) ? chunk.title : `${owner} · ${chunk.title}`;
  const text = `${head}\n${chunk.text}`;
  return text.length > MAX_DOCUMENT_CHARS ? text.slice(0, MAX_DOCUMENT_CHARS) : text;
}

/**
 * 코퍼스 지문. 조각 ID 와 실제로 임베딩하는 문자열, 모델, 차원이 하나라도 바뀌면 달라진다.
 * 조각 순서와 무관하다(ID 로 정렬).
 */
export function corpusFingerprint(chunks: RagChunk[], model: string, dimensions: number | null): string {
  const h = createHash("sha256");
  h.update(`model=${model}\ndimensions=${dimensions ?? "default"}\n`);
  for (const c of [...chunks].sort((a, b) => a.id.localeCompare(b.id))) {
    h.update(`${c.id}\u0000${documentEmbeddingText(c)}\u0001`);
  }
  return h.digest("hex");
}

/* ------------------------------------------------------------- 아티팩트 */

export interface EmbeddingArtifactRecord {
  chunkId: string;
  /** Float32 little-endian, base64. JSON 숫자 배열보다 4배 작고 값이 정확하다. */
  vector: string;
}

export interface EmbeddingArtifact {
  version: 1;
  embeddingModel: string;
  dimensions: number;
  /** 요청에 dimensions 를 지정했는지(null = 모델 기본). 지문 계산에 들어간다. */
  requestedDimensions: number | null;
  corpusHash: string;
  chunkCount: number;
  generatedAt: string;
  records: EmbeddingArtifactRecord[];
}

export const EMBEDDING_ARTIFACT_PATH = path.join("src", "generated", "docent-embeddings.json");

export function encodeVector(v: Float32Array): string {
  return Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString("base64");
}

export function decodeVector(b64: string): Float32Array {
  const buf = Buffer.from(b64, "base64");
  const out = new Float32Array(buf.byteLength / 4);
  for (let i = 0; i < out.length; i++) out[i] = buf.readFloatLE(i * 4);
  return out;
}

export function normalizeVector(values: ArrayLike<number>): Float32Array {
  let norm = 0;
  for (let i = 0; i < values.length; i++) norm += values[i] * values[i];
  norm = Math.sqrt(norm) || 1;
  const out = new Float32Array(values.length);
  for (let i = 0; i < values.length; i++) out[i] = values[i] / norm;
  return out;
}

/** 둘 다 정규화돼 있으면 내적이 코사인이다. */
export function cosine(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

/* ------------------------------------------------------------- 런타임 색인 */

export interface DenseHit {
  chunkId: string;
  cosine: number;
}

export interface DenseIndex {
  readonly model: string;
  readonly dimensions: number;
  readonly size: number;
  /** 모든 조각을 코사인 내림차순으로. 동점은 ID 순. */
  search(query: Float32Array): DenseHit[];
}

export function createDenseIndex(model: string, dimensions: number, vectors: Map<string, Float32Array>): DenseIndex {
  const entries = [...vectors.entries()];
  return {
    model,
    dimensions,
    size: entries.length,
    search(query) {
      return entries
        .map(([chunkId, v]) => ({ chunkId, cosine: cosine(query, v) }))
        .sort((a, b) => b.cosine - a.cosine || a.chunkId.localeCompare(b.chunkId));
    },
  };
}

export type DenseIndexStatus =
  | { ok: true; index: DenseIndex }
  | { ok: false; reason: "missing_artifact" | "invalid_artifact" | "stale_artifact" | "model_mismatch" };

/**
 * 아티팩트를 검증해 색인으로 만든다. 지금 코퍼스의 조각이 하나라도 벡터가 없거나, 지문·모델이
 * 다르면 거부한다 — 일부만 맞는 색인으로 검색하면 빠진 조각은 dense 에서 영원히 안 보인다.
 */
export function denseIndexFromArtifact(artifact: unknown, chunks: RagChunk[], env: Env = process.env): DenseIndexStatus {
  if (!isArtifact(artifact)) return { ok: false, reason: "invalid_artifact" };
  if (artifact.embeddingModel !== resolveEmbeddingModel(env)) return { ok: false, reason: "model_mismatch" };
  if ((artifact.requestedDimensions ?? null) !== resolveEmbeddingDimensions(env)) return { ok: false, reason: "model_mismatch" };
  if (artifact.corpusHash !== corpusFingerprint(chunks, artifact.embeddingModel, artifact.requestedDimensions ?? null)) {
    return { ok: false, reason: "stale_artifact" };
  }
  const vectors = new Map<string, Float32Array>();
  for (const r of artifact.records) {
    const v = decodeVector(r.vector);
    if (v.length !== artifact.dimensions) return { ok: false, reason: "invalid_artifact" };
    vectors.set(r.chunkId, v);
  }
  if (chunks.some((c) => !vectors.has(c.id)) || vectors.size !== chunks.length) return { ok: false, reason: "stale_artifact" };
  return { ok: true, index: createDenseIndex(artifact.embeddingModel, artifact.dimensions, vectors) };
}

function isArtifact(x: unknown): x is EmbeddingArtifact {
  if (!x || typeof x !== "object") return false;
  const a = x as Partial<EmbeddingArtifact>;
  return a.version === 1 && typeof a.embeddingModel === "string" && typeof a.corpusHash === "string"
    && typeof a.dimensions === "number" && Array.isArray(a.records)
    && a.records.every((r) => r && typeof r.chunkId === "string" && typeof r.vector === "string");
}

export function readEmbeddingArtifact(root: string = process.cwd()): unknown | null {
  const file = path.join(root, EMBEDDING_ARTIFACT_PATH);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return {}; // 깨진 JSON → invalid_artifact
  }
}

/* ------------------------------------------------------------- 질문 임베딩 */

export interface Embedder {
  readonly model: string;
  /** 정규화된 벡터를 입력 순서대로. 실패하면 throw — 호출자가 BM25 로 내려간다. */
  embed(texts: string[], signal?: AbortSignal): Promise<Float32Array[]>;
}

/** 오류를 로그용 종류로만 줄인다. 메시지·헤더는 남기지 않는다(키가 섞일 여지를 없앤다). */
export function classifyEmbeddingError(err: unknown): string {
  if (err instanceof OpenAI.APIConnectionTimeoutError) return "timeout";
  if (err instanceof OpenAI.APIUserAbortError) return "timeout";
  if (err instanceof OpenAI.RateLimitError) return "429";
  if (err instanceof OpenAI.APIError && typeof err.status === "number") return err.status >= 500 ? "5xx" : String(err.status);
  if (err instanceof OpenAI.APIConnectionError) return "connection";
  if (err instanceof Error && err.name === "AbortError") return "timeout";
  return "unknown";
}

class OpenAIEmbedder implements Embedder {
  readonly model: string;
  private readonly client: OpenAI;
  private readonly dimensions: number | null;
  private readonly timeoutMs: number;

  constructor(env: Env) {
    this.model = resolveEmbeddingModel(env);
    this.dimensions = resolveEmbeddingDimensions(env);
    this.timeoutMs = resolveEmbeddingTimeoutMs(env);
    // 재시도하지 않는다 — 실패하면 그 질문은 BM25 로 답하는 편이 기다리는 것보다 낫다.
    this.client = new OpenAI({ maxRetries: 0, timeout: this.timeoutMs });
  }

  async embed(texts: string[], signal?: AbortSignal): Promise<Float32Array[]> {
    const res = await this.client.embeddings.create(
      { model: this.model, input: texts, ...(this.dimensions ? { dimensions: this.dimensions } : {}) },
      { signal, timeout: this.timeoutMs, maxRetries: 0 },
    );
    return [...res.data].sort((a, b) => a.index - b.index).map((d) => normalizeVector(d.embedding));
  }
}

/** 키가 있을 때만. 값은 보지 않고 존재만 본다. */
export function getQueryEmbedder(env: Env = process.env): Embedder | null {
  return env.OPENAI_API_KEY ? new OpenAIEmbedder(env) : null;
}

/** 빌드 스크립트용 — 같은 설정의 임베더를 키 존재와 무관하게 만든다(없으면 SDK 가 throw). */
export function createOpenAIEmbedder(env: Env = process.env): Embedder {
  return new OpenAIEmbedder(env);
}

/**
 * 같은 질문(시작 질문 버튼 등)이 반복되면 API 를 다시 부르지 않는다. 인스턴스 메모리, 작은 LRU.
 * 키는 모델 + 입력 문자열이다.
 */
export function withQueryCache(inner: Embedder, capacity = 128): Embedder {
  const cache = new Map<string, Float32Array>();
  return {
    model: inner.model,
    async embed(texts, signal) {
      const missing = texts.filter((t) => !cache.has(`${inner.model}\u0000${t}`));
      if (missing.length > 0) {
        const unique = [...new Set(missing)];
        const vectors = await inner.embed(unique, signal);
        unique.forEach((t, i) => {
          const key = `${inner.model}\u0000${t}`;
          cache.set(key, vectors[i]);
          if (cache.size > capacity) cache.delete(cache.keys().next().value as string);
        });
      }
      return texts.map((t) => {
        const key = `${inner.model}\u0000${t}`;
        const v = cache.get(key)!;
        cache.delete(key); // LRU: 최근 사용을 뒤로
        cache.set(key, v);
        return v;
      });
    },
  };
}
