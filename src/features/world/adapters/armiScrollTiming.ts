/** Expand inspection/selection scroll distance without changing authored scene samples. */
export const selectionExtraScroll = .03;
export const coreExtraScroll = .12; // was .24: the request card held ~3 identical screens
/** Establishing shot right after entering the system: the whole chamber with all four destinations in view.
 *  The camera holds there while the four parts are introduced one at a time (TEXT → ROBOT → TAVILY → MEMORY). */
export const ARMI_OVERVIEW_P = .212;
export const overviewExtraScroll = .08;
const LENGTH = 1 + selectionExtraScroll + coreExtraScroll + overviewExtraScroll;

/** Legacy pacing on the "expanded" axis without the overview hold. */
function legacyProgress(expanded: number) {
  if (expanded <= .31) return expanded;
  if (expanded < .345 + coreExtraScroll) return .31 + (expanded - .31) * (.035 / (.035 + coreExtraScroll));
  const p = expanded - coreExtraScroll;
  if (p <= .402) return p;
  if (p < .472) return .402 + (p - .402) * (.04 / .07);
  return Math.min(1, p - selectionExtraScroll);
}
function legacyExpanded(p: number) {
  if (p <= .31) return p;
  if (p <= .345) return .31 + (p - .31) * ((.035 + coreExtraScroll) / .035);
  if (p <= .402) return p + coreExtraScroll;
  if (p <= .442) return .402 + (p - .402) * (.07 / .04) + coreExtraScroll;
  return p + selectionExtraScroll + coreExtraScroll;
}
export function armiScrollProgress(scroll: number) {
  const e = Math.max(0, Math.min(1, scroll)) * LENGTH;
  const legacy = e <= ARMI_OVERVIEW_P ? e : e < ARMI_OVERVIEW_P + overviewExtraScroll ? ARMI_OVERVIEW_P : e - overviewExtraScroll;
  return legacyProgress(legacy);
}
/** 0..1 inside the overview hold, -1 outside it. */
export function armiOverviewFocus(scroll: number) {
  const e = Math.max(0, Math.min(1, scroll)) * LENGTH - ARMI_OVERVIEW_P;
  return e > 0 && e < overviewExtraScroll ? e / overviewExtraScroll : -1;
}
/** Inverse of armiScrollProgress: journey progress → scroll fraction (for scene stops). */
export function armiProgressToScroll(p: number) {
  const legacy = legacyExpanded(p), e = legacy <= ARMI_OVERVIEW_P ? legacy : legacy + overviewExtraScroll;
  return Math.max(0, Math.min(1, e / LENGTH));
}
/** Scroll fraction for a point inside the overview hold (f 0..1). */
export const armiOverviewToScroll = (f: number) => (ARMI_OVERVIEW_P + overviewExtraScroll * f) / LENGTH;
