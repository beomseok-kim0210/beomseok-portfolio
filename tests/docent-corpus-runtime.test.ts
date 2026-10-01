// 큐레이션 스냅샷이 활성일 때 런타임 연결 — 엔티티 등록부·검색·근거 라벨·임베딩 stale 폴백.
//
// node --test 는 파일마다 프로세스가 따로라, 여기서 DOCENT_CORPUS_SNAPSHOT 을 합성 스냅샷으로 가리킨 뒤 모듈을 불러온다.
// 다른 테스트 파일(레거시 코퍼스)에는 영향이 없다. 내용은 전부 합성이다.
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import { buildSnapshot } from "@/lib/docent/corpus/build";
import type { CanonicalChunk } from "@/lib/docent/corpus/schema";

const NOTION = { sourceType: "notion" as const, sourceRef: "Demo 정본", notionPageId: "0000demo", lastVerifiedAt: "2026-10-01" };
const c = (id: string, entity: string, factType: CanonicalChunk["factType"], content: string, extra: Partial<CanonicalChunk> = {}): CanonicalChunk => ({
  id, entityId: entity, projectId: entity, factType, status: "current", public: true, title: `${entity} ${factType}`, content, provenance: [NOTION], ...extra,
});

const { snapshot, report } = buildSnapshot({
  schemaVersion: 1,
  packageId: "synthetic-runtime",
  entities: [
    { id: "zeta", canonicalName: "Zeta Lab", aliases: ["zeta", "제타"], type: "project", status: "current", public: true },
    { id: "omega", canonicalName: "Omega Kit", aliases: ["omega", "오메가"], type: "project", status: "current", public: true },
    { id: "theta", canonicalName: "Theta App", aliases: ["theta", "세타"], type: "project", status: "current", public: true },
  ],
  chunks: [
    c("zeta:overview:main", "zeta", "overview", "합성: 제타 랩은 양자 큐브를 정렬하는 가짜 실험실 도구다."),
    c("zeta:technology:main", "zeta", "technology", "합성: 제타 랩은 FluxDB 와 PrismQueue 를 쓴다."),
    c("zeta:architecture:next", "zeta", "architecture", "합성: 제타 랩은 다음 단계에 WarpCache 를 붙일 계획이다.", { status: "planned" }),
    c("omega:overview:main", "omega", "overview", "합성: 오메가 키트는 가짜 센서 묶음이다."),
    c("theta:overview:main", "theta", "overview", "합성: 세타 앱은 가짜 일정 앱이다."),
  ],
});
assert.ok(snapshot, JSON.stringify(report.errors));
const dir = mkdtempSync(path.join(tmpdir(), "dd-corpus-"));
const file = path.join(dir, "docent-corpus.json");
writeFileSync(file, JSON.stringify(snapshot));
process.env.DOCENT_CORPUS_SNAPSHOT = file;
delete process.env.DOCENT_CORPUS;

const { getCorpus } = await import("@/lib/docent/rag/corpus");
const { entityRegistry, projectRegistry } = await import("@/lib/docent/corpus/registry");
const { detectProjects, retrieve } = await import("@/lib/docent/rag/retrieval");
const { buildGroundedSystemPrompt, projectInventory } = await import("@/lib/docent/rag/grounding");
const { retrieveForChat } = await import("@/lib/docent/rag/hybrid");
const { denseIndexFromArtifact, readEmbeddingArtifact } = await import("@/lib/docent/rag/embeddings");
const { createHashingEmbedder } = await import("@/lib/docent/rag/mockEmbedder");

test("스냅샷이 있으면 런타임 코퍼스와 엔티티 등록부가 스냅샷에서 온다 — 프로젝트 수를 코드가 가정하지 않는다", () => {
  assert.equal(getCorpus().length, snapshot.chunks.length);
  assert.ok(getCorpus().every((x) => x.sourceType === "curated_corpus"));
  assert.deepEqual(projectRegistry().map((p) => p.id), ["zeta", "omega", "theta"]);
  assert.equal(entityRegistry().length, 4, "프로젝트 3 + 목록 조각의 site 엔티티");
  // 레거시 프로젝트 이름은 더 이상 엔티티가 아니다
  assert.deepEqual(detectProjects("ARMI가 뭔데?"), []);
  assert.deepEqual(detectProjects("제타 랩 설명해줘"), ["zeta"]);
  assert.deepEqual(detectProjects("omega랑 theta 차이"), ["omega", "theta"]);
});

test("검색·프롬프트가 스냅샷 엔티티로 동작한다 — 목록은 스냅샷 프로젝트 3개", () => {
  const r = retrieve("제타는 어떤 기술을 써?", null, { topK: 8 });
  assert.equal(r.activeProject, "zeta");
  assert.ok(r.results.every((x) => x.chunk.projectId === "zeta"));
  const inventory = projectInventory();
  assert.equal(inventory.split("\n").length, 3);
  assert.match(inventory, /- Zeta Lab: 합성: 제타 랩은/);
});

test("planned 조각은 근거에 상태 라벨이 붙고, 프롬프트가 현재 사실처럼 말하지 말라고 한다", () => {
  const r = retrieve("제타 랩 설명해줘", null, { topK: 8 });
  const prompt = buildGroundedSystemPrompt(null, r);
  assert.ok(r.results.some((x) => x.chunk.id === "zeta:architecture:next"));
  assert.match(prompt, /\(Zeta Lab · architecture · 상태: 계획\(planned\)\)/);
  assert.match(prompt, /상태: 과거\/실험\/계획" 이 붙은 내용은 지금 구현된 사실처럼 말하지 않습니다/);
  assert.doesNotMatch(prompt, /\(Zeta Lab · overview · 상태/);
});

test("코퍼스가 바뀌면 기존 임베딩 아티팩트는 stale — 하이브리드는 BM25 로 내려간다(조용히 옛 벡터를 쓰지 않는다)", async () => {
  const artifact = readEmbeddingArtifact();
  if (artifact) {
    assert.deepEqual(denseIndexFromArtifact(artifact, getCorpus()), { ok: false, reason: "stale_artifact" });
  }
  const embedder = createHashingEmbedder(1536, "text-embedding-3-small");
  const r = await retrieveForChat("제타 랩 설명해줘", null, [], { embedder });
  assert.equal(r.hybridMode, "bm25_fallback");
  assert.ok(r.fallbackReason === "stale_artifact" || r.fallbackReason === "missing_artifact", String(r.fallbackReason));
  assert.equal(embedder.calls, 0);
  assert.equal(r.retrieval.activeProject, "zeta");
});
