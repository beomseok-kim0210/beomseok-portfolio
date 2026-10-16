"use client";
import { useEffect, useRef } from "react";
import type { WorldRuntime } from "@/features/world/director/worldRuntime";
import { overviewInset, overviewParts } from "@/features/world/adapters/armiOverview";
import { docentOverlayPx } from "@/features/docent/docentOverlay";
import styles from "./journey.module.css";

/**
 * Overview hold (scene 02): the chamber dims except the destination being introduced; a ring sits on the
 * part and a magnified live view (rendered by the pipeline into the same rect) grows out to the opposite side.
 */
export function ArmiOverviewFocus({ runtime }: { runtime: WorldRuntime }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sync = () => {
      const el = root.current; if (!el) return;
      const f = runtime.armiOverview.current;
      const alpha = f >= 0 ? Math.min(1, f / .05, (1 - f) / .05) : 0;
      el.style.opacity = String(Math.max(0, alpha));
      el.style.visibility = alpha > .001 ? "visible" : "hidden";
      if (f < 0) return;
      const W = el.clientWidth, H = el.clientHeight, inset = overviewInset(f, runtime.armiAnchors.current, W, H, W - docentOverlayPx());
      if (!inset) return;
      const { anchor: a } = inset, set = (k: string, v: number) => el.style.setProperty(k, `${v.toFixed(1)}px`);
      set("--fx", a.x); set("--fy", a.y); set("--fr", a.r);
      set("--ix", inset.x); set("--iy", inset.y); set("--iw", inset.w); set("--ih", inset.h);
      el.style.setProperty("--grow", inset.grow.toFixed(3));
      el.dataset.side = inset.side;
      // The veil dims the chamber but never the magnified view (cut out of it, even-odd).
      const veil = el.firstElementChild as HTMLElement | null;
      if (veil) veil.style.clipPath = inset.grow > .03 ? `path(evenodd, "M0 0H${W}V${H}H0Z M${inset.x.toFixed(1)} ${inset.y.toFixed(1)}h${inset.w.toFixed(1)}v${inset.h.toFixed(1)}h${(-inset.w).toFixed(1)}Z")` : "";
      el.querySelectorAll<HTMLElement>("[data-part]").forEach((card, k) => { card.dataset.on = String(k === inset.index); });
    };
    // Anchors are written by the 3D frame after the scroll publish, so keep following them while the hold is on.
    let raf = 0;
    const tick = () => { sync(); raf = runtime.armiOverview.current >= 0 ? requestAnimationFrame(tick) : 0; };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
    kick(); const stop = runtime.subscribeFrame(kick);
    return () => { stop(); cancelAnimationFrame(raf); };
  }, [runtime]);
  return <div ref={root} className={styles.overviewFocus} aria-hidden="true">
    <i className={styles.overviewVeil}/>
    <i className={styles.overviewRing}/>
    <div className={styles.overviewInset}>
      {overviewParts.map((p, k) => <div key={p.id} data-part={p.id} className={styles.overviewCard}>
        <small>DESTINATION {String(k + 1).padStart(2, "0")} / 04</small><strong>{p.name}</strong><span>{p.ko}</span>
      </div>)}
    </div>
  </div>;
}
