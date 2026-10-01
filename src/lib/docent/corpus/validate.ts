/**
 * 큐레이션 코퍼스 패키지 검증. 오류(errors)가 하나라도 있으면 스냅샷을 만들지 않는다. 경고(warnings)는
 * 빌드를 막지 않지만 보고서에 남는다.
 *
 * 오류: 스키마 버전 · 중복 ID · 빈 내용 · 모르는 엔티티/프로젝트 · 출처 없음 · 잘못된 status/factType ·
 *       잘못된 출처 형식 · 비밀값 · 로컬 경로 · public=false 엔티티에 속한 public 조각.
 * 경고: public=false 조각(스냅샷에서 빠짐) · deprecated 조각(빠짐) · current 가 아닌데 lastVerifiedAt 없음 ·
 *       같은 내용 중복(뒤쪽이 빠짐).
 */
import { publicSnapshotLeaks } from "./locators";
import { allowFor, findSecrets } from "./secrets";
import {
  CHUNK_STATUSES,
  CORPUS_SCHEMA_VERSION,
  ENTITY_TYPES,
  FACT_TYPES,
  PROVENANCE_SOURCE_TYPES,
  type CanonicalChunk,
  type CuratedCorpusPackage,
  type EntityRegistryEntry,
  type Provenance,
  type PublicProvenance,
} from "./schema";

export interface ValidationIssue {
  /** 문제가 있는 자리: "chunk:<id>", "entity:<id>", "package". */
  at: string;
  code: string;
  message: string;
}

export interface ValidationReport {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

const ID_RE = /^[a-z0-9][a-z0-9:._-]{0,159}$/;
const LOCAL_PATH_RE = /[A-Za-z]:\\|\/Users\/|\/home\/|\\\\[A-Za-z0-9]/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(?:T[\d:.]+(?:Z|[+-]\d{2}:?\d{2})?)?$/;

const isStr = (x: unknown): x is string => typeof x === "string";
const nonEmpty = (x: unknown): x is string => isStr(x) && x.trim().length > 0;

export interface ValidateOptions {
  /**
   * 공개 스냅샷 재검사: 출처가 원 출처(sourceRef) 대신 불투명 sourceKey 를 갖는 형식(PublicProvenance)이고,
   * 조각 어디에도 원 출처 위치(Notion URL·페이지 ID·collection://)가 없어야 한다.
   */
  publicSnapshot?: boolean;
}

export function validatePackage(input: unknown, options: ValidateOptions = {}): ValidationReport {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const err = (at: string, code: string, message: string) => errors.push({ at, code, message });
  const warn = (at: string, code: string, message: string) => warnings.push({ at, code, message });

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    err("package", "invalid_package", "패키지는 객체여야 한다");
    return { ok: false, errors, warnings };
  }
  const pkg = input as Partial<CuratedCorpusPackage>;
  if (pkg.schemaVersion !== CORPUS_SCHEMA_VERSION) err("package", "schema_version", `schemaVersion 은 ${CORPUS_SCHEMA_VERSION} 이어야 한다`);
  if (!Array.isArray(pkg.entities)) err("package", "entities_missing", "entities 배열이 필요하다");
  if (!Array.isArray(pkg.chunks)) err("package", "chunks_missing", "chunks 배열이 필요하다");
  if (errors.length > 0) return { ok: false, errors, warnings };

  /* --- 엔티티 등록부 --- */
  const entities = new Map<string, EntityRegistryEntry>();
  const aliasOwner = new Map<string, string>();
  for (const raw of pkg.entities as unknown[]) {
    const e = raw as Partial<EntityRegistryEntry>;
    const at = `entity:${isStr(e?.id) ? e.id : "?"}`;
    if (!e || typeof e !== "object") { err(at, "invalid_entity", "엔티티는 객체여야 한다"); continue; }
    if (!isStr(e.id) || !ID_RE.test(e.id)) { err(at, "invalid_id", "엔티티 id 형식이 잘못됐다"); continue; }
    if (entities.has(e.id)) { err(at, "duplicate_entity", "엔티티 id 중복"); continue; }
    if (!nonEmpty(e.canonicalName)) err(at, "empty_name", "canonicalName 이 비었다");
    if (!(ENTITY_TYPES as readonly string[]).includes(e.type as string)) err(at, "invalid_entity_type", `type 은 ${ENTITY_TYPES.join("|")} 중 하나`);
    if (!(CHUNK_STATUSES as readonly string[]).includes(e.status as string)) err(at, "invalid_status", `status 는 ${CHUNK_STATUSES.join("|")} 중 하나`);
    if (typeof e.public !== "boolean") err(at, "invalid_public", "public 은 boolean");
    if (!Array.isArray(e.aliases) || !e.aliases.every(nonEmpty)) err(at, "invalid_aliases", "aliases 는 빈 문자열 없는 배열");
    if (e.pathname !== undefined && (!isStr(e.pathname) || !e.pathname.startsWith("/"))) err(at, "invalid_pathname", "pathname 은 / 로 시작");
    for (const a of e.aliases ?? []) {
      const key = a.trim().toLowerCase();
      const owner = aliasOwner.get(key);
      if (owner && owner !== e.id) err(at, "alias_conflict", `별칭 "${a}" 가 ${owner} 와 겹친다`);
      aliasOwner.set(key, e.id);
    }
    entities.set(e.id, e as EntityRegistryEntry);
  }

