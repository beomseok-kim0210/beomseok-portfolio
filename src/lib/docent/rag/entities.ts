/**
 * 프로젝트 엔티티 레지스트리 — 클라이언트/서버 공용 (Node 전용 import 없음).
 * 슬러그는 URL 과 코퍼스 projectId 를 동시에 가리킨다.
 */
import type { ProjectId } from "./types";

export interface ProjectEntity {
  id: ProjectId;
  title: string;
  /** 질문에서 이 프로젝트를 가리키는 표현. 소문자 비교. */
  aliases: string[];
  pathname: string;
}

export const PROJECT_ENTITIES: readonly ProjectEntity[] = [
  { id: "armi", title: "ARMI", aliases: ["armi", "아르미", "알미"], pathname: "/projects/armi" },
  { id: "hangarae", title: "행가래", aliases: ["행가래", "hangarae", "항가래"], pathname: "/projects/hangarae" },
  { id: "wedding", title: "Wedding AI", aliases: ["wedding", "웨딩", "드레스", "dress"], pathname: "/projects/wedding" },
  { id: "claw-dev", title: "Claw Dev", aliases: ["claw dev", "claw-dev", "clawdev", "claw", "클로 데브", "클로데브", "클로"], pathname: "/projects/claw-dev" },
  { id: "docent", title: "AI Docent", aliases: ["도슨트", "docent", "디지털 도슨트", "3d 아바타", "아바타", "gnm"], pathname: "/playground" },
];

export function projectEntity(id: string | undefined): ProjectEntity | undefined {
  return PROJECT_ENTITIES.find((p) => p.id === id);
}

