/**
 * 큐레이션 코퍼스 패키지 스키마 — 도슨트가 아는 사실의 "입력 계약".
 *
 * 역할 분리: 코퍼스의 내용(무엇이 사실인가)은 별도 큐레이션 단계(Notion 정본 페이지·Evidence·Evaluation,
 * GitHub 구현을 교차 검증한 사람/세션)가 쓰고, 이 저장소는 그 패키지를 받아 검증·정규화·중복 제거해
 * 스냅샷으로 만든 뒤 BM25 + 문서 임베딩에 넣는다. 런타임은 Notion·GitHub 를 직접 검색하지 않는다.
 *
 * 이 파일은 런타임 검증용 타입과 열거형만 담는다(외부 스키마 라이브러리 없음). 같은 계약의 JSON Schema 는
 * docs/rag/curated-corpus.schema.json 에 있다 — 둘을 바꿀 때는 함께 바꾼다(tests/docent-corpus.test.ts 가 대조).
 */
import type { Section } from "@/lib/docent/rag/types";

export const CORPUS_SCHEMA_VERSION = 1;

/** 포트폴리오 전체 프로젝트 목록 조각의 ID. 레거시 빌더와 스냅샷 빌더가 같은 ID 를 쓰고, 검색이 범위 신호로 쓴다. */
export const PORTFOLIO_INVENTORY_CHUNK_ID = "profile:portfolio:projects";

/**
 * 정보의 종류. 검색의 섹션(근거 묶음의 다양성·정본 순서)과 프롬프트의 근거 라벨에 쓰인다.
 * evidence 는 측정·관찰된 사실(수치, 로그, 테스트 결과), evaluation 은 그것에 대한 평가·해석이다 — 둘을 섞지 않는다.
 * rationale 은 결정의 이유(검색 섹션 decision).
 */
export const FACT_TYPES = [
  "overview", "problem", "role", "architecture", "technology", "rationale", "troubleshooting",
  "result", "evidence", "evaluation", "lesson", "award", "profile", "skill", "journey", "devlog", "decision",
] as const;
export type FactType = (typeof FACT_TYPES)[number];

/**
 * 사실의 시점. current 만 "지금 그렇다" 로 말할 수 있다. historical(예전엔 그랬다)·experimental(실험 중)·
 * planned(계획)는 근거에 상태 라벨이 붙어 모델에 간다 — 구현된 현재 사실처럼 말하지 않게 한다.
 * deprecated(더 이상 사실 아님)는 스냅샷에 들어가지 않는다.
 */
export const CHUNK_STATUSES = ["current", "historical", "deprecated", "experimental", "planned"] as const;
export type ChunkStatus = (typeof CHUNK_STATUSES)[number];

/** 런타임 코퍼스에 들어가는 상태. deprecated 는 빠진다. */
export const RUNTIME_STATUSES: readonly ChunkStatus[] = ["current", "historical", "experimental", "planned"];

/** system = 포트폴리오 사이트처럼 프로젝트로 다루되 "만든 프로젝트 목록" 에는 들지 않는 것, profile = 사람. */
export const ENTITY_TYPES = ["project", "system", "profile", "person", "organization", "site", "topic"] as const;
export type EntityKind = (typeof ENTITY_TYPES)[number];

export const PROVENANCE_SOURCE_TYPES = ["notion", "github", "portfolio_site", "document", "manual_review", "derived"] as const;
export type ProvenanceSourceType = (typeof PROVENANCE_SOURCE_TYPES)[number];

/** 이 사실이 어디서 왔는가. 서버 내부용 — 클라이언트·프롬프트로 나가지 않는다. */
export interface Provenance {
  sourceType: ProvenanceSourceType;
  /** 사람이 따라가 확인할 수 있는 참조: Notion 페이지 제목/URL, "owner/repo:path", 문서 이름 등. */
  sourceRef: string;
  /** 커밋 SHA, Notion 수정 시각 등 원본의 판(版). */
  sourceRevision?: string;
  notionPageId?: string;
  /** Notion 페이지 안의 절(예: "Evidence", "Evaluation"). */
  notionSection?: string;
  /** GitHub 의 저장소 상대 경로. */
  path?: string;
  /** 큐레이터가 원본과 대조해 확인한 날짜(ISO 8601). */
  lastVerifiedAt?: string;
  /** GitHub 저장소(owner/repo). */
  repository?: string;
  sourceTitle?: string;
  /** 원본 쪽 검증 표기(예: Notion 의 Verified 상태). */
  nativeVerification?: string;
  note?: string;
}

/** 엔티티 등록부 — 질문 속 이름을 엔티티로 푸는 용도(엔티티 해소)일 뿐, 자연어 의도 라우팅에 쓰지 않는다. */
export interface EntityRegistryEntry {
  id: string;
  canonicalName: string;
  /** 질문에서 이 엔티티를 가리키는 표기(소문자 비교). 예: "아르미" → armi. */
  aliases: string[];
  type: EntityKind;
  status: ChunkStatus;
  /** false 면 도슨트 공개 답변에 쓰지 않는다(스냅샷에서 빠진다). */
  public: boolean;
  /** 사이트 안의 페이지 경로(있으면). 페이지 문맥과 엔티티를 잇는다. */
  pathname?: string;
  /** 원본의 프로젝트 생애 상태(예: v4 의 "done"). status 와 별개로 보존한다. */
  lifecycle?: string;
  notes?: string;
}

