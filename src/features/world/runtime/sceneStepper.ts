"use client";
import { scrollToY } from "./journeyGeometry";

/**
 * Scene stepper: inside a registered "stepped" range one gesture = one scene, however far the
 * wheel / trackpad travels. Outside every range the page scrolls freely (briefs, contact, details).
 *
 *  - A gesture is a burst of wheel events; it ends after WHEEL_IDLE ms of silence, so trackpad
 *    inertia never skips two scenes.
 *  - The move between stops is a glide; the scene's own timeline (scrubbed by scroll) plays as an
 *    authored animation on the way. A new gesture during a glide is never ignored: it retargets the
 *    glide one stop further (the visitor does not have to wait for an animation to finish).
 *  - Keyboard (↓ ↑ Space PageDown PageUp) steps too. Scrollbar drags and anchor jumps land on the
 *    nearest stop once scrolling settles.
 *  - Touch: one swipe = one scene (phones and tablets).
 *  - Off for reduced motion, narrow non-touch windows, and inside the docent panel or any focused input.
 */
export type Stop = { y: number; duration?: number; label?: string };
export type SteppedRange = { id: string; stops: () => Stop[]; enabled: () => boolean };

const WHEEL_IDLE = 320, SETTLE = 260, EDGE = 3;
const ranges = new Map<string, SteppedRange>();
let installed = false, busyUntil = 0, lastWheel = 0, gestureUsed = false, gestureRegion: number | null = null, lastY = 0, settleTimer = 0, ownScroll = false;
/** The stop the current glide is heading to; `glide` invalidates the landing check of a superseded glide. */
let target: Stop | null = null, glide = 0;
const busy = () => performance.now() < busyUntil;

const touchDevice = () => window.matchMedia("(pointer: coarse)").matches;
const isOn = () => (window.innerWidth > 900 || touchDevice()) && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const insideIgnored = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  return !!el?.closest?.("[data-docent-panel], input:not([type=range]):not([type=checkbox]):not([type=radio]), textarea, select, [contenteditable=true], [data-step-ignore]");
};
/** Ranges whose end and start stops coincide (e.g. ARMI brief → Hangarae entry) merge into one region. */
function regions() {
  const lists = [...ranges.values()].filter(r => r.enabled()).map(r => r.stops()).filter(s => s.length >= 2).sort((a, b) => a[0].y - b[0].y);
  const out: Stop[][] = [];
  for (const list of lists) {
    const last = out[out.length - 1];
    if (last && list[0].y <= last[last.length - 1].y + 4) { for (const s of list) if (s.y > last[last.length - 1].y + 4) last.push(s); }
    else out.push([...list]);
  }
  return out;
}
/** The active region is the one whose first..last stop span contains the current scroll position. */
function active(y = window.scrollY) {
  for (const stops of regions()) if (y >= stops[0].y - EDGE && y <= stops[stops.length - 1].y + EDGE) return stops;
  return null;
}
function go(stop: Stop, fallback: number) {
  const duration = stop.duration ?? fallback, id = ++glide;
  busyUntil = performance.now() + duration * 1000 + 80;
  ownScroll = true; target = stop;
  scrollToY(stop.y, { duration, lock: true });
  window.setTimeout(() => {
    if (id !== glide) return; // retargeted by a newer gesture
    // A layout refresh during the glide (pinned briefs, ScrollTrigger) can stop it short: finish the landing.
    if (Math.abs(window.scrollY - stop.y) > 6) {
      busyUntil = performance.now() + 480;
      scrollToY(stop.y, { duration: .4, lock: true });
      window.setTimeout(() => { if (id === glide) { ownScroll = false; target = null; } }, 520);
    } else { ownScroll = false; target = null; }
  }, duration * 1000 + 120);
}
/** Step in a direction. During a glide the step counts from the glide's target, so each gesture moves one
 *  stop further. Returns false when the range has no stop that way (let the page scroll). */
function step(dir: 1 | -1): boolean {
  const from = busy() && target ? target.y : window.scrollY;
  const stops = active(from) ?? active(); if (!stops) return false;
  const y = from;
  const next = dir > 0 ? stops.find(s => s.y > y + EDGE) : [...stops].reverse().find(s => s.y < y - EDGE);
  if (!next) return false;
  go(next, 1.3);
  return true;
}

