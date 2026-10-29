"use client";
import { useEffect, useState } from "react";
import { readWorldLoad } from "@/features/world/runtime/journeyGeometry";

/**
 * Secondary 3D (the docent head, Hangarae bodies) waits until Home's first world is up —
 * or `fallbackMs` passes — and then for an idle slot, so it never competes with the first
 * screen for bandwidth and main thread. Other pages run it on the next idle slot.
 */
export function afterHomeSettles(run: () => void, fallbackMs = 4000): () => void {
  let done = false, idle = 0;
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
  const go = () => {
    if (done) return; done = true; cleanup();
    idle = w.requestIdleCallback ? w.requestIdleCallback(run, { timeout: 1500 }) : window.setTimeout(run, 200);
  };
  const onLoad = () => { if (readWorldLoad().ready) go(); };
  const timer = window.setTimeout(go, location.pathname === "/" ? fallbackMs : 0);
  function cleanup() { window.clearTimeout(timer); window.removeEventListener("portfolio:world-load", onLoad); }
  window.addEventListener("portfolio:world-load", onLoad);
  onLoad();
  return () => { cleanup(); done = true; if (idle) (w.cancelIdleCallback ?? window.clearTimeout)(idle); };
}

export function useAfterHomeSettles(fallbackMs?: number) {
  const [settled, setSettled] = useState(false);
  useEffect(() => afterHomeSettles(() => setSettled(true), fallbackMs), [fallbackMs]);
  return settled;
}
