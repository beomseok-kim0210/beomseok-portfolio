/**
 * 큐레이션 패키지 → 런타임 스냅샷 → 검색 조각(RagChunk).
 *
 *   validatePackage → normalize → dedupe → (public · deprecated 제외) → 파생 목록 조각 → CorpusSnapshot
 *   CorpusSnapshot → snapshotToRagChunks → BM25 색인 + 문서 임베딩(지문은 조각 텍스트로 다시 계산)
 *
 * 이 모듈은 내용을 만들지 않는다. 유일한 파생물은 "포트폴리오 프로젝트 목록" 조각인데, 각 프로젝트의 큐레이션된
 * current 개요 조각 본문을 그대로 이어 붙인 것이다(새 문장 없음, 출처 = derived + 원 조각 ID).
 */
import { createHash } from "node:crypto";

import type { RagChunk, Section } from "@/lib/docent/rag/types";

import {
  CORPUS_SCHEMA_VERSION,
  PORTFOLIO_INVENTORY_CHUNK_ID,
  RUNTIME_STATUSES,
  SECTION_FOR_FACT_TYPE,
  type CanonicalChunk,
  type CorpusSnapshot,
  type CuratedCorpusPackage,
  type EntityRegistryEntry,
  type Provenance,
  type PublicChunk,
  type PublicProvenance,
} from "./schema";
import { PRIVATE_LOCATOR_RE, publicSnapshotLeaks } from "./locators";
import { validatePackage, type ValidationReport } from "./validate";

export { publicSnapshotLeaks };

export const SNAPSHOT_SOURCE_PATH = "src/generated/docent-corpus.json";