function onWheel(e: WheelEvent) {
  if (!isOn() || e.ctrlKey || insideIgnored(e.target)) return;
  // A new gesture is a pause in the wheel stream (trackpad inertia never pauses, so it never counts twice).
  const now = performance.now(), fresh = now - lastWheel > WHEEL_IDLE;
  lastWheel = now;
  if (fresh) { gestureUsed = false; gestureRegion = active()?.[0].y ?? null; }
  const stops = active();
  if (!stops) return;
  const dir: 1 | -1 = e.deltaY > 0 ? 1 : -1;
  // A gesture that started outside this region (free page or another region) lands on its boundary stop.
  if (gestureRegion !== stops[0].y && !gestureUsed) {
    e.preventDefault(); e.stopImmediatePropagation();
    go(dir > 0 ? stops[0] : stops[stops.length - 1], .9); gestureUsed = true; return;
  }
  // Leaving through the first/last stop belongs to the free page: do not swallow it.
  const y = window.scrollY, atFirst = Math.abs(y - stops[0].y) <= EDGE, atLast = Math.abs(y - stops[stops.length - 1].y) <= EDGE;
  if ((dir < 0 && atFirst) || (dir > 0 && atLast)) { if (!gestureUsed && !busy()) return; }
  e.preventDefault(); e.stopImmediatePropagation();
  if (gestureUsed || Math.abs(e.deltaY) < 2) return;
  // One step per gesture, even mid-glide (it retargets the glide one stop further).
  gestureUsed = step(dir) || busy();
}
function onKey(e: KeyboardEvent) {
  if (!isOn() || insideIgnored(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
  const dir = e.key === "ArrowDown" || e.key === "PageDown" || (e.key === " " && !e.shiftKey) ? 1
    : e.key === "ArrowUp" || e.key === "PageUp" || (e.key === " " && e.shiftKey) ? -1 : 0;
  if (!dir || !active()) return;
  if (step(dir as 1 | -1) || busy()) e.preventDefault();
}
/** Scrollbar drags, anchor jumps, deep links: settle onto the nearest stop. */
function onScroll() {
  const y = window.scrollY, prev = lastY; lastY = y;
  if (ownScroll || !isOn()) return;
  // Momentum from the free page that crosses into a range is caught on its boundary stop.
  const now = active(y);
  // (Only for continuous motion: a long jump — index choice, deep link, anchor — settles on its nearest stop instead.)
  if (now && !active(prev) && Math.abs(y - prev) < window.innerHeight * .5 && performance.now() > busyUntil) { go(y > prev ? now[0] : now[now.length - 1], .9); gestureUsed = true; return; }
  window.clearTimeout(settleTimer);
  settleTimer = window.setTimeout(() => {
    if (ownScroll || performance.now() < busyUntil || performance.now() - lastWheel < SETTLE) return;
    const stops = active(); if (!stops) return;
    const yy = window.scrollY, near = stops.reduce((a, b) => Math.abs(b.y - yy) < Math.abs(a.y - yy) ? b : a);
    if (Math.abs(near.y - yy) > EDGE) go({ y: near.y }, .7);
  }, SETTLE);
}

/* Touch: the swipe is held (no native scroll) while inside a region and stepped on release. Swiping out
   through the first / last stop stays native, so the page can be left freely. */
let touchY = 0, touchOwned = false, touchLast = 0;
function onTouchStart(e: TouchEvent) {
  touchOwned = false;
  if (!isOn() || e.touches.length !== 1 || insideIgnored(e.target)) return;
  touchY = touchLast = e.touches[0].clientY;
  touchOwned = !!active();
}
function onTouchMove(e: TouchEvent) {
  if (!touchOwned || e.touches.length !== 1) return;
  const y = e.touches[0].clientY; touchLast = y;
  const stops = active(); if (!stops) { touchOwned = false; return; }
  const dir = touchY - y > 0 ? 1 : -1, sy = window.scrollY;
  const atFirst = Math.abs(sy - stops[0].y) <= EDGE, atLast = Math.abs(sy - stops[stops.length - 1].y) <= EDGE;
  // Leaving the region through its boundary stop is a free-page gesture.
  if (Math.abs(touchY - y) > 8 && ((dir < 0 && atFirst) || (dir > 0 && atLast)) && !busy()) { touchOwned = false; return; }
  if (e.cancelable) e.preventDefault();
}
function onTouchEnd() {
  if (!touchOwned) return;
  touchOwned = false;
  const dy = touchY - touchLast;
  if (Math.abs(dy) < 28) return;
  step(dy > 0 ? 1 : -1);
}

function install() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("wheel", onWheel, { passive: false, capture: true });
  window.addEventListener("keydown", onKey, { capture: true });
  window.addEventListener("touchstart", onTouchStart, { passive: true, capture: true });
  window.addEventListener("touchmove", onTouchMove, { passive: false, capture: true });
  window.addEventListener("touchend", onTouchEnd, { capture: true });
  window.addEventListener("touchcancel", onTouchEnd, { capture: true });
  lastY = window.scrollY;
  window.addEventListener("scroll", onScroll, { passive: true });
}
function uninstall() {
  if (!installed || ranges.size) return;
  installed = false;
  window.removeEventListener("wheel", onWheel, { capture: true } as EventListenerOptions);
  window.removeEventListener("keydown", onKey, { capture: true } as EventListenerOptions);
  for (const [t, f] of [["touchstart", onTouchStart], ["touchmove", onTouchMove], ["touchend", onTouchEnd], ["touchcancel", onTouchEnd]] as const) window.removeEventListener(t, f as EventListener, { capture: true } as EventListenerOptions);
  window.removeEventListener("scroll", onScroll);
}
export function registerSteppedRange(range: SteppedRange) {
  ranges.set(range.id, range); install();
  return () => { ranges.delete(range.id); uninstall(); };
}
/** First stop of a registered range (lets an earlier range end exactly where the next one begins). */
export function firstStopOf(id: string): Stop | null {
  const range = ranges.get(id); if (!range?.enabled()) return null;
  return range.stops()[0] ?? null;
}
/** Diagnostics for QA scripts: the stops of every registered range (y, label). */
if (typeof window !== "undefined") (window as unknown as { __stepperStops?: () => unknown }).__stepperStops = () => [...ranges.values()].map(r => r.stops().map(s => [Math.round(s.y), s.label]));
/** True while a stepper glide is running (other autoplay must stand down). */
export const stepperBusy = () => typeof performance !== "undefined" && performance.now() < busyUntil;
