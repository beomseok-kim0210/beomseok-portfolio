// 큐레이션 코퍼스 인프라 — 스키마·검증·정규화·중복 제거·비밀값·레지스트리·스냅샷 → 검색 조각.
//
// 픽스처는 전부 합성(synthetic)이다: "demo-alpha" 같은 가짜 엔티티와 "합성 테스트 문장" 뿐. 실제 포트폴리오 사실은
// 큐레이션 패키지로만 들어온다.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { buildSnapshot, normalizeText, snapshotToRagChunks } from "@/lib/docent/corpus/build";
import {
  CHUNK_STATUSES,
  ENTITY_TYPES,
  FACT_TYPES,
  PORTFOLIO_INVENTORY_CHUNK_ID,
  PROVENANCE_SOURCE_TYPES,
  type CanonicalChunk,
  type CuratedCorpusPackage,
} from "@/lib/docent/corpus/schema";
import { findSecrets } from "@/lib/docent/corpus/secrets";
import { validatePackage } from "@/lib/docent/corpus/validate";
import { getCorpus } from "@/lib/docent/rag/corpus";
import { corpusFingerprint } from "@/lib/docent/rag/embeddings";

const NOTION = { sourceType: "notion" as const, sourceRef: "Demo 정본 페이지", notionPageId: "0000demo", notionSection: "Evidence", lastVerifiedAt: "2026-10-01" };
const GITHUB = { sourceType: "github" as const, sourceRef: "demo/repo", path: "src/demo.ts", sourceRevision: "abc1234" };

function chunk(over: Partial<CanonicalChunk> = {}): CanonicalChunk {
  return {
    id: "demo-alpha:overview:main",
    entityId: "demo-alpha",
    projectId: "demo-alpha",
    factType: "overview",
    status: "current",
    public: true,
    title: "합성 개요",
    content: "합성 테스트 문장: 데모 알파는 검증용 가짜 프로젝트다.",
    provenance: [NOTION],
    ...over,
  };
}

function pkg(chunks: CanonicalChunk[] = [chunk()], over: Partial<CuratedCorpusPackage> = {}): CuratedCorpusPackage {
  return {
    schemaVersion: 1,
    packageId: "synthetic-test",
    entities: [
      { id: "demo-alpha", canonicalName: "Demo Alpha", aliases: ["demo alpha", "데모알파"], type: "project", status: "current", public: true, pathname: "/projects/demo-alpha" },
      { id: "demo-beta", canonicalName: "Demo Beta", aliases: ["데모베타"], type: "project", status: "current", public: true },
      { id: "demo-hidden", canonicalName: "Demo Hidden", aliases: ["데모히든"], type: "project", status: "current", public: false },
      { id: "demo-person", canonicalName: "Demo Person", aliases: ["데모사람"], type: "person", status: "current", public: true },
    ],
    chunks,
    ...over,
  };
}

const codes = (input: unknown) => validatePackage(input).errors.map((e) => e.code);

/* ------------------------------------------------------------- 스키마 ↔ JSON Schema */

test("JSON Schema(docs/rag/curated-corpus.schema.json)와 코드의 열거형이 같다", () => {
  const schema = JSON.parse(readFileSync("docs/rag/curated-corpus.schema.json", "utf8"));
  assert.deepEqual(schema.$defs.chunk.properties.factType.enum, [...FACT_TYPES]);
  assert.deepEqual(schema.$defs.status.enum, [...CHUNK_STATUSES]);
  assert.deepEqual(schema.$defs.provenance.properties.sourceType.enum, [...PROVENANCE_SOURCE_TYPES]);
  assert.deepEqual(schema.$defs.entity.properties.type.enum, [...ENTITY_TYPES]);
  assert.deepEqual(schema.$defs.chunk.required.sort(), ["content", "entityId", "factType", "id", "provenance", "public", "status", "title"]);
});

test("핸드오프 템플릿은 자리표시자뿐이다 — 내용이 들어 있지 않고, 그대로 넣으면 검증에서 막힌다", () => {
  const manifest = JSON.parse(readFileSync("docs/rag/curated-corpus-template/manifest.json", "utf8"));
  const chunks = JSON.parse(readFileSync("docs/rag/curated-corpus-template/chunks/entity-id.json", "utf8"));
  for (const c of chunks) assert.match(c.content, /^<.*>$/);
  assert.equal(validatePackage({ ...manifest, chunks }).ok, false);
});

