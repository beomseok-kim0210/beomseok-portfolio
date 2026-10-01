/**
 * RAG 데이터 모델.
 *
 * 검색 단위(chunk)는 글자 수로 자른 조각이 아니라 포트폴리오 데이터의 구조 경계
 * (프로젝트 × 섹션 × 항목)를 그대로 따른다. 그래야 "역할" 질문에 역할 조각이,
 * "수치" 질문에 지표 조각이 올라오고, 답의 출처가 사람이 읽을 수 있는 단위로 남는다.
 */

/**
 * 레거시 코퍼스(src/data 빌더)의 프로젝트 식별자. URL 슬러그와 같다. 큐레이션 스냅샷이 들어오면 프로젝트 목록은
 * 엔티티 등록부(src/lib/docent/corpus/registry.ts)가 정한다 — 그래서 ProjectId 는 문자열이다.
 */
export const PROJECT_IDS = ["armi", "hangarae", "wedding", "claw-dev", "docent"] as const;
export type ProjectId = string;

export const ENTITY_TYPES = [
  "profile",
  "project",
  "project_decision",
  "project_metric",
  "project_troubleshooting",
  "experience",
  "education",
  "skill",
  "devlog",
  "knowledge",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

/** 프로젝트 근거 안에서 보존하는 구분. 검색 랭킹이 질문 의도와 맞춘다. */
export const SECTIONS = [
  "overview",
  "problem",
  "role",
  "architecture",
  "technology",
  "decision",
  "troubleshooting",
  "metric",
  "evaluation",
  "result",
  "lesson",
  "award",
  "profile",
  "journey",
  "focus",
  "skill",
  "devlog",
  "roadmap",
  "note",
] as const;
export type Section = (typeof SECTIONS)[number];

export const SOURCE_TYPES = [
  "structured_data",
  "markdown_note",
  "curated_corpus",
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export interface RagChunk {
  /** 구조에서 결정되는 안정 ID. 내용이 바뀌어도 같은 자리면 같은 ID다. */
  id: string;
  /** 검색·생성에 쓰는 본문. 제목은 포함하지 않는다. */
  text: string;
  sourceType: SourceType;
  /** 저장소 상대 경로 — 서버 내부용. 클라이언트로는 나가지 않는다. */
  sourcePath: string;
  /** 논리적 출처 ID. 클라이언트에 노출해도 되는 이름. */
  sourceId: string;
  entityType: EntityType;
  entityId: string;
  projectId?: ProjectId;
  projectSlug?: ProjectId;
  projectTitle?: string;
  section: Section;
  title: string;
  tags: string[];
  /** 이 조각이 어디서 어떻게 왔는지 사람이 읽는 설명. */
  provenance: string;
  /** 출처 우선순위 0..1. 원전(case study) 이 요약본(카드 문구)보다 높다. */
  priority: number;
  /** 본문 sha256 앞 12자. ID 는 자리, 이 값은 내용을 가리킨다. */
  contentHash: string;
  updatedAt?: string;
  /** 큐레이션 스냅샷의 사실 시점. 없으면 current(레거시 코퍼스). current 가 아니면 근거에 상태 라벨이 붙는다. */
  status?: "current" | "historical" | "experimental" | "planned";
  /** 큐레이션 스냅샷의 정보 종류(evidence 와 evaluation 구분 등). 레거시 코퍼스는 없다. */
  factType?: string;
  /** 주장의 성격(implemented / measured / analyzed / planned …). 근거 라벨로 모델에 간다. */
  claimStatus?: string;
  verificationLevel?: string;
  /** 큐레이터 주의 사항. 근거와 함께 모델에 간다. */
  notes?: string;
}

export interface CorpusSource {
  sourceId: string;
  sourceType: SourceType;
  sourcePath: string;
  entityType: EntityType;
  entityId: string;
  title: string;
  contentOwner: string;
  /** 같은 사실이 여러 곳에 있을 때 무엇이 정본인지. */
  canonical: boolean;
  priority: number;
  note?: string;
}

/** 클라이언트가 보내는 결정론적 페이지 문맥. 서버가 검증한 뒤에만 쓴다. */
export interface PageContext {
  pathname: string;
  pageType: "home" | "about" | "project" | "playground" | "knowledge" | "skills" | "other";
  sectionId?: string;
  projectSlug?: ProjectId;
  projectTitle?: string;
}

/** 클라이언트에 내려보내도 되는 출처 서술. 파일 경로는 없다. */
export interface SourceDescriptor {
  chunkId: string;
  title: string;
  entityId: string;
  section: Section;
  sourceId: string;
  score: number;
}
