export const GLOBAL_DOCENT_VIEW_STORAGE_KEY = "portfolio:ai-docent:view-state";

/**
 * docked     — 오른쪽 사이드 패널. 헤더 아래부터 화면 바닥까지, 본문은 비율 그대로 옆으로 비킨다.
 * fullscreen — 헤더 아래 전체를 쓰는 작업 공간.
 * minimized  — 오른쪽 아래 AI DOCENT 버튼만 남는다.
 */
export type GlobalDocentView = "docked" | "fullscreen" | "minimized";

export type GlobalDocentPresentationEvent =
  | { type: "DOCK" }
  | { type: "FULLSCREEN" }
  | { type: "MINIMIZE" }
  | { type: "HYDRATE"; view: GlobalDocentView };

export const initialGlobalDocentState: GlobalDocentView = "docked";

export const MOBILE_DOCENT_BREAKPOINT = 768;

// The widest established portfolio container is 1440px. Global border-box sizing
// means its own horizontal padding is already included in that outer width.
export const PORTFOLIO_CANONICAL_CONTENT_WIDTH = 1440;
export const DESKTOP_DOCENT_PANEL_WIDTH = 440;
export const DESKTOP_DOCENT_EDGE_MARGIN = 16;
export const DESKTOP_DOCENT_CANVAS_GAP = 24;
/** 사이드 패널이 차지하는 오른쪽 폭(패널 + 바깥 여백 + 본문과의 간격). */
export const DESKTOP_DOCENT_RESERVED_WIDTH =
  DESKTOP_DOCENT_PANEL_WIDTH + DESKTOP_DOCENT_EDGE_MARGIN + DESKTOP_DOCENT_CANVAS_GAP;
/** 이 폭부터 사이드 패널로 붙는다. 아래는 헤더 아래 전체를 쓰는 시트가 된다. */
export const DOCENT_DOCK_MIN_VIEWPORT_WIDTH = 1024;

export function canDockGlobalDocent(viewportWidth: number): boolean {
  return viewportWidth >= DOCENT_DOCK_MIN_VIEWPORT_WIDTH;
}

/**
 * 본문을 오른쪽에서 얼마나 비켜야 패널이 본문을 가리지 않는지. 본문은 가운데 정렬된
 * 1440px 이라, 오른쪽 바깥 여백이 이미 충분하면 0 이다. 본문 폭이 줄어드는 좁은
 * 화면에서도 예약 폭 이상은 밀지 않는다. globals.css 의 clamp() 와 같은 식이다.
 */
export function dockedContentInset(viewportWidth: number): number {
  if (!canDockGlobalDocent(viewportWidth)) return 0;
  const needed =
    2 * DESKTOP_DOCENT_RESERVED_WIDTH + PORTFOLIO_CANONICAL_CONTENT_WIDTH - viewportWidth;
  return Math.min(DESKTOP_DOCENT_RESERVED_WIDTH, Math.max(0, needed));
}

/** 데스크톱 첫 방문은 사이드 패널로 열고, 좁은 화면은 버튼으로 시작한다. */
export function defaultGlobalDocentView(viewportWidth: number): GlobalDocentView {
  return canDockGlobalDocent(viewportWidth) ? "docked" : "minimized";
}

export function globalDocentPresentationReducer(
  state: GlobalDocentView,
  event: GlobalDocentPresentationEvent,
): GlobalDocentView {
  switch (event.type) {
    case "DOCK":
      return "docked";
    case "FULLSCREEN":
      return "fullscreen";
    case "MINIMIZE":
      return "minimized";
    case "HYDRATE":
      return event.view;
    default:
      return state;
  }
}

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "setItem">;

/** Pass null during SSR. A valid stored choice always wins over the first-visit default. */
export function readGlobalDocentView(
  storage: ReadableStorage | null,
  firstVisitDefault: GlobalDocentView = initialGlobalDocentState,
): GlobalDocentView {
  if (!storage) return firstVisitDefault;
  try {
    const value = storage.getItem(GLOBAL_DOCENT_VIEW_STORAGE_KEY);
    if (value === "minimized" || value === "docked" || value === "fullscreen") return value;
    // 이전 버전의 "expanded"(= 전체 화면이었음)는 새 기본 열림 상태인 사이드 패널로 옮긴다.
    if (value === "expanded") return "docked";
    return firstVisitDefault;
  } catch {
    return firstVisitDefault;
  }
}

export function persistGlobalDocentView(
  view: GlobalDocentView,
  storage: WritableStorage | null,
): void {
  if (!storage) return;
  try {
    storage.setItem(GLOBAL_DOCENT_VIEW_STORAGE_KEY, view);
  } catch {
    // Storage may be unavailable in private modes; the in-memory state still works.
  }
}

export function canOfferContextualHint(view: GlobalDocentView): boolean {
  return view === "minimized";
}