/* ------------------------------------------------------------- 정상 빌드 */

test("정상 패키지는 스냅샷이 된다 — 정규화, 파생 목록 조각, 비공개·deprecated 제외", () => {
  const input = pkg([
    chunk({ content: "  합성 테스트 문장:\t데모 알파는   검증용\r\n\r\n\r\n가짜 프로젝트다.  " }),
    chunk({ id: "demo-beta:overview:main", entityId: "demo-beta", projectId: "demo-beta", content: "합성 테스트 문장: 데모 베타 개요.", provenance: [GITHUB] }),
    chunk({ id: "demo-beta:rationale:old", entityId: "demo-beta", projectId: "demo-beta", factType: "rationale", status: "deprecated", content: "합성: 예전 결정." }),
    chunk({ id: "demo-alpha:result:private", factType: "result", public: false, content: "합성: 비공개 결과." }),
    chunk({ id: "demo-hidden:overview:main", entityId: "demo-hidden", projectId: "demo-hidden", public: false, content: "합성: 숨김 프로젝트." }),
    chunk({ id: "demo-person:profile:intro", entityId: "demo-person", projectId: undefined, factType: "profile", content: "합성: 사람 소개." }),
  ]);
  const { report, snapshot, privateStats } = buildSnapshot(input, "2026-10-01T00:00:00.000Z");
  assert.ok(report.ok, JSON.stringify(report.errors));
  assert.ok(snapshot);
  const ids = snapshot.chunks.map((c) => c.id);
  assert.deepEqual(ids, ["demo-alpha:overview:main", "demo-beta:overview:main", "demo-person:profile:intro", PORTFOLIO_INVENTORY_CHUNK_ID].sort());
  assert.equal(snapshot.chunks.find((c) => c.id === "demo-alpha:overview:main")!.content, "합성 테스트 문장: 데모 알파는 검증용\n\n가짜 프로젝트다.");
  // 목록 조각이 속할 site 엔티티(별칭 없음)가 함께 들어간다
  assert.deepEqual(snapshot.entities.map((e) => e.id), ["demo-alpha", "demo-beta", "demo-person", "portfolio"]);
  assert.deepEqual(snapshot.entities.find((e) => e.id === "portfolio")?.aliases, []);
  // 공개 스냅샷에는 비공개 개수를 싣지 않는다(빌드 콘솔 전용 privateStats 에만)
  assert.deepEqual(snapshot.excluded, { deprecated: 1, duplicateContent: 0 });
  assert.deepEqual(privateStats, { notPublic: 2, withheld: [] });
  // 파생 목록 조각: 큐레이션된 개요 본문을 그대로 잇는다(새 문장은 "N개입니다: 이름들" 뿐), 출처 = derived
  const inv = snapshot.chunks.find((c) => c.id === PORTFOLIO_INVENTORY_CHUNK_ID)!;
  assert.match(inv.content, /^이 포트폴리오에 기록된 프로젝트는 2개입니다: Demo Alpha, Demo Beta\./);
  assert.ok(inv.content.includes("데모 베타 개요"));
  assert.equal(inv.provenance[0].sourceType, "derived");
  // 같은 입력 → 같은 해시(결정론)
  assert.equal(buildSnapshot(input, "x").snapshot!.sourceHash, snapshot.sourceHash);
});

test("같은 엔티티·같은 상태의 같은 본문은 하나만 남긴다(경고), 상태가 다르면 남긴다", () => {
  const dup = pkg([
    chunk(),
    chunk({ id: "demo-alpha:overview:copy", content: "합성 테스트 문장: 데모 알파는 검증용 가짜 프로젝트다." }),
    chunk({ id: "demo-alpha:overview:history", status: "historical", content: "합성 테스트 문장: 데모 알파는 검증용 가짜 프로젝트다." }),
  ]);
  const { report, snapshot } = buildSnapshot(dup);
  assert.ok(report.warnings.some((w) => w.code === "duplicate_content" && w.at === "chunk:demo-alpha:overview:copy"));
  assert.ok(snapshot!.chunks.some((c) => c.id === "demo-alpha:overview:history"));
  assert.equal(snapshot!.excluded.duplicateContent, 1);
});

/* ------------------------------------------------------------- 실패해야 하는 것 */

