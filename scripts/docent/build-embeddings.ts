/**
 * 문서 임베딩 아티팩트 생성 — 명시적으로 실행할 때만 API 를 부른다.
 *
 *   npm run docent:embed             코퍼스 전체를 임베딩해 src/generated/docent-embeddings.json 을 쓴다
 *   npm run docent:embed -- --check  지금 코퍼스·설정과 아티팩트가 맞는지 확인만 한다(불일치면 exit 1)
 *
 * 필요한 환경: OPENAI_API_KEY (.env.local 에 두면 npm 스크립트가 읽는다).
 * 선택: DOCENT_EMBEDDING_MODEL (기본 text-embedding-3-small), DOCENT_EMBEDDING_DIMENSIONS.
 *
 * 코퍼스(src/data/*, knowledge/*.md)를 고치면 아티팩트의 지문이 어긋난다. 그 상태로 배포하면 런타임은
 * dense 를 끄고 BM25 로만 답한다(서버 로그 hybrid_mode=bm25_fallback reason=stale_artifact).
 * tests/docent-embeddings.test.ts 도 같은 불일치를 실패로 잡는다. 코퍼스를 고쳤으면 이 스크립트를 다시 돌린다.
 *
 * 키 값은 출력하지 않는다. 비용: text-embedding-3-small 기준 코퍼스 전체 ≈ 수만 토큰(1 센트 미만).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { getCorpus } from "@/lib/docent/rag/corpus";
import {
  EMBEDDING_ARTIFACT_PATH,
  corpusFingerprint,
  createOpenAIEmbedder,
  denseIndexFromArtifact,
  documentEmbeddingText,
  encodeVector,
  readEmbeddingArtifact,
  resolveEmbeddingDimensions,
  resolveEmbeddingModel,
  type EmbeddingArtifact,
} from "@/lib/docent/rag/embeddings";

const BATCH = 96;
const root = path.resolve(import.meta.dirname, "..", "..");
const chunks = getCorpus();
const model = resolveEmbeddingModel();
const requestedDimensions = resolveEmbeddingDimensions();
const hash = corpusFingerprint(chunks, model, requestedDimensions);

if (process.argv.includes("--check")) {
  const artifact = readEmbeddingArtifact(root);
  if (artifact === null) {
    console.error(`[docent:embed] 아티팩트 없음: ${EMBEDDING_ARTIFACT_PATH} — npm run docent:embed 로 만든다.`);
    process.exit(1);
  }
  const status = denseIndexFromArtifact(artifact, chunks);
  if (!status.ok) {
    console.error(`[docent:embed] 아티팩트 사용 불가: ${status.reason} (현재 코퍼스 ${chunks.length} 조각, 모델 ${model})`);
    process.exit(1);
  }
  console.log(`[docent:embed] OK — ${status.index.size} 조각, 모델 ${status.index.model}, ${status.index.dimensions} 차원, 지문 ${hash.slice(0, 12)}`);
  process.exit(0);
}

if (!process.env.OPENAI_API_KEY) {
  console.error("[docent:embed] OPENAI_API_KEY 가 없다. .env.local 에 넣거나 환경변수로 준 뒤 다시 실행한다.");
  process.exit(2);
}

// 문서 임베딩은 질문 임베딩보다 오래 걸려도 된다 — 타임아웃을 넉넉히 준다.
const embedder = createOpenAIEmbedder({ ...process.env, DOCENT_EMBEDDING_TIMEOUT_MS: process.env.DOCENT_EMBEDDING_BUILD_TIMEOUT_MS ?? "60000" });
const records: EmbeddingArtifact["records"] = [];
let dimensions = 0;
const t0 = Date.now();
for (let i = 0; i < chunks.length; i += BATCH) {
  const batch = chunks.slice(i, i + BATCH);
  const vectors = await embedder.embed(batch.map(documentEmbeddingText));
  batch.forEach((c, j) => {
    dimensions = vectors[j].length;
    records.push({ chunkId: c.id, vector: encodeVector(vectors[j]) });
  });
  console.log(`[docent:embed] ${Math.min(i + BATCH, chunks.length)}/${chunks.length}`);
}

const artifact: EmbeddingArtifact = {
  version: 1,
  embeddingModel: model,
  dimensions,
  requestedDimensions,
  corpusHash: hash,
  chunkCount: chunks.length,
  generatedAt: new Date().toISOString(),
  records: records.sort((a, b) => a.chunkId.localeCompare(b.chunkId)),
};
const check = denseIndexFromArtifact(artifact, chunks);
if (!check.ok) {
  console.error(`[docent:embed] 만든 아티팩트가 검증을 통과하지 못했다: ${check.reason}`);
  process.exit(1);
}
const out = path.join(root, EMBEDDING_ARTIFACT_PATH);
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(artifact)}\n`);
console.log(`[docent:embed] 완료 — ${records.length} 조각 × ${dimensions} 차원, 모델 ${model}, ${Date.now() - t0} ms → ${EMBEDDING_ARTIFACT_PATH}`);
