/**
 * Shared journey grammar for every project world.
 *  - ENTRY  = an aperture (screen-shaped window) opens onto the next world.
 *  - EXIT   = the final frame holds still while the debrief sheet rises over it.
 * Lengths mirror globals.css (--world-gate / --world-debrief); both are 0 on narrow or
 * reduced-motion screens, where the page falls back to plain document flow.
 */
export const JOURNEY_QUERY = "(min-width: 901px) and (prefers-reduced-motion: no-preference)";
const journeyOn = () => typeof window !== "undefined" && window.matchMedia(JOURNEY_QUERY).matches;
/** Scroll the project index holds before ARMI: read & choose, dive, then the ARMI sphere opens (110svh). */
export const GATE_SVH = 1.1;
export const gatePx = () => journeyOn() ? Math.round(window.innerHeight * GATE_SVH) : 0;
/** Scroll spent walking through the Hero doorway into the project index (90svh). */
export const heroGatePx = () => journeyOn() ? Math.round(window.innerHeight * .9) : 0;
/** Scroll during which a project's final frame holds while its debrief sheet rises (100svh − header). */
export const debriefPx = () => journeyOn() ? window.innerHeight - 72 : 0;

const smooth = (t: number) => t * t * (3 - 2 * t);
/**
 * Clip `view` to a centred, screen-shaped window that grows to full size.
 * Centre is the visible stage (clientWidth excludes the docent-avoidance border); the open
 * window still reaches the full border box so the scene spans under the floating docent.
 */
export function applyAperture(view: HTMLElement, open: number, edge?: HTMLElement | null) {
  const t = smooth(Math.max(0, Math.min(1, open)));
  // "none", not "": an unset inline value would fall back to the closed CSS default (journey.module.css).
  if (t >= 1) { view.style.clipPath = "none"; if (edge) edge.style.opacity = "0"; return; }
  if (t <= 0) { view.style.clipPath = "inset(50% 50% 50% 50%)"; if (edge) edge.style.opacity = "0"; return; }
  const FW = view.offsetWidth, SW = view.clientWidth || FW, H = view.clientHeight;
  const halfW = SW * .13, halfH = H * .11, k = 1 - t;
  const left = k * (SW / 2 - halfW), right = k * (FW - SW / 2 - halfW), top = k * (H / 2 - halfH), radius = 26 * k + 2;
  view.style.clipPath = `inset(${top}px ${right}px ${top}px ${left}px round ${radius}px)`;
  // translate + size (not inset offsets) so the moving rim is not counted as layout shift
  if (edge) Object.assign(edge.style, { left: "0px", top: "0px", right: "auto", bottom: "auto", translate: `${left}px ${top}px`, width: `${Math.max(0, FW - left - right)}px`, height: `${Math.max(0, H - 2 * top)}px`, borderRadius: `${radius}px`, opacity: String(t > .001 ? 1 - smooth(Math.max(0, (t - .8) / .2)) : 0) });
}

/** Circular aperture: the selected project sphere opens into its world (index → ARMI). */
export function applyCircleAperture(view: HTMLElement, open: number, cx: number, cy: number, startRadius: number) {
  const t = smooth(Math.max(0, Math.min(1, open)));
  if (t >= 1) { view.style.clipPath = "none"; return; }
  if (t <= 0) { view.style.clipPath = "circle(0px at 50% 50%)"; return; }
  const W = view.offsetWidth, H = view.clientHeight, far = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy));
  view.style.clipPath = `circle(${startRadius + (far - startRadius) * t}px at ${cx}px ${cy}px)`;
}

/** Lenis-aware scroll (SmoothScroll exposes the instance); falls back to native scrolling. */
type LenisLike = { scrollTo: (target: number, options?: { duration?: number; immediate?: boolean; force?: boolean; easing?: (t: number) => number }) => void };
declare global { interface Window { __lenis?: LenisLike } }
export function scrollToY(y: number, options: { duration?: number; immediate?: boolean } = {}) {
  const lenis = window.__lenis;
  if (lenis) lenis.scrollTo(y, { force: true, ...options, ...(options.immediate ? {} : { easing: (t: number) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 }) });
  else window.scrollTo({ top: y, behavior: options.immediate ? "instant" : "smooth" });
}

/* ── Entry readiness (Home waits for nothing; it only reports) ───────────────── */
type WorldLoad = { progress: number; ready: boolean };
declare global { interface Window { __portfolioWorld?: WorldLoad } }
const state = (): WorldLoad => (window.__portfolioWorld ??= { progress: 0, ready: false });
export function reportWorldProgress(progress: number) {
  const s = state(); if (s.ready) return;
  // LoadingManager reaches 100% between batches while its item list still grows; only ready() completes.
  s.progress = Math.max(s.progress, Math.min(.95, progress));
  window.dispatchEvent(new Event("portfolio:world-load"));
}
/** Called when the ARMI scene is renderable, or when the page settles on its non-WebGL path. */
export function reportWorldReady() {
  const s = state(); if (s.ready) return;
  s.ready = true; s.progress = 1;
  window.dispatchEvent(new Event("portfolio:world-load"));
}
export function readWorldLoad(): WorldLoad { return typeof window === "undefined" ? { progress: 0, ready: false } : { ...state() }; }