test("중복 ID · 빈 내용 · 모르는 엔티티/프로젝트 · 출처 없음 · 잘못된 status/factType 은 실패한다", () => {
  assert.ok(codes(pkg([chunk(), chunk()])).includes("duplicate_id"));
  assert.ok(codes(pkg([chunk({ content: "   " })])).includes("empty_content"));
  assert.ok(codes(pkg([chunk({ entityId: "ghost" })])).includes("unknown_entity"));
  assert.ok(codes(pkg([chunk({ projectId: "demo-person" })])).includes("unknown_project"), "person 엔티티는 projectId 가 될 수 없다");
  assert.ok(codes(pkg([chunk({ provenance: [] })])).includes("missing_provenance"));
  assert.ok(codes(pkg([chunk({ provenance: undefined as unknown as CanonicalChunk["provenance"] })])).includes("missing_provenance"));
  assert.ok(codes(pkg([chunk({ status: "implemented" as never })])).includes("invalid_status"));
  assert.ok(codes(pkg([chunk({ factType: "fact" as never })])).includes("invalid_fact_type"));
  assert.ok(codes(pkg([chunk({ id: "Bad ID!" })])).includes("invalid_id"));
  assert.ok(codes({ ...pkg(), schemaVersion: 2 }).includes("schema_version"));
  assert.ok(codes({ schemaVersion: 1 }).includes("entities_missing"));
  assert.equal(buildSnapshot(pkg([chunk({ content: "" })])).snapshot, null, "오류가 있으면 스냅샷을 만들지 않는다");
});

test("출처 형식: notion 은 페이지 ID·URL, github 는 경로, 날짜는 ISO, 로컬 절대 경로 금지", () => {
  assert.ok(codes(pkg([chunk({ provenance: [{ sourceType: "notion", sourceRef: "제목만" }] })])).includes("notion_ref"));
  assert.equal(codes(pkg([chunk({ provenance: [{ sourceType: "notion", sourceRef: "https://www.notion.so/demo-0000" }] })])).length, 0);
  assert.ok(codes(pkg([chunk({ provenance: [{ sourceType: "github", sourceRef: "repo" }] })])).includes("github_ref"));
  assert.ok(codes(pkg([chunk({ provenance: [{ ...NOTION, lastVerifiedAt: "어제" }] })])).includes("invalid_date"));
  assert.ok(codes(pkg([chunk({ provenance: [{ ...GITHUB, path: "C:\\Users\\me\\repo\\a.ts" }] })])).includes("local_path"));
  assert.ok(codes(pkg([chunk({ provenance: [{ sourceType: "gossip" as never, sourceRef: "x" }] })])).includes("invalid_source_type"));
  assert.ok(codes(pkg([chunk({ content: "경로 /Users/me/secret.txt 참조" })])).includes("local_path"));
});

test("비공개 엔티티 아래 public 조각은 실패, public=false 조각은 경고와 함께 빠진다", () => {
  assert.ok(codes(pkg([chunk({ id: "demo-hidden:x", entityId: "demo-hidden", projectId: "demo-hidden" })])).includes("public_under_private_entity"));
  const r = validatePackage(pkg([chunk({ public: false })]));
  assert.ok(r.ok && r.warnings.some((w) => w.code === "not_public"));
});

test("엔티티: 별칭이 다른 엔티티와 겹치면 실패, 잘못된 type/status 도 실패", () => {
  const bad = pkg();
  bad.entities[1] = { ...bad.entities[1], aliases: ["데모알파"] };
  assert.ok(codes(bad).includes("alias_conflict"));
  const badType = pkg();
  badType.entities[0] = { ...badType.entities[0], type: "app" as never };
  assert.ok(codes(badType).includes("invalid_entity_type"));
});

test("current 가 아닌 조각에 lastVerifiedAt 이 없으면 경고", () => {
  const r = validatePackage(pkg([chunk({ status: "planned", provenance: [GITHUB] })]));
  assert.ok(r.ok && r.warnings.some((w) => w.code === "unverified_noncurrent"));
});

/* ------------------------------------------------------------- 비밀값 */