  /* --- 조각 --- */
  const ids = new Set<string>();
  for (const raw of pkg.chunks as unknown[]) {
    const c = raw as Partial<CanonicalChunk>;
    const at = `chunk:${isStr(c?.id) ? c.id : "?"}`;
    if (!c || typeof c !== "object") { err(at, "invalid_chunk", "조각은 객체여야 한다"); continue; }
    if (!isStr(c.id) || !ID_RE.test(c.id)) { err(at, "invalid_id", "조각 id 형식이 잘못됐다(소문자·숫자·:._-)"); continue; }
    if (ids.has(c.id)) { err(at, "duplicate_id", "조각 id 중복"); continue; }
    ids.add(c.id);

    if (!nonEmpty(c.content)) err(at, "empty_content", "content 가 비었다");
    if (!nonEmpty(c.title)) err(at, "empty_title", "title 이 비었다");
    if (!(FACT_TYPES as readonly string[]).includes(c.factType as string)) err(at, "invalid_fact_type", `factType 은 ${FACT_TYPES.join("|")} 중 하나`);
    if (!(CHUNK_STATUSES as readonly string[]).includes(c.status as string)) err(at, "invalid_status", `status 는 ${CHUNK_STATUSES.join("|")} 중 하나`);
    if (typeof c.public !== "boolean") err(at, "invalid_public", "public 은 boolean");
    if (c.tags !== undefined && (!Array.isArray(c.tags) || !c.tags.every(nonEmpty))) err(at, "invalid_tags", "tags 는 빈 문자열 없는 배열");
    if (c.priority !== undefined && !["high", "normal", "low"].includes(c.priority as string)) err(at, "invalid_priority", "priority 는 high|normal|low");
    if (c.claimStatus !== undefined && !nonEmpty(c.claimStatus)) err(at, "invalid_claim_status", "claimStatus 는 빈 문자열이 아니어야 한다");
    if (c.claimStatus === undefined) warn(at, "missing_claim_status", "claimStatus 가 없다 — 주장의 성격을 근거 라벨로 전달하지 못한다");

    const entity = isStr(c.entityId) ? entities.get(c.entityId) : undefined;
    if (!entity) err(at, "unknown_entity", `entityId "${c.entityId}" 가 등록부에 없다`);
    if (c.projectId !== undefined) {
      const project = isStr(c.projectId) ? entities.get(c.projectId) : undefined;
      if (!project || (project.type !== "project" && project.type !== "system")) err(at, "unknown_project", `projectId "${c.projectId}" 는 등록부의 project·system 이 아니다`);
    }
    if (entity && entity.public === false && c.public === true) err(at, "public_under_private_entity", "비공개 엔티티의 조각을 public 으로 낼 수 없다");

    if (!Array.isArray(c.provenance) || c.provenance.length === 0) {
      err(at, "missing_provenance", "provenance 가 1개 이상 필요하다");
    } else {
      c.provenance.forEach((p, i) => (options.publicSnapshot ? validatePublicProvenance : validateProvenance)(p, `${at}#provenance[${i}]`, err));
      if (options.publicSnapshot && publicSnapshotLeaks(JSON.stringify(c)).length > 0) err(at, "public_locator", "공개 스냅샷 조각에 원 출처 위치(Notion URL·페이지 ID·collection://)가 있다");
      if (c.status !== "current" && c.status !== "deprecated" && !c.provenance.some((p) => p && nonEmpty(p.lastVerifiedAt))) {
        warn(at, "unverified_noncurrent", `${c.status} 조각에 lastVerifiedAt 이 없다`);
      }
    }

    const text = `${c.title ?? ""}\n${c.content ?? ""}\n${(c.tags ?? []).join(" ")}\n${JSON.stringify(c.provenance ?? [])}`;
    for (const f of findSecrets(text, allowFor(c.id, pkg.secretAllowlist))) err(at, "secret_like", `비밀값으로 보이는 문자열(${f.kind}, ${f.preview}) — 지우거나 secretAllowlist 에 사유와 함께 등록`);
    if (LOCAL_PATH_RE.test(`${c.content ?? ""} ${c.title ?? ""}`)) err(at, "local_path", "본문·제목에 로컬 절대 경로가 있다");

    if (c.public === false) warn(at, "not_public", "public=false — 런타임 스냅샷에서 빠진다");
    if (c.status === "deprecated") warn(at, "deprecated", "deprecated — 런타임 스냅샷에서 빠진다");
  }