/** 유니코드 NFC, 줄 끝 정리, 줄 안 공백 하나로, 빈 줄은 하나로. 뜻은 바꾸지 않는다. */
export function normalizeText(s: string): string {
  return s
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[\t  　]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeChunk(c: CanonicalChunk): CanonicalChunk {
  return {
    ...c,
    title: normalizeText(c.title),
    content: normalizeText(c.content),
    tags: c.tags ? [...new Set(c.tags.map((t) => normalizeText(t)).filter(Boolean))] : undefined,
  };
}

function normalizeEntity(e: EntityRegistryEntry): EntityRegistryEntry {
  return {
    ...e,
    canonicalName: normalizeText(e.canonicalName),
    aliases: [...new Set(e.aliases.map((a) => normalizeText(a).toLowerCase()).filter(Boolean))],
  };
}

const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

export interface BuildResult {
  report: ValidationReport;
  snapshot: CorpusSnapshot | null;
  /** 비공개 관련 집계 — 빌드 콘솔 전용. 공개 스냅샷에는 싣지 않는다(비공개 프로젝트의 존재·개수 추론 차단). */
  privateStats?: { notPublic: number; withheld: Array<{ id: string; reason: string }> };
}

/* ------------------------------------------------------------- 공개 스냅샷 출처 최소화 */

/** 불투명 안정 키 — 같은 원 출처면 같은 키, 키에서 원 출처(URL·페이지 ID)를 되살릴 수 없다. */
export function opaqueSourceKey(p: Pick<Provenance, "sourceType" | "sourceRef" | "notionPageId">): string {
  return `${p.sourceType}:${sha256(`${p.sourceType}|${p.sourceRef}|${p.notionPageId ?? ""}`).slice(0, 16)}`;
}

/**
 * 원 출처 → 공개 출처. 답변 생성·감사에 필요한 최소만 남긴다: 출처 종류 · 불투명 키 · 절 이름 · 확인 날짜 · 원본 검증 표기.
 * GitHub 은 공개 저장소의 저장소 이름·상대 경로·커밋만(URL 은 뺀다). Notion 페이지 제목·메모·URL·페이지 ID 는 싣지 않는다.
 */
export function toPublicProvenance(p: Provenance): PublicProvenance {
  const out: PublicProvenance = { sourceType: p.sourceType, sourceKey: opaqueSourceKey(p) };
  if (p.notionSection) out.notionSection = p.notionSection;
  if (p.sourceType === "github") {
    if (p.repository) out.repository = p.repository;
    if (p.path) out.path = p.path;
    if (p.sourceRevision) out.sourceRevision = p.sourceRevision;
  }
  if (p.lastVerifiedAt) out.lastVerifiedAt = p.lastVerifiedAt;
  if (p.nativeVerification) out.nativeVerification = p.nativeVerification;
  return out;
}

function toPublicChunk(c: CanonicalChunk, derivedFrom?: string[]): PublicChunk {
  const provenance = c.provenance.map((p): PublicProvenance => (p.sourceType === "derived" ? { sourceType: p.sourceType, sourceKey: `derived:${c.id}`, derivedFrom } : toPublicProvenance(p)));
  return { ...c, provenance };
}

export function buildSnapshot(input: unknown, builtAt = new Date().toISOString()): BuildResult {
  const report = validatePackage(input);
  if (!report.ok) return { report, snapshot: null };
  const pkg = input as CuratedCorpusPackage;

  const entities = pkg.entities.map(normalizeEntity).filter((e) => e.public && e.status !== "deprecated");
  const entityIds = new Set(entities.map((e) => e.id));

  let notPublic = 0;
  let deprecated = 0;
  let duplicateContent = 0;
  // 비공개 엔티티의 이름·별칭 — 공개 조각 본문에 나오면 그 조각을 런타임에서 보류한다(내용은 고치지 않는다).
  // 공개 도슨트가 비공개 프로젝트를 먼저 언급하는 길을 데이터 단계에서 막는다.
  const privateNames = pkg.entities
    .filter((e) => !e.public)
    .flatMap((e) => [e.id, e.canonicalName, ...e.aliases])
    .map((n) => normalizeText(n).toLowerCase())
    .filter((n) => n.length >= 3);
  const withheld: Array<{ id: string; reason: string }> = [];
  const seenContent = new Map<string, string>();
  const chunks: CanonicalChunk[] = [];
  for (const raw of pkg.chunks) {
    const c = normalizeChunk(raw);
    if (!c.public || !entityIds.has(c.entityId) || (c.projectId && !entityIds.has(c.projectId))) { notPublic += 1; continue; }
    if (!RUNTIME_STATUSES.includes(c.status)) { deprecated += 1; continue; }
    const haystack = `${c.title}\n${c.content}\n${(c.tags ?? []).join(" ")}\n${c.notes ?? ""}`.toLowerCase();
    if (privateNames.some((n) => haystack.includes(n))) {
      withheld.push({ id: c.id, reason: "mentions_private_entity" });
      report.warnings.push({ at: `chunk:${c.id}`, code: "public_mentions_private_entity", message: "공개 조각이 비공개 엔티티 이름을 담고 있어 런타임에서 보류했다 — 원본에서 그 언급을 빼거나 공개 승인 후 다시 빌드" });
      continue;
    }
    // 같은 엔티티·같은 상태에서 본문이 같은 조각은 하나만 남긴다(앞의 것). 다른 상태(예: historical vs current)는
    // 같은 문장이어도 뜻이 달라서 남긴다.
    const key = `${c.entityId}\u0000${c.status}\u0000${c.content.toLowerCase()}`;
    const first = seenContent.get(key);
    if (first) {
      duplicateContent += 1;
      report.warnings.push({ at: `chunk:${c.id}`, code: "duplicate_content", message: `${first} 와 본문이 같아 뺐다` });
      continue;
    }
    seenContent.set(key, c.id);
    chunks.push(c);
  }

  // 목록 조각은 포트폴리오 사이트 자체에 속한다 — 등록부의 system/site 엔티티가 있으면 그것, 없으면 별칭 없는 site 엔티티.
  const siteEntity = entities.find((e) => e.type === "system" || e.type === "site");
  const derived = deriveInventoryChunk(entities, chunks, siteEntity?.id ?? "portfolio");
  const inventory = derived?.chunk;
  if (inventory) {
    chunks.push(inventory);
    if (!entities.some((e) => e.id === inventory.entityId)) {
      entities.push({ id: inventory.entityId, canonicalName: "포트폴리오", aliases: [], type: "site", status: "current", public: true });
    }
  }
  chunks.sort((a, b) => a.id.localeCompare(b.id));
  const publicChunks = chunks.map((c) => toPublicChunk(c, c.id === inventory?.id ? derived?.sources : undefined));

  const body = JSON.stringify({ entities, chunks: publicChunks });
  const snapshot: CorpusSnapshot = {
    schemaVersion: CORPUS_SCHEMA_VERSION,
    kind: "docent-corpus-snapshot",
    packageId: pkg.packageId ?? null,
    sourceHash: sha256(body),
    builtAt,
    entities,
    chunks: publicChunks,
    excluded: { deprecated, duplicateContent },
    sourceMeta: publicSourceMeta(pkg.sourceMeta, privateNames),
  };
  const privateStats = { notPublic, withheld };
  // 마지막 게이트: 공개 파일에 원 출처 위치(Notion URL·페이지 ID·collection://)나 비공개 이름이 남으면 쓰지 않는다.
  const leaks = publicSnapshotLeaks(JSON.stringify(snapshot), privateNames);
  if (leaks.length > 0) {
    report.errors.push({ at: "snapshot", code: "public_snapshot_leak", message: `공개 스냅샷에 원 출처 위치·비공개 이름이 남았다: ${leaks.slice(0, 5).join(", ")}` });
    report.ok = false;
    return { report, snapshot: null, privateStats };
  }
  return { report, snapshot, privateStats };
}

/**
 * 공개 스냅샷에 싣는 감사 메타 키 — 판(版) 식별만. 런타임은 감사 메타를 쓰지 않고, 충돌·수정 필요 목록·감사 집계는 이름을
 * 빼도 "정본 DB 의 프로젝트 수" 처럼 비공개 항목의 존재·개수를 간접으로 드러낸다(실측: v5 sourceCorrectionsNeeded).
 * 전체 감사 메타는 gitignore 된 큐레이션 원본에만 둔다.
 */
const PUBLIC_META_KEYS = ["schemaVersion", "corpusVersion", "generatedAt"];

/** 문자열 속 원 출처 위치를 불투명 참조로 바꾼다(같은 위치 → 같은 참조). */
function scrubLocators(x: unknown): unknown {
  if (typeof x === "string") return x.replace(PRIVATE_LOCATOR_RE, (m) => `[ref:${sha256(m).slice(0, 12)}]`);
  if (Array.isArray(x)) return x.map(scrubLocators);
  if (x && typeof x === "object") return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, scrubLocators(v)]));
  return x;
}