test("비밀값처럼 보이는 문자열은 빌드를 막는다 — 값은 보고서에 남기지 않는다", () => {
  const fake = {
    openai: `sk-proj-${"A".repeat(24)}`,
    bearer: `Bearer ${"b".repeat(32)}`,
    env: `OPENAI_API_KEY=${"x".repeat(12)}`,
    pem: "-----BEGIN PRIVATE KEY-----",
    gh: `ghp_${"z".repeat(36)}`,
    url: "postgres://admin:hunter2pass@db.example.com/x",
  };
  for (const [name, value] of Object.entries(fake)) {
    const r = validatePackage(pkg([chunk({ content: `합성 문장 ${value} 끝` })]));
    const hit = r.errors.find((e) => e.code === "secret_like");
    assert.ok(hit, name);
    assert.ok(!hit.message.includes(value), `${name}: 보고서에 값이 남았다`);
  }
  // 출처 안의 비밀값도 잡는다
  assert.ok(codes(pkg([chunk({ provenance: [{ ...GITHUB, sourceRevision: fake.openai }] })])).includes("secret_like"));
});

test("비밀값 오탐은 allowlist 로 그 조각의 그 문자열만 허용한다", () => {
  const example = "OPENAI_API_KEY=your-key-here";
  const blocked = validatePackage(pkg([chunk({ content: `설정 예: ${example}` })]));
  assert.equal(blocked.ok, false);
  const allowed = validatePackage(pkg([chunk({ content: `설정 예: ${example}` })], { secretAllowlist: [{ chunkId: "demo-alpha:overview:main", match: example, reason: "문서의 자리표시자 예시" }] }));
  assert.equal(allowed.ok, true, JSON.stringify(allowed.errors));
  // 다른 조각에는 적용되지 않는다
  const other = validatePackage(pkg([chunk(), chunk({ id: "demo-alpha:x", content: `예: ${example}` })], { secretAllowlist: [{ chunkId: "demo-alpha:overview:main", match: example, reason: "x" }] }));
  assert.equal(other.ok, false);
  // 사유 없는 허용은 받지 않는다
  assert.ok(codes(pkg([chunk()], { secretAllowlist: [{ chunkId: "demo-alpha:overview:main", match: "x", reason: "" }] })).includes("invalid_allowlist"));
});

test("지금 런타임 코퍼스(레거시)에도 비밀값이 없다", () => {
  for (const c of getCorpus()) assert.deepEqual(findSecrets(`${c.title}\n${c.text}`), [], c.id);
});

/* ------------------------------------------------------------- 스냅샷 → 검색 조각 */

test("스냅샷 조각은 검색 조각으로 바뀐다 — factType 섹션, 상태, 원 출처는 클라이언트 이름에 싣지 않는다", () => {
  const { snapshot } = buildSnapshot(pkg([
    chunk(),
    chunk({ id: "demo-alpha:rationale:why", factType: "rationale", content: "합성: 결정 이유." }),
    chunk({ id: "demo-alpha:evidence:m1", factType: "evidence", content: "합성: 측정값 1." }),
    chunk({ id: "demo-alpha:evaluation:e1", factType: "evaluation", content: "합성: 측정에 대한 평가." }),
    chunk({ id: "demo-alpha:architecture:next", factType: "architecture", status: "planned", content: "합성: 계획된 구조.", provenance: [{ ...NOTION }] }),
  ]));
  const rag = snapshotToRagChunks(snapshot!);
  const by = (id: string) => rag.find((c) => c.id === id)!;
  assert.equal(by("demo-alpha:rationale:why").section, "decision");
  assert.equal(by("demo-alpha:evidence:m1").section, "metric");
  assert.equal(by("demo-alpha:evaluation:e1").section, "evaluation", "평가와 측정은 다른 섹션");
  assert.equal(by("demo-alpha:architecture:next").status, "planned");
  // 상태로 순위를 깎지 않는다 — 계획을 묻는 질문에 그 근거가 상위에 와야 모델이 "계획" 임을 본다. 의미는 라벨이 전달한다.
  assert.equal(by("demo-alpha:architecture:next").priority, by("demo-alpha:overview:main").priority);
  for (const c of rag) {
    assert.match(c.sourceId, /^curated:/);
    assert.ok(!c.sourceId.includes("notion"), c.sourceId);
    assert.equal(c.sourceType, "curated_corpus");
  }
});

/* ------------------------------------------------------------- 공개 스냅샷 출처 최소화 */

