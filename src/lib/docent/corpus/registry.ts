/**
 * 엔티티 등록부(서버) — 질문 속 이름("아르미", "armi", "행가래")을 엔티티로 푸는 표. 자연어 의도 판정에 쓰지 않는다.
 *
 * 큐레이션 스냅샷이 활성이면 스냅샷의 공개 엔티티가, 아니면 레거시 5개 프로젝트(entities.ts)가 등록부다.
 * 검색(retrieval.ts)과 프롬프트(grounding.ts)는 프로젝트 목록을 여기서만 얻는다 — "프로젝트는 5개" 라는 가정을
 * 코드에 두지 않는다. 클라이언트의 페이지 경로 매핑(entities.ts → pageContext)은 사이트 라우트라 따로 남는다.
 *
 * 엔티티 종류별 해소 강도:
 *  - project: 질문이 이름을 말하면 그 프로젝트로 범위를 정한다(hard).
 *  - system(포트폴리오 사이트 자체): 이름이 "포트폴리오" 처럼 일반어와 겹쳐 대화·페이지 프로젝트처럼 약한 기본값으로만
 *    쓴다(soft) — 질문이 다른 프로젝트 특유의 말을 하거나 포트폴리오 전체를 가리키면 그쪽이 이긴다.
 *  - profile 등: 이름으로 범위를 정하지 않는다(검색 순위와 페이지 문맥이 맡는다).
 */
import { PROJECT_ENTITIES } from "@/lib/docent/rag/entities";

import { activeCorpusSource } from "./active";
import type { EntityRegistryEntry } from "./schema";

/** 검색이 쓰는 엔티티 모양. title = canonicalName, aliases 는 소문자이고 id·정식 이름을 포함한다. */
export interface RegistryEntity {
  id: string;
  title: string;
  aliases: string[];
  type: EntityRegistryEntry["type"];
  pathname?: string;
}

let cache: { key: unknown; entities: RegistryEntity[] } | null = null;

function withNames(id: string, title: string, aliases: string[]): string[] {
  return [...new Set([id, title, ...aliases].map((a) => a.trim().toLowerCase()).filter((a) => a.length >= 2))];
}

export function entityRegistry(): RegistryEntity[] {
  const source = activeCorpusSource();
  if (cache && cache.key === source) return cache.entities;
  const entities: RegistryEntity[] = source.kind === "snapshot"
    ? source.snapshot.entities
      .filter((e) => e.public && e.status !== "deprecated")
      .map((e) => ({ id: e.id, title: e.canonicalName, aliases: withNames(e.id, e.canonicalName, e.aliases), type: e.type, pathname: e.pathname }))
    : PROJECT_ENTITIES.map((p) => ({ id: p.id, title: p.title, aliases: withNames(p.id, p.title, [...p.aliases]), type: "project" as const, pathname: p.pathname }));
  cache = { key: source, entities };
  return entities;
}

/** "만든 프로젝트" — 프로젝트 목록·포트폴리오 전체 근거의 대상. */
export function projectRegistry(): RegistryEntity[] {
  return entityRegistry().filter((e) => e.type === "project");
}

/** 이름으로 약하게 가리키는 엔티티(system). */
export function softEntityRegistry(): RegistryEntity[] {
  return entityRegistry().filter((e) => e.type === "system");
}

export function registryEntity(id: string | null | undefined): RegistryEntity | undefined {
  return id ? entityRegistry().find((e) => e.id === id) : undefined;
}

/** 도슨트 자신을 가리키는 프로젝트 엔티티("너", "네 목소리"). 이름·별칭에 docent/도슨트 가 있는 프로젝트. */
export function selfEntityId(): string | null {
  return projectRegistry().find((e) => e.aliases.some((a) => /docent|도슨트/.test(a)))?.id ?? null;
}
