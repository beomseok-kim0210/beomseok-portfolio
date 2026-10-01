// 문서 임베딩 아티팩트 신선도 — 코퍼스(src/data, knowledge)를 고치고 `npm run docent:embed` 를 잊으면 실패한다.
//
// 런타임은 오래된 아티팩트를 만나면 dense 를 끄고 BM25 로만 답한다(서버 로그 hybrid_mode=bm25_fallback
// reason=stale_artifact). 운영에서는 조용히 품질이 떨어지는 것이므로, 빌드 전 테스트에서 잡는다.
// 아티팩트가 아직 없으면(키를 넣기 전) 건너뛴다 — 생성은 키가 필요한 명시적 명령이다.
import assert from "node:assert/strict";
import { test } from "node:test";

import { getCorpus } from "@/lib/docent/rag/corpus";
import { EMBEDDING_ARTIFACT_PATH, denseIndexFromArtifact, readEmbeddingArtifact } from "@/lib/docent/rag/embeddings";

const artifact = readEmbeddingArtifact();

test("임베딩 아티팩트가 지금 코퍼스·모델 설정과 맞다", { skip: artifact === null ? `${EMBEDDING_ARTIFACT_PATH} 없음 — npm run docent:embed 전` : false }, () => {
  const status = denseIndexFromArtifact(artifact, getCorpus());
  assert.ok(status.ok, `아티팩트 사용 불가: ${status.ok ? "" : status.reason} — 코퍼스를 고쳤으면 npm run docent:embed 를 다시 실행한다`);
});

test("아티팩트에는 벡터와 메타데이터만 있다 — 키·경로·본문이 없다", { skip: artifact === null }, () => {
  const raw = JSON.stringify(artifact);
  // 단어 경계: 조각 ID "bcos-ta|sk-centric…" 같은 부분 문자열은 키가 아니다.
  assert.doesNotMatch(raw, /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}|OPENAI_API_KEY|Bearer |[A-Za-z]:\\\\|\/Users\//);
  const a = artifact as { records: Array<Record<string, unknown>> };
  for (const r of a.records) assert.deepEqual(Object.keys(r).sort(), ["chunkId", "vector"]);
});
