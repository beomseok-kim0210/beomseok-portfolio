/**
 * v4·v5 큐레이션 코퍼스(dd_curated_corpus_v4_*.json schemaVersion 1.3, v5 1.4 — 같은 형식) → 내부 패키지(CuratedCorpusPackage) 변환.
 *
 * 내용은 바꾸지 않는다: content · status · public · claimStatus · verificationLevel · priority · notes · provenance 를
 * 그대로 옮긴다. 하는 일은 형식 맞추기뿐이다.
 *  - v4 에 없는 title: "<엔티티 이름> · <v4 section>" 라벨(사실이 아니라 검색·근거 표시용 이름표)
 *  - projectId: 엔티티가 project 이거나 system(포트폴리오 사이트)이면 그 엔티티
 *  - v4 section(voice, rag, ux …)은 label 로 보존. 검색 섹션은 factType 에서 온다
 *  - 엔티티 status "done" 같은 생애 상태는 lifecycle 로 보존하고, 등록부 status 는 current
 *  - provenance: revision → sourceRevision, sourceSection → notionSection (나머지 필드는 그대로)
 *  - conflicts · pendingPromotions · sourceCorrectionsNeeded · sourcePolicy · sourceSnapshot 은 sourceMeta 로 보존
 *    (검색 근거가 아니라 감사 기록이다)
 */
import { CORPUS_SCHEMA_VERSION, type CanonicalChunk, type CuratedCorpusPackage, type EntityRegistryEntry, type Provenance } from "./schema";

interface V4Entity {
  id: string;
  canonicalName: string;
  aliases?: string[];
  type: string;
  status: string;
  public: boolean;
  notes?: string;
}

interface V4Provenance {
  sourceType: string;
  sourceRef: string;
  repository?: string;
  revision?: string;
  path?: string;
  sourceTitle?: string;
  sourceSection?: string;
  nativeVerification?: string;
  note?: string;
}

interface V4Chunk {
  id: string;
  entityId: string;
  section?: string;
  factType: string;
  status: string;
  public: boolean;
  verificationLevel?: string;
  priority?: string;
  content: string;
  provenance?: V4Provenance[];
  claimStatus?: string;
  notes?: string;
}

interface V4Package {
  schemaVersion: number | string;
  corpusVersion: string;
  entities: V4Entity[];
  chunks: V4Chunk[];
  [key: string]: unknown;
}

/** v4 형식인가: corpusVersion 이 있고 내부 schemaVersion(1)과 다르다. */
export function isV4Package(x: unknown): x is V4Package {
  if (!x || typeof x !== "object") return false;
  const p = x as Partial<V4Package>;
  return typeof p.corpusVersion === "string" && Array.isArray(p.entities) && Array.isArray(p.chunks) && p.schemaVersion !== CORPUS_SCHEMA_VERSION;
}

const ENTITY_STATUS = new Set(["current", "historical", "deprecated", "experimental", "planned"]);
const META_KEYS = ["schemaVersion", "corpusVersion", "generatedAt", "purpose", "sourcePolicy", "sourceSnapshot", "conflicts", "pendingPromotions", "sourceCorrectionsNeeded", "audit", "handoffReadiness", "validation", "publicRuntimePolicy", "v5Changes", "artifactSha256"];

export function fromV4(v4: V4Package): CuratedCorpusPackage {
  const entities: EntityRegistryEntry[] = v4.entities.map((e) => ({
    id: e.id,
    canonicalName: e.canonicalName,
    aliases: e.aliases ?? [],
    type: e.type as EntityRegistryEntry["type"],
    // 엔티티 status 는 "등록부에 있는 현재 엔티티인가". done(완료된 프로젝트)도 현재 엔티티다 — 원값은 lifecycle 에.
    status: (ENTITY_STATUS.has(e.status) ? e.status : "current") as EntityRegistryEntry["status"],
    lifecycle: ENTITY_STATUS.has(e.status) ? undefined : e.status,
    public: e.public,
    notes: e.notes,
  }));
  const byId = new Map(entities.map((e) => [e.id, e]));

  const chunks: CanonicalChunk[] = v4.chunks.map((c) => {
    const entity = byId.get(c.entityId);
    const projectLike = entity && (entity.type === "project" || entity.type === "system");
    return {
      id: c.id,
      entityId: c.entityId,
      projectId: projectLike ? c.entityId : undefined,
      factType: c.factType as CanonicalChunk["factType"],
      status: c.status as CanonicalChunk["status"],
      public: c.public,
      title: `${entity?.canonicalName ?? c.entityId} · ${c.section ?? c.factType}`,
      content: c.content,
      provenance: (c.provenance ?? []).map((p): Provenance => ({
        sourceType: p.sourceType as Provenance["sourceType"],
        sourceRef: p.sourceRef,
        repository: p.repository,
        sourceRevision: p.revision,
        path: p.path,
        sourceTitle: p.sourceTitle,
        notionSection: p.sourceSection,
        nativeVerification: p.nativeVerification,
        note: p.note,
      })),
      claimStatus: c.claimStatus,
      verificationLevel: c.verificationLevel,
      priority: c.priority as CanonicalChunk["priority"],
      notes: c.notes,
      label: c.section,
    };
  });

  const sourceMeta: Record<string, unknown> = {};
  for (const k of META_KEYS) if (k in v4) sourceMeta[k] = v4[k];

  return {
    schemaVersion: CORPUS_SCHEMA_VERSION,
    packageId: v4.corpusVersion,
    generatedAt: typeof v4.generatedAt === "string" ? v4.generatedAt : undefined,
    entities,
    chunks,
    sourceMeta,
  };
}
