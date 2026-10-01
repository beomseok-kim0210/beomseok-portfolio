/**
 * 테스트용 "정답 dense" — 실제 임베딩 없이 하이브리드 경로의 결정 논리(범위·융합·폴백)를 검증한다.
 * 조각마다 한 축(one-hot)을 주고, 질문 벡터는 원하는 조각들에 가중치를 준 합이다. 그러면 dense 순위가
 * 정확히 그 가중치 순서가 된다. 의미 검색 품질을 흉내 내는 것이 아니라, "dense 가 이렇게 순위를 냈다면
 * 검색이 무엇을 하는가" 를 고정하는 도구다.
 */
import { getCorpus } from "@/lib/docent/rag/corpus";
import { createDenseIndex, normalizeVector, type DenseIndex } from "@/lib/docent/rag/embeddings";
import type { DenseQuery } from "@/lib/docent/rag/retrieval";

export const ORACLE_MODEL = "oracle-onehot";

export function oracleIndex(): { index: DenseIndex; vector: (weights: Record<string, number>) => Float32Array } {
  const ids = getCorpus().map((c) => c.id);
  const dims = ids.length;
  const pos = new Map(ids.map((id, i) => [id, i]));
  const vectors = new Map(ids.map((id, i) => {
    const v = new Float32Array(dims);
    v[i] = 1;
    return [id, v];
  }));
  const index = createDenseIndex(ORACLE_MODEL, dims, vectors);
  const vector = (weights: Record<string, number>) => {
    const v = new Float32Array(dims);
    for (const [id, w] of Object.entries(weights)) {
      const i = pos.get(id);
      if (i === undefined) throw new Error(`unknown chunk ${id}`);
      v[i] = w;
    }
    return normalizeVector(v);
  };
  return { index, vector };
}

/** 가중치 목록(앞일수록 높음)으로 dense 질문을 만든다. */
export function oracleQuery(current: string[], contextual: string[] | null = null): DenseQuery {
  const { index, vector } = oracleIndex();
  const w = (ids: string[]) => Object.fromEntries(ids.map((id, i) => [id, 1 - i * 0.02]));
  return { index, current: vector(w(current)), contextual: contextual ? vector(w(contextual)) : null };
}
