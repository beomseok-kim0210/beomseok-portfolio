/**
 * The docked docent floats over the page (no reserved layout column). Content that must stay readable
 * avoids it with `--docent-overlay` (globals.css); 3D stages re-centre their composition on the visible
 * part. Keep in sync with globals.css: panel 440 + outer 16 + breathing gap 24.
 */
import { DOCENT_DOCK_MIN_VIEWPORT_WIDTH } from "./globalDocentState";

export const DOCENT_OVERLAY_PX = 480;

/** CSS px the docked panel covers on the right edge (0 when minimized, fullscreen or narrow). */
export function docentOverlayPx(): number {
  if (typeof document === "undefined") return 0;
  return document.documentElement.dataset.globalDocentView === "docked" && window.innerWidth >= DOCENT_DOCK_MIN_VIEWPORT_WIDTH ? DOCENT_OVERLAY_PX : 0;
}

/** Notify when the docent view changes (dock / minimize / fullscreen). */
export function onDocentOverlayChange(callback: () => void): () => void {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-global-docent-view"] });
  return () => observer.disconnect();
}
