"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import s from "./journey-index.module.css";

const TunnelScene = dynamic(() => import("./TunnelScene"), { ssr: false });
/** Real screens from each project fly past as glass panels. */
const SCREENS: Record<string, string[]> = {
  "#d2f059": ["/images/armi/patient-tablet-original.webp", "/images/armi/patient-tablet-conversation-original.webp"],
  "#63cbdb": ["/images/hangarae/animatic/upper-normal-47.webp", "/images/hangarae/animatic/lower-normal-17.webp"],
  "#a98bff": ["/images/before_wedding.webp", "/images/after_wedding.webp"],
};

/**
 * Entry tunnel: light streaks rush past from the vanishing point, rings recede, a few glass plates fly
 * by. Intensity is scroll-linked for the default journey and 1 for a direct choice.
 */
export function Tunnel({ accent, intensity, label, fixed = false }: { accent: string; intensity: number; label: { no: string; name: string; line: string }; fixed?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const level = useRef(intensity);
  level.current = intensity;
  const visible = intensity > .002;
  const [webgl, setWebgl] = useState(false);
  useEffect(() => { const c = document.createElement("canvas").getContext("webgl2"); setWebgl(!!c); c?.getExtension("WEBGL_lose_context")?.loseContext(); }, []);
  // 2D streak fallback (no WebGL)
  useEffect(() => {
    const el = canvas.current; if (!el || !visible || webgl) return;
    const ctx = el.getContext("2d"); if (!ctx) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const streaks = Array.from({ length: 150 }, () => ({ a: Math.random() * Math.PI * 2, z: Math.random(), w: .6 + Math.random() * 1.8, sp: .35 + Math.random() * .9 }));
    let raf = 0, last = performance.now(), t = 0;
    const draw = (now: number) => {
      const dpr = Math.min(2, devicePixelRatio || 1), W = el.clientWidth, H = el.clientHeight;
      if (el.width !== Math.round(W * dpr)) { el.width = Math.round(W * dpr); el.height = Math.round(H * dpr); }
      const k = level.current, dt = Math.min(.05, (now - last) / 1000); last = now; t += dt;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const cx = W * .5, cy = H * .5, R = Math.hypot(W, H) * .6;
      // Core glow at the vanishing point.
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * .55);
      core.addColorStop(0, hexA(accent, .55 * k)); core.addColorStop(.25, hexA(accent, .16 * k)); core.addColorStop(1, hexA(accent, 0));
      ctx.fillStyle = core; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      // Receding rings.
      for (let i = 0; i < 7; i++) {
        const z = ((i / 7 + t * .22 * (reduced ? 0 : 1)) % 1), r = Math.pow(z, 2.2) * R * 1.1;
        ctx.strokeStyle = hexA(accent, .22 * k * (1 - z)); ctx.lineWidth = 1 + z * 6;
        ctx.beginPath(); ctx.ellipse(cx, cy, r, r * .82, 0, 0, Math.PI * 2); ctx.stroke();
      }
      // Streaks: move outward with perspective acceleration.
      for (const st of streaks) {
        if (!reduced) st.z += dt * st.sp * (.4 + k * 1.6);
        if (st.z > 1) { st.z -= 1; st.a = Math.random() * Math.PI * 2; }
        const z0 = Math.pow(st.z, 2.4), z1 = Math.pow(Math.min(1, st.z + .06 + k * .1), 2.4);
        const x0 = cx + Math.cos(st.a) * z0 * R, y0 = cy + Math.sin(st.a) * z0 * R * .82;
        const x1 = cx + Math.cos(st.a) * z1 * R, y1 = cy + Math.sin(st.a) * z1 * R * .82;
        ctx.strokeStyle = hexA(st.w > 2 ? "#ffffff" : accent, Math.min(1, .15 + st.z) * k * .9);
        ctx.lineWidth = st.w * (.5 + st.z * 2.2);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [accent, visible, webgl]);
  if (!visible) return null;
  return (
    <div className={fixed ? `${s.tunnel} ${s.tunnelFixed}` : s.tunnel} style={{ "--k": intensity, "--accent": accent } as CSSProperties} aria-hidden="true">
      {webgl ? <div className={s.tunnel3d}><TunnelScene accent={accent} level={level} screens={SCREENS[accent] ?? SCREENS["#d2f059"]} /></div> : <>
        <canvas ref={canvas} />
        <span className={s.plate} data-n="1" /><span className={s.plate} data-n="2" /><span className={s.plate} data-n="3" />
      </>}
      <div className={s.tunnelLabel}><span>{label.no}</span><strong>{label.name}</strong><small>{label.line}</small></div>
    </div>
  );
}

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}