// 합성 Notion 위치(실제 페이지가 아니다) — 형식만 실제와 같다.
const FAKE_PAGE = "0123456789abcdef0123456789abcdef";
const FAKE_NOTION = { sourceType: "notion" as const, sourceRef: `https://app.notion.com/p/${FAKE_PAGE}`, notionSection: "Evaluation", sourceTitle: "합성 페이지 제목" };
const FAKE_GITHUB = { sourceType: "github" as const, sourceRef: "https://github.com/demo/repo/blob/main/src/demo.ts", repository: "demo/repo", path: "src/demo.ts", sourceRevision: "main@0441df9518ffd5ab6d54b490c0f72880a2948f6d" };

test("공개 스냅샷에는 원 출처 위치가 없다 — 불투명 sourceKey 만, 같은 출처는 같은 키", () => {
  const { report, snapshot } = buildSnapshot(pkg([
    chunk({ provenance: [FAKE_NOTION, FAKE_GITHUB] }),
    chunk({ id: "demo-alpha:result:r1", factType: "result", content: "합성: 결과.", provenance: [FAKE_NOTION] }),
  ], { sourceMeta: { corpusVersion: "synthetic-v5", sourceSnapshot: { db: `collection://${FAKE_PAGE.slice(0, 8)}-0000-0000-0000-000000000000` }, sourceCorrectionsNeeded: [{ issue: "정본 DB 에는 3개" }] } }));
  assert.ok(report.ok, JSON.stringify(report.errors));
  const json = JSON.stringify(snapshot);
  for (const bad of ["notion.com", "collection://", FAKE_PAGE, "합성 페이지 제목", "github.com", "sourceRef", "정본 DB"]) assert.ok(!json.includes(bad), bad);
  const a = snapshot!.chunks.find((c) => c.id === "demo-alpha:overview:main")!;
  const b = snapshot!.chunks.find((c) => c.id === "demo-alpha:result:r1")!;
  assert.match(a.provenance[0].sourceKey, /^notion:[0-9a-f]{16}$/);
  assert.equal(a.provenance[0].sourceKey, b.provenance[0].sourceKey, "같은 원 출처 → 같은 키");
  assert.equal(a.provenance[0].notionSection, "Evaluation");
  // GitHub 은 공개 저장소의 이름·경로·커밋만(URL 없음)
  assert.deepEqual({ ...a.provenance[1], sourceKey: "-" }, { sourceType: "github", sourceKey: "-", repository: "demo/repo", path: "src/demo.ts", sourceRevision: FAKE_GITHUB.sourceRevision });
  // 감사 메타는 판(版) 식별만
  assert.deepEqual(snapshot!.sourceMeta, { corpusVersion: "synthetic-v5" });
  // 런타임 재검사(공개 스냅샷 형식)를 통과하고, 원 출처가 남은 스냅샷은 막는다
  assert.ok(validatePackage({ schemaVersion: 1, entities: snapshot!.entities, chunks: snapshot!.chunks }, { publicSnapshot: true }).ok);
  const tampered = { ...snapshot!.chunks[0], provenance: [{ sourceType: "notion", sourceKey: "notion:abc", note: FAKE_NOTION.sourceRef }] };
  const errs = validatePackage({ schemaVersion: 1, entities: snapshot!.entities, chunks: [tampered] }, { publicSnapshot: true }).errors.map((e) => e.code);
  assert.ok(errs.includes("public_locator"), errs.join(","));
});

test("공개 조각 본문에 원 출처 위치가 있으면 스냅샷을 쓰지 않는다", () => {
  const { report, snapshot } = buildSnapshot(pkg([chunk({ content: `합성: 자세한 건 notion.so/${FAKE_PAGE} 참고.` })]));
  assert.equal(snapshot, null);
  assert.ok(report.errors.some((e) => e.code === "public_snapshot_leak"));
});

test("코퍼스가 바뀌면 임베딩 지문이 바뀐다 — 옛 아티팩트는 stale 로 잡힌다", () => {
  const { snapshot } = buildSnapshot(pkg());
  const legacy = corpusFingerprint(getCorpus(), "text-embedding-3-small", null);
  const curated = corpusFingerprint(snapshotToRagChunks(snapshot!), "text-embedding-3-small", null);
  assert.notEqual(legacy, curated);
});

test("정규화는 뜻을 바꾸지 않는다", () => {
  assert.equal(normalizeText("  가\t나   다 \r\n\r\n\r\n\r\n라  "), "가 나 다\n\n라");
  assert.equal(normalizeText("é"), "é".normalize("NFC"));
});
