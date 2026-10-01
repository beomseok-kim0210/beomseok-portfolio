/**
 * 결정론적 가짜 임베더 — 구조 테스트 전용. 런타임 경로는 이 파일을 import 하지 않는다.
 *
 * 글자 2·3-gram 을 해시해 고정 차원에 흩뿌린 뒤 정규화한다. 표면 문자열이 겹치면 가깝고 아니면
 * 멀다 — 의미를 이해하지 않는다. 그래서 이 벡터로 낸 dense/hybrid 지표는 "실제 dense 품질" 이
 * 아니라 파이프라인(융합·범위·폴백·지문 검증)이 돌아가는지의 확인일 뿐이다.
 */
import { createDenseIndex, documentEmbeddingText, normalizeVector, type DenseIndex, type Embedder } from "./embeddings";
import { normalize } from "./tokenize";
import type { RagChunk } from "./types";

export const MOCK_EMBEDDING_MODEL = "mock-hashing-ngram";

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function hashEmbed(text: string, dims = 256): Float32Array {
  const v = new Float64Array(dims);
  const s = normalize(text).replace(/\s+/g, " ").trim();
  for (const n of [2, 3]) {
    for (let i = 0; i + n <= s.length; i++) {
      const g = s.slice(i, i + n);
      if (g.trim().length < n) continue;
      const h = fnv1a(g);
      v[h % dims] += (h & 0x80000000) ? -1 : 1;
    }
  }
  return normalizeVector(v);
}

export function createHashingEmbedder(dims = 256, model = MOCK_EMBEDDING_MODEL): Embedder & { calls: number } {
  const embedder = {
    model,
    calls: 0,
    async embed(texts: string[]) {
      embedder.calls += 1;
      return texts.map((t) => hashEmbed(t, dims));
    },
  };
  return embedder;
}

export function mockDenseIndex(chunks: RagChunk[], dims = 256, model = MOCK_EMBEDDING_MODEL): DenseIndex {
  return createDenseIndex(model, dims, new Map(chunks.map((c) => [c.id, hashEmbed(documentEmbeddingText(c), dims)])));
}