export interface CanonicalChunk {
  /** 안정 ID. 소문자·숫자와 : . _ - 만. 같은 자리면 내용이 바뀌어도 같은 ID. */
  id: string;
  /** 이 사실이 속한 엔티티(registry id). */
  entityId: string;
  /** 프로젝트 사실이면 그 프로젝트(registry 의 type=project id). 프로필 등은 생략. */
  projectId?: string;
  factType: FactType;
  status: ChunkStatus;
  public: boolean;
  /** 짧은 제목 — 검색 가중치(제목 ×2)와 근거 라벨에 쓰인다. */
  title: string;
  /** 사실 본문. 방문자에게 다시 서술될 문장이다. */
  content: string;
  tags?: string[];
  /** 1개 이상 필수. */
  provenance: Provenance[];
  /** 이 조각이 대체하는 옛 조각 ID(문서화용). */
  supersedes?: string[];
  updatedAt?: string;
  /**
   * 주장의 성격 — implemented / measured / analyzed / evaluated / rejected / planned / cross-referenced /
   * source_conflict_detected 등(v4 는 더 세분된 값을 쓴다). 같은 강도의 사실로 다루지 않는다: 근거 라벨로 모델에 간다.
   */
  claimStatus?: string;
  /** 큐레이션 검증 수준(verified / cross-referenced / source-supported …). */
  verificationLevel?: string;
  /** 큐레이션 우선순위 — 검색 출처 가중치가 된다. */
  priority?: "high" | "normal" | "low";
  /** 큐레이터 주의 사항(예: "논문 수치, 프로젝트 실측 아님"). 근거와 함께 모델에 간다. */
  notes?: string;
  /** 원본의 세부 섹션 라벨(v4 section: voice, rag, ux …). 검색 섹션은 factType 에서 온다. */
  label?: string;
}

/** 비밀값처럼 보이지만 비밀이 아닌 문자열을 명시적으로 허용한다(예: 문서에 나오는 예시 토큰 형식). */
export interface SecretAllowlistEntry {
  chunkId: string;
  /** 그 조각 안에서 허용할 정확한 부분 문자열. */
  match: string;
  reason: string;
}

export interface CuratedCorpusPackage {
  schemaVersion: number;
  packageId?: string;
  generatedBy?: string;
  generatedAt?: string;
  entities: EntityRegistryEntry[];
  chunks: CanonicalChunk[];
  secretAllowlist?: SecretAllowlistEntry[];
  /** 원본 패키지의 버전·출처 스냅샷·충돌·승격 대기·수정 필요 목록 — 검색 근거가 아니라 감사용으로 스냅샷에 보존한다. */
  sourceMeta?: Record<string, unknown>;
}

/**
 * 공개 스냅샷의 출처 — 공개 저장소에 커밋되므로 원 출처 위치(Notion URL·페이지 ID·collection://·GitHub URL)를 싣지 않는다.
 * 원 출처는 gitignore 된 큐레이션 원본에만 있고, sourceKey 로 그 원본의 항목을 다시 찾을 수 있다(원본을 가진 사람만).
 */
export interface PublicProvenance {
  sourceType: ProvenanceSourceType;
  /** 불투명 안정 키: "<sourceType>:" + sha256(sourceType|sourceRef|notionPageId) 앞 16자. 원 출처를 복원할 수 없다. */
  sourceKey: string;
  /** Notion 페이지 안의 절 이름(예: "Evaluation"). */
  notionSection?: string;
  /** github 출처만: 공개 저장소 이름·저장소 상대 경로·판(커밋). */
  repository?: string;
  path?: string;
  sourceRevision?: string;
  lastVerifiedAt?: string;
  nativeVerification?: string;
  /** derived 출처만: 결합한 원 조각 ID. */
  derivedFrom?: string[];
}

/** 공개 스냅샷의 조각 — 출처만 PublicProvenance 로 줄인 CanonicalChunk. */
export type PublicChunk = Omit<CanonicalChunk, "provenance"> & { provenance: PublicProvenance[] };

/** 검증·정규화를 통과한 런타임 스냅샷(src/generated/docent-corpus.json). 공개 저장소에 커밋되는 파일이다. */
export interface CorpusSnapshot {
  schemaVersion: number;
  kind: "docent-corpus-snapshot";
  packageId: string | null;
  /** 정규화된 패키지(공개·런타임 대상)의 sha256. 임베딩 지문과는 별개 — 임베딩은 조각 텍스트로 다시 계산한다. */
  sourceHash: string;
  builtAt: string;
  entities: EntityRegistryEntry[];
  chunks: PublicChunk[];
  /**
   * 공개 조각 안에서 뺀 개수만. 비공개 조각·엔티티 개수는 싣지 않는다 — 공개 파일에서 비공개 프로젝트의 존재·개수를
   * 추론할 수 없게 한다(빌드 콘솔에만 나온다).
   */
  excluded: { deprecated: number; duplicateContent: number };
  /** 감사 메타 중 공개해도 되는 것만(허용 키 + URL·페이지 ID 치환 + 비공개 이름 언급 항목 제거). */
  sourceMeta?: Record<string, unknown>;
}

/** factType → 검색 섹션. rationale 은 결정(decision), evidence 는 측정(metric). */
export const SECTION_FOR_FACT_TYPE: Record<FactType, Section> = {
  overview: "overview",
  problem: "problem",
  role: "role",
  architecture: "architecture",
  technology: "technology",
  rationale: "decision",
  troubleshooting: "troubleshooting",
  result: "result",
  evidence: "metric",
  evaluation: "evaluation",
  lesson: "lesson",
  award: "award",
  profile: "profile",
  skill: "skill",
  journey: "journey",
  devlog: "devlog",
  decision: "decision",
};
