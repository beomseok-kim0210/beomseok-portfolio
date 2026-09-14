/**
 * PageContext — 클라이언트가 보내는 "지금 어디를 보고 있는가".
 *
 * 결정론적 애플리케이션 상태만 받는다: pathname, 페이지 종류, 프로젝트 슬러그, 섹션 ID.
 * DOM 덤프나 화면 텍스트는 받지 않는다 — 그건 근거가 아니라 입력이고, 근거는 서버의
 * 코퍼스에만 있다. 서버는 여기서 모든 값을 화이트리스트로 검증한다: 모르는 프로젝트
 * 슬러그, 모르는 섹션, 이상한 pathname 은 버리고 "문맥 없음" 으로 진행한다 (거절이 아니라
 * 무시 — 문맥은 힌트일 뿐이라 없어도 답할 수 있다).
 */
import { PROJECT_ENTITIES, projectEntity } from "./entities";
import { SECTIONS, type PageContext, type ProjectId } from "./types";

const PAGE_TYPES = ["home", "about", "project", "playground", "knowledge", "skills", "other"] as const;

/** 클라이언트 라우팅에서 PageContext 를 만든다. 서버 검증과 같은 규칙. */
export function pageContextFromPathname(pathname: string, sectionId?: string | null): PageContext {
  const clean = normalizePathname(pathname);
  const project = PROJECT_ENTITIES.find((p) => p.pathname === clean);
  if (project && project.id !== "docent") {
    return withSection({ pathname: clean, pageType: "project", projectSlug: project.id, projectTitle: project.title }, sectionId);
  }
  if (clean === "/playground") {
    return withSection({ pathname: clean, pageType: "playground", projectSlug: "docent", projectTitle: "AI Docent" }, sectionId);
  }
  if (clean === "/") return withSection({ pathname: clean, pageType: "home" }, sectionId);
  if (clean === "/about") return withSection({ pathname: clean, pageType: "about" }, sectionId);
  if (clean === "/knowledge") return { pathname: clean, pageType: "knowledge" };
  if (clean === "/skills") return { pathname: clean, pageType: "skills" };
  return { pathname: clean, pageType: "other" };
}

function withSection(ctx: PageContext, sectionId?: string | null): PageContext {
  if (sectionId && isSection(sectionId)) return { ...ctx, sectionId };
  return ctx;
}

function normalizePathname(p: string): string {
  const noQuery = p.split(/[?#]/)[0] || "/";
  const trimmed = noQuery.length > 1 ? noQuery.replace(/\/+$/, "") : noQuery;
  return trimmed || "/";
}

function isSection(s: unknown): s is (typeof SECTIONS)[number] {
  return typeof s === "string" && (SECTIONS as readonly string[]).includes(s);
}

export interface PageContextValidation {
  context: PageContext | null;
  /** 버린 필드와 이유 — 로그용. 값은 담지 않는다. */
  dropped: string[];
}

/**
 * 서버 측 검증. 어떤 입력도 예외를 던지지 않는다.
 *
 * - pathname: 문자열, 200자 이하, "/" 로 시작, 제어문자 없음. 아니면 전체를 버린다.
 * - pageType: 화이트리스트. 아니면 pathname 에서 다시 유도한다.
 * - projectSlug: 코퍼스에 있는 프로젝트만. 없는 슬러그("admin", "../x")는 버린다.
 * - pathname 과 projectSlug 가 서로 다른 프로젝트를 가리키면 pathname 을 믿는다.
 * - sectionId: 알려진 섹션 이름만.
 * - projectTitle: 클라이언트 값은 무시하고 서버가 채운다 (표시용이지 근거가 아니다).
 */
export function validatePageContext(raw: unknown): PageContextValidation {
  const dropped: string[] = [];
  if (raw === undefined || raw === null) return { context: null, dropped };
  if (typeof raw !== "object" || Array.isArray(raw)) return { context: null, dropped: ["not_an_object"] };
  const r = raw as Record<string, unknown>;

  const pathname = r.pathname;
  if (typeof pathname !== "string" || pathname.length === 0 || pathname.length > 200 || !pathname.startsWith("/") || /[\u0000-\u001f]/.test(pathname)) {
    return { context: null, dropped: ["pathname"] };
  }

  // pathname 이 진실. 나머지는 그것과 맞을 때만 받는다.
  const derived = pageContextFromPathname(pathname);
  const ctx: PageContext = { pathname: derived.pathname, pageType: derived.pageType };

  if (typeof r.pageType === "string" && (PAGE_TYPES as readonly string[]).includes(r.pageType)) {
    if (r.pageType !== derived.pageType) dropped.push("pageType_mismatch");
  } else if (r.pageType !== undefined) {
    dropped.push("pageType");
  }

  if (r.projectSlug !== undefined) {
    const slug = typeof r.projectSlug === "string" ? r.projectSlug : "";
    const known = projectEntity(slug);
    if (!known) dropped.push("projectSlug_unknown");
    else if (derived.projectSlug && derived.projectSlug !== known.id) dropped.push("projectSlug_mismatch");
  }
  if (derived.projectSlug) {
    ctx.projectSlug = derived.projectSlug as ProjectId;
    ctx.projectTitle = derived.projectTitle;
  }
  if (r.projectTitle !== undefined) dropped.push("projectTitle_ignored");

  if (r.sectionId !== undefined) {
    if (isSection(r.sectionId) && ctx.projectSlug) ctx.sectionId = r.sectionId;
    else dropped.push("sectionId");
  }

  return { context: ctx, dropped };
}
