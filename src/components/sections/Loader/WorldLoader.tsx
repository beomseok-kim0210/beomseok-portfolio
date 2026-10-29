"use client";
import { useEffect, useRef, useState } from "react";
import { readWorldLoad } from "@/features/world/runtime/journeyGeometry";
import s from "./world-loader.module.css";

/**
 * First-visit loading screen. It reflects real readiness, never pads time:
 *   LOADING %  → three.js asset progress (capped until the scene exists)
 *   3D ASSETS  → GLB + decoder fetched      SCENE GRAPH → ARMI chamber built
 *   INTERACTION→ page hydrated & interactive READY      → leave
 * Fast visits leave almost immediately; a repeat visit in the same session never shows it;
 * WebGL-less / failed loads report ready from the ARMI side; a 1.6s ceiling from navigation start
 * guarantees entry (CSS enforces it even before script) — the ARMI world keeps loading behind the
 * closed aperture, two screens away.
 * Without script, CSS fades it out at the same ceiling (world-loader.module.css).
 */
const STEPS = ["3D ASSETS", "SCENE GRAPH", "INTERACTION", "READY"] as const;
/** Matches the CSS auto-hide delay: past it the overlay is already gone, so script must not revive it. */
const LOADER_CAP_MS = 1600;

export function WorldLoader() {
  const [state, setState] = useState({ progress: 0, ready: false, hydrated: false });
  const [phase, setPhase] = useState<"show" | "leave" | "gone">("show");
  const born = useRef(0);

  useEffect(() => {
    born.current = performance.now();
    let seen = false;
    try { seen = sessionStorage.getItem("portfolio:loaded") === "1"; } catch { /* storage blocked */ }
    // Hydrated after the CSS cap: the overlay already faded out on its own; leave it gone (no scroll lock).
    if (seen || performance.now() >= LOADER_CAP_MS) { setPhase("gone"); return; }
    // Progress events must not undo the ceiling: readiness only ever moves forward.
    const sync = () => setState(st => { const w = readWorldLoad(); return { progress: Math.max(st.progress, w.progress), ready: st.ready || w.ready, hydrated: true }; });
    sync();
    window.addEventListener("portfolio:world-load", sync);
    // Counted from navigation start, so slow hydration does not stack on top of the ceiling.
    const ceiling = window.setTimeout(() => setState(st => ({ ...st, ready: true, progress: 1 })), LOADER_CAP_MS - performance.now());
    const root = document.documentElement; root.style.overflow = "hidden";
    return () => { window.removeEventListener("portfolio:world-load", sync); window.clearTimeout(ceiling); root.style.overflow = ""; };
  }, []);

  // Depends on readiness only: a phase change must not cancel the pending exit (it did once,
  // leaving an invisible overlay that kept the page scroll-locked).
  const ready = state.ready;
  useEffect(() => {
    if (!ready) return;
    const quick = performance.now() - born.current < 700, hold = quick ? 150 : 250;
    const t1 = window.setTimeout(() => setPhase(p => p === "show" ? "leave" : p), hold);
    const t2 = window.setTimeout(() => {
      setPhase("gone"); document.documentElement.style.overflow = "";
      try { sessionStorage.setItem("portfolio:loaded", "1"); } catch { /* storage blocked */ }
    }, hold + 600);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [ready]);

  if (phase === "gone") return null;
  const pct = state.ready ? 100 : Math.round(state.progress * 100);
  const done = [state.progress >= .95 || state.ready, state.ready, state.ready && state.hydrated, state.ready && state.hydrated];
  const active = done.findIndex(d => !d);
  return (
    <div className={s.loader} data-loader data-phase={phase} data-js={state.hydrated || undefined} role="status" aria-live="polite" aria-label={`포트폴리오 준비 중 ${pct}%`}>
      <span className={s.brand}>KIM BEOM SEOK</span>
      <span className={s.role}>AI PRODUCT ENGINEER</span>
      <Globe />
      <ol className={s.steps}>
        <li data-state="active"><i /><span>LOADING</span><b>{pct}%</b></li>
        {STEPS.map((label, i) => <li key={label} data-state={done[i] ? "done" : i === active ? "next" : "wait"}><i /><span>{label}</span></li>)}
      </ol>
      <div className={s.caption}><p>PREPARING MY PORTFOLIO</p><small>기술이 실제 경험으로 이어지는 과정을 준비하고 있습니다.</small></div>
    </div>
  );
}

/** Particle globe lit from the upper right, with tilted orbits (canvas + SVG rings). */
function Globe() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = canvas.current; if (!el) return;
    const ctx = el.getContext("2d"); if (!ctx) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Random (not lattice) points read as a field of stars on the surface, plus a few inside for depth.
    // 1400 points at 30fps with a pre-built palette: the globe must not steal the main thread from hydration.
    const N = 1400, pts = Array.from({ length: N }, (_, i) => {
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u), d = i % 9 === 0 ? .55 + Math.random() * .4 : 1;
      return [Math.cos(a) * r * d, u * d, Math.sin(a) * r * d, Math.random()] as const;
    });
    const palette = Array.from({ length: 9 }, (_, i) => `rgb(${175 + i * 10},${208 + i * 6},255)`);
    let raf = 0, t = 0, last = performance.now(), drawn = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - drawn < 31) return; drawn = now;
      const dpr = Math.min(2, devicePixelRatio || 1), W = el.clientWidth, H = el.clientHeight;
      if (el.width !== Math.round(W * dpr)) { el.width = Math.round(W * dpr); el.height = Math.round(H * dpr); }
      t += reduced ? 0 : Math.min(.05, (now - last) / 1000) * .18; last = now;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2, R = Math.min(W, H) * .4, tilt = .32, ct = Math.cos(tilt), st = Math.sin(tilt);
      // body + rim light
      const body = ctx.createRadialGradient(cx - R * .25, cy - R * .2, R * .1, cx, cy, R);
      body.addColorStop(0, "rgba(40,78,140,.38)"); body.addColorStop(.85, "rgba(14,28,56,.6)"); body.addColorStop(1, "rgba(120,190,255,.0)");
      ctx.fillStyle = body; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
      const rim = ctx.createLinearGradient(cx - R, cy + R, cx + R, cy - R);
      rim.addColorStop(0, "rgba(120,180,255,.05)"); rim.addColorStop(.7, "rgba(140,200,255,.35)"); rim.addColorStop(1, "rgba(220,240,255,.95)");
      ctx.strokeStyle = rim; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
      ctx.globalCompositeOperation = "lighter";
      for (const [x0, y0, z0, k] of pts) {
        const ca = Math.cos(t), sa = Math.sin(t);
        const x = x0 * ca + z0 * sa, z = -x0 * sa + z0 * ca;
        const y = y0 * ct - z * st, zz = y0 * st + z * ct;
        const front = zz > 0, light = Math.max(0, x * .55 - y * .45 + zz * .5);
        const tw = .65 + .35 * Math.sin(now / 600 + k * 40);
        const a = (front ? .38 + light * .62 : .12) * (.45 + k * .55) * tw;
        const px = cx + x * R, py = cy + y * R;
        ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = palette[Math.min(8, light * 8 | 0)];
        const size = front ? .8 + light * 1.3 : .55;
        ctx.fillRect(px - size / 2, py - size / 2, size, size);
        if (front && k > .9 && light > .3) { ctx.globalAlpha = a * .25; ctx.fillStyle = "rgb(200,230,255)"; ctx.beginPath(); ctx.arc(px, py, 3.2 + light * 2, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className={s.globe} aria-hidden="true">
      <svg className={s.orbits} viewBox="-300 -200 600 400">
        <defs>
          <linearGradient id="ld-ring" x1="0" x2="1"><stop offset="0" stopColor="#8fc4ff" stopOpacity=".15" /><stop offset=".55" stopColor="#dff0ff" stopOpacity=".95" /><stop offset="1" stopColor="#8fc4ff" stopOpacity=".2" /></linearGradient>
          <filter id="ld-glow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="2.2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <g transform="rotate(-4)"><ellipse rx="268" ry="38" fill="none" stroke="url(#ld-ring)" strokeWidth="2" filter="url(#ld-glow)" /><ellipse rx="232" ry="30" fill="none" stroke="#9fd0ff" strokeOpacity=".4" /></g>
        <g transform="rotate(6) translate(0 -46)"><ellipse rx="210" ry="30" fill="none" stroke="#9fd0ff" strokeOpacity=".35" strokeDasharray="2 6" /></g>
        <g transform="rotate(-4)" filter="url(#ld-glow)"><circle cx="-96" cy="34" r="3" fill="#ffffff" /><circle cx="150" cy="-31" r="2.2" fill="#dff0ff" /></g>
        <g stroke="#8fb6e6" strokeOpacity=".3" fill="#cfe6ff"><path d="M-250 -60 L-210 -110 L-150 -120" fill="none" /><circle cx="-250" cy="-60" r="1.8" /><path d="M240 90 L210 140 L150 150" fill="none" /><circle cx="240" cy="90" r="1.8" /><circle cx="-180" cy="120" r="1.5" /></g>
      </svg>
      <canvas ref={canvas} />
    </div>
  );
}
