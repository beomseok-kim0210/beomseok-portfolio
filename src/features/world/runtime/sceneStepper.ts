"use client";
import { scrollToY } from "./journeyGeometry";

/**
 * Scene stepper: inside a registered "stepped" range one gesture = one scene, however far the
 * wheel / trackpad travels. Outside every range the page scrolls freely (briefs, contact, details).
 *
 *  - A gesture is a burst of wheel events; it ends after WHEEL_IDLE ms of silence, so trackpad
 *    inertia never skips two scenes.
 *  - The move between stops is an input-locked glide; the scene's own timeline (scrubbed by scroll)
 *    plays as an authored animation on the way.
 *  - Keyboard (↓ ↑ Space PageDown PageUp) steps too. Scrollbar drags and anchor jumps land on the
 *    nearest stop once scrolling settles.
 *  - Off on narrow screens, reduced motion, and inside the docent panel or any focused input.
 */
export type Stop = { y: number; duration?: number; label?: string };
export type SteppedRange = { id: string; stops: () => Stop[]; enabled: () => boolean };

const WHEEL_IDLE = 320, COOLDOWN = 220, SETTLE = 260, EDGE = 3;
const ranges = new Map<string, SteppedRange>();
let installed = false, busyUntil = 0, lastWheel = 0, gestureUsed = false, gestureRegion: number | null = null, lastY = 0, settleTimer = 0, ownScroll = false;

const isOn = () => window.innerWidth > 900 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
  const duration = stop.duration ?? fallback;
  busyUntil = performance.now() + duration * 1000 + 80;
  ownScroll = true;
  scrollToY(stop.y, { duration, lock: true });
  window.setTimeout(() => {
    // A layout refresh during the glide (pinned briefs, ScrollTrigger) can stop it short: finish the landing.
    if (Math.abs(window.scrollY - stop.y) > 6) {
      busyUntil = performance.now() + 480;
      scrollToY(stop.y, { duration: .4, lock: true });
      window.setTimeout(() => { ownScroll = false; }, 520);
    } else ownScroll = false;
  }, duration * 1000 + 120);
}
/** Step in a direction from the current position. Returns false when the range has no stop that way (let the page scroll). */
function step(dir: 1 | -1): boolean {
  const stops = active(); if (!stops) return false;
  const y = window.scrollY;
  const next = dir > 0 ? stops.find(s => s.y > y + EDGE) : [...stops].reverse().find(s => s.y < y - EDGE);
  if (!next) return false;
  go(next, 1.3);
  return true;
}

function onWheel(e: WheelEvent) {
  if (!isOn() || e.ctrlKey || insideIgnored(e.target)) return;
  // A new gesture needs a pause in the wheel stream AND the previous move (plus a short cooldown) to be over.
  const now = performance.now(), fresh = now - lastWheel > WHEEL_IDLE && now > busyUntil + COOLDOWN;
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
  if ((dir < 0 && atFirst) || (dir > 0 && atLast)) { if (!gestureUsed && now > busyUntil) return; }
  e.preventDefault(); e.stopImmediatePropagation();
  if (gestureUsed || now < busyUntil || Math.abs(e.deltaY) < 2) return;
  gestureUsed = step(dir);
}
function onKey(e: KeyboardEvent) {
  if (!isOn() || insideIgnored(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
  const dir = e.key === "ArrowDown" || e.key === "PageDown" || (e.key === " " && !e.shiftKey) ? 1
    : e.key === "ArrowUp" || e.key === "PageUp" || (e.key === " " && e.shiftKey) ? -1 : 0;
  if (!dir || !active()) return;
  if (performance.now() < busyUntil) { e.preventDefault(); return; }
  if (step(dir as 1 | -1)) e.preventDefault();
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

function install() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("wheel", onWheel, { passive: false, capture: true });
  window.addEventListener("keydown", onKey, { capture: true });
  lastY = window.scrollY;
  window.addEventListener("scroll", onScroll, { passive: true });
}
function uninstall() {
  if (!installed || ranges.size) return;
  installed = false;
  window.removeEventListener("wheel", onWheel, { capture: true } as EventListenerOptions);
  window.removeEventListener("keydown", onKey, { capture: true } as EventListenerOptions);
  window.removeEventListener("scroll", onScroll);
}
export function registerSteppedRange(range: SteppedRange) {
  ranges.set(range.id, range); install();
  return () => { ranges.delete(range.id); uninstall(); };
}
/** True while a stepper glide is running (other autoplay must stand down). */
/** Diagnostics for QA scripts: the stops of every registered range (y, label). */
if (typeof window !== "undefined") (window as unknown as { __stepperStops?: () => unknown }).__stepperStops = () => [...ranges.values()].map(r => r.stops().map(s => [Math.round(s.y), s.label]));
export const stepperBusy = () => typeof performance !== "undefined" && performance.now() < busyUntil;