  for (const e of pkg.secretAllowlist ?? []) {
    if (!nonEmpty(e?.chunkId) || !nonEmpty(e?.match) || !nonEmpty(e?.reason)) err("package", "invalid_allowlist", "secretAllowlist 항목은 chunkId·match·reason 이 모두 필요하다");
    else if (!ids.has(e.chunkId)) warn("package", "allowlist_unknown_chunk", `secretAllowlist 의 ${e.chunkId} 가 없다`);
  }

  return { ok: errors.length === 0, errors, warnings };
}

const SOURCE_KEY_RE = /^[a-z_]+:[a-z0-9:._-]{1,160}$/;

function validatePublicProvenance(raw: unknown, at: string, err: (at: string, code: string, message: string) => void): void {
  const p = raw as Partial<PublicProvenance>;
  if (!p || typeof p !== "object") { err(at, "invalid_provenance", "출처는 객체여야 한다"); return; }
  if (!(PROVENANCE_SOURCE_TYPES as readonly string[]).includes(p.sourceType as string)) err(at, "invalid_source_type", `sourceType 은 ${PROVENANCE_SOURCE_TYPES.join("|")} 중 하나`);
  if (!(isStr(p.sourceKey) && SOURCE_KEY_RE.test(p.sourceKey))) err(at, "invalid_source_key", "공개 출처는 불투명 sourceKey(\"<종류>:<키>\")가 필요하다");
  if ("sourceRef" in p || "notionPageId" in p) err(at, "public_source_ref", "공개 스냅샷 출처에 sourceRef·notionPageId 가 있으면 안 된다");
  if (p.lastVerifiedAt !== undefined && !(isStr(p.lastVerifiedAt) && ISO_DATE_RE.test(p.lastVerifiedAt))) err(at, "invalid_date", "lastVerifiedAt 은 ISO 8601 날짜");
  if (isStr(p.path) && LOCAL_PATH_RE.test(p.path)) err(at, "local_path", "출처에 로컬 절대 경로가 있다");
}

function validateProvenance(raw: unknown, at: string, err: (at: string, code: string, message: string) => void): void {
  const p = raw as Partial<Provenance>;
  if (!p || typeof p !== "object") { err(at, "invalid_provenance", "출처는 객체여야 한다"); return; }
  if (!(PROVENANCE_SOURCE_TYPES as readonly string[]).includes(p.sourceType as string)) err(at, "invalid_source_type", `sourceType 은 ${PROVENANCE_SOURCE_TYPES.join("|")} 중 하나`);
  if (!nonEmpty(p.sourceRef)) err(at, "missing_source_ref", "sourceRef 가 비었다");
  if (p.sourceType === "notion" && !nonEmpty(p.notionPageId) && !(isStr(p.sourceRef) && /notion\.(so|site|com)\/|^collection:\/\//.test(p.sourceRef))) {
    err(at, "notion_ref", "notion 출처는 notionPageId 나 Notion URL(notion.so · app.notion.com · collection://) 이 필요하다");
  }
  if (p.sourceType === "github" && !nonEmpty(p.path) && !nonEmpty(p.repository) && !(isStr(p.sourceRef) && /[:/]/.test(p.sourceRef))) {
    err(at, "github_ref", "github 출처는 path 나 \"owner/repo:path\" 꼴 sourceRef 가 필요하다");
  }
  if (p.lastVerifiedAt !== undefined && !(isStr(p.lastVerifiedAt) && ISO_DATE_RE.test(p.lastVerifiedAt))) err(at, "invalid_date", "lastVerifiedAt 은 ISO 8601 날짜");
  for (const v of [p.sourceRef, p.path]) if (isStr(v) && LOCAL_PATH_RE.test(v)) err(at, "local_path", "출처에 로컬 절대 경로가 있다 — 저장소 상대 경로나 URL 을 쓴다");
}
