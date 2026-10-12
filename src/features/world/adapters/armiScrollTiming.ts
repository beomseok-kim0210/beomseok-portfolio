/** Expand inspection/selection scroll distance without changing authored scene samples. */
export const selectionExtraScroll = .03;
export const coreExtraScroll = .12; // was .24: the request card held ~3 identical screens
export function armiScrollProgress(scroll: number) {
  const expanded = Math.max(0, Math.min(1, scroll)) * (1 + selectionExtraScroll + coreExtraScroll);
  if (expanded <= .31) return expanded;
  if (expanded < .345 + coreExtraScroll) return .31 + (expanded - .31) * (.035 / (.035 + coreExtraScroll));
  const p = expanded - coreExtraScroll;
  if (p <= .402) return p;
  if (p < .472) return .402 + (p - .402) * (.04 / .07);
  return Math.min(1, p - selectionExtraScroll);
}