/**
 * 감사 메타(충돌·승격 대기·수정 필요 목록 등)를 스냅샷에 보존하되, 스냅샷은 공개 저장소에 커밋되는 파일이므로
 * 허용 키만 싣고, 원 출처 위치는 불투명 참조로 바꾸고, 비공개 엔티티를 언급하는 항목·필드는 흔적 없이 뺀다
 * (뺀 개수도 남기지 않는다 — 비공개 항목의 존재를 드러내지 않는다). 원본 전체는 gitignore 된 큐레이션 원본에 있다.
 */
function publicSourceMeta(meta: Record<string, unknown> | undefined, privateNames: string[]): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const mentions = (x: unknown) => privateNames.length > 0 && privateNames.some((n) => JSON.stringify(x ?? "").toLowerCase().includes(n));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (!PUBLIC_META_KEYS.includes(k)) continue;
    if (Array.isArray(v)) out[k] = scrubLocators(v.filter((item) => !mentions(item)));
    else if (!mentions(v)) out[k] = scrubLocators(v);
  }
  return out;
}

/** 각 공개 프로젝트의 첫 current 개요 조각을 이어 붙인 목록 조각. 개요가 없는 프로젝트는 이름만 싣는다. */
function deriveInventoryChunk(entities: EntityRegistryEntry[], chunks: CanonicalChunk[], ownerId: string): { chunk: CanonicalChunk; sources: string[] } | null {
  // 만든 프로젝트 목록 — system(포트폴리오 사이트 자체)·profile 은 넣지 않는다.
  const projects = entities.filter((e) => e.type === "project" && e.status === "current");
  if (projects.length === 0 || chunks.some((c) => c.id === PORTFOLIO_INVENTORY_CHUNK_ID)) return null;
  const sources: string[] = [];
  const lines = projects.map((p) => {
    const ov = chunks.find((c) => c.projectId === p.id && c.factType === "overview" && c.status === "current");
    if (ov) sources.push(ov.id);
    return ov ? `${p.canonicalName} — ${ov.content}` : p.canonicalName;
  });
  const chunk: CanonicalChunk = {
    id: PORTFOLIO_INVENTORY_CHUNK_ID,
    entityId: ownerId,
    factType: "overview",
    status: "current",
    public: true,
    title: "포트폴리오 프로젝트 전체 목록",
    content: `이 포트폴리오에 기록된 프로젝트는 ${projects.length}개입니다: ${projects.map((p) => p.canonicalName).join(", ")}. ${lines.join(" ")}`,
    tags: projects.map((p) => p.canonicalName),
    provenance: [{ sourceType: "derived", sourceRef: `개요 조각 결합: ${sources.join(", ") || "(개요 없음)"}` }],
    claimStatus: "derived_inventory",
    label: "inventory",
  };
  return { chunk, sources };
}

