export const GLOBAL_DOCENT_VIEW_STORAGE_KEY = "portfolio:ai-docent:view-state";

export type GlobalDocentView = "expanded" | "minimized";

export type GlobalDocentPresentationEvent =
  | { type: "EXPAND" }
  | { type: "MINIMIZE" }
  | { type: "HYDRATE"; view: GlobalDocentView };

export const initialGlobalDocentState: GlobalDocentView = "expanded";

export const MOBILE_DOCENT_BREAKPOINT = 768;

// The widest established portfolio container is 1440px. Global border-box sizing
// means its own horizontal padding is already included in that outer width.
export const PORTFOLIO_CANONICAL_CONTENT_WIDTH = 1440;
export const DESKTOP_DOCENT_PANEL_WIDTH = 390;
export const DESKTOP_DOCENT_EDGE_MARGIN = 24;
export const DESKTOP_DOCENT_CANVAS_GAP = 24;
export const DOCENT_DOCK_MIN_VIEWPORT_WIDTH =
  PORTFOLIO_CANONICAL_CONTENT_WIDTH
  + 2 * (
    DESKTOP_DOCENT_PANEL_WIDTH
    + DESKTOP_DOCENT_EDGE_MARGIN
    + DESKTOP_DOCENT_CANVAS_GAP
  );

/** Whether the centered portfolio's right outer gutter can contain the sidecar. */
export function canDockGlobalDocent(viewportWidth: number): boolean {
  const freeOuterGutter =
    (viewportWidth - PORTFOLIO_CANONICAL_CONTENT_WIDTH) / 2;
  return freeOuterGutter
    >= DESKTOP_DOCENT_PANEL_WIDTH
      + DESKTOP_DOCENT_EDGE_MARGIN
      + DESKTOP_DOCENT_CANVAS_GAP;
}

/** First visits expand only when the fixed sidecar fits outside the portfolio canvas. */
export function defaultGlobalDocentView(viewportWidth: number): GlobalDocentView {
  return canDockGlobalDocent(viewportWidth) ? "expanded" : "minimized";
}

/** The dock has one presentation source of truth: expanded or minimized. */
export function globalDocentPresentationReducer(
  state: GlobalDocentView,
  event: GlobalDocentPresentationEvent,
): GlobalDocentView {
  switch (event.type) {
    case "EXPAND":
      return "expanded";
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
    return value === "minimized" || value === "expanded"
      ? value
      : firstVisitDefault;
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