/* ------------------------------------------------------------- 스냅샷 → 검색 조각 */

// 상태로 순위를 깎지 않는다 — "V2 플레이할 수 있어?" 처럼 계획·실험을 묻는 질문에 그 근거가 상위에서 빠지면 모델이 "계획" 임을
// 볼 수 없다(실측: 계획 조각 8위). 상태의 의미는 근거 라벨("상태: 계획")과 프롬프트 규칙이 전달한다.
const STATUS_PRIORITY: Record<string, number> = { current: 1, historical: 1, experimental: 1, planned: 1 };
/** 큐레이션 우선순위 → 출처 가중치(검색 점수에 곱한다). 상태 가중치와 곱한다. */
const CURATED_PRIORITY: Record<string, number> = { high: 1, normal: 0.92, low: 0.8 };

function entityTypeFor(c: Pick<CanonicalChunk, "factType" | "projectId">, entity: EntityRegistryEntry | undefined): RagChunk["entityType"] {
  if (entity?.type === "profile") return c.factType === "skill" ? "skill" : "profile";
  if (c.projectId) {
    if (c.factType === "rationale") return "project_decision";
    if (c.factType === "evidence" || c.factType === "evaluation") return "project_metric";
    if (c.factType === "troubleshooting") return "project_troubleshooting";
    if (c.factType === "devlog") return "devlog";
    return "project";
  }
  if (c.factType === "skill") return "skill";
  if (c.factType === "journey") return "experience";
  if (entity?.type === "topic") return "knowledge";
  return "profile";
}

export function snapshotToRagChunks(snapshot: CorpusSnapshot): RagChunk[] {
  const byId = new Map(snapshot.entities.map((e) => [e.id, e]));
  return snapshot.chunks.map((c) => {
    const entity = byId.get(c.entityId);
    const project = c.projectId ? byId.get(c.projectId) : undefined;
    const section: Section = SECTION_FOR_FACT_TYPE[c.factType];
    return {
      id: c.id,
      text: c.content,
      sourceType: "curated_corpus",
      sourcePath: SNAPSHOT_SOURCE_PATH,
      // 클라이언트 출처 서술로 나가는 이름. 스냅샷 자체에 원 출처 위치가 없다(불투명 sourceKey 만).
      sourceId: `curated:${c.entityId}`,
      entityType: entityTypeFor(c, entity),
      entityId: c.entityId,
      projectId: c.projectId,
      projectSlug: c.projectId,
      projectTitle: project?.canonicalName,
      section,
      title: c.title,
      tags: c.tags ?? [],
      provenance: c.provenance.map((p) => `${p.sourceKey}${p.notionSection ? `#${p.notionSection}` : ""}${p.path ? ` ${p.path}` : ""}${p.sourceRevision ? `@${p.sourceRevision}` : ""}`).join(" | "),
      priority: (STATUS_PRIORITY[c.status] ?? 0.7) * (CURATED_PRIORITY[c.priority ?? "high"] ?? 1),
      contentHash: sha256(c.content).slice(0, 12),
      updatedAt: c.updatedAt,
      status: c.status === "deprecated" ? undefined : c.status,
      factType: c.factType,
      claimStatus: c.claimStatus,
      verificationLevel: c.verificationLevel,
      notes: c.notes,
    };
  });
}
