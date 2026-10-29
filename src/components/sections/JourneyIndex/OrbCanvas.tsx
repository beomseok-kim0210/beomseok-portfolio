"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { GlassOrb, OrbContent } from "./GlassOrb";
import type { OrbId } from "./OrbScene";
import s from "./journey-index.module.css";

const OrbScene = dynamic(() => import("./OrbScene"), { ssr: false });
const OrbView = dynamic(() => import("./OrbViews").then(m => m.OrbView), { ssr: false });
import { renderTier } from "@/features/world/runtime/renderTier";
import { hasWebGL2 } from "@/lib/webglSupport";

/** 3D glass world when WebGL is available and on screen; the SVG orb is the fallback (and SSR) layer. */
export function OrbCanvas({ id, accent, live = true }: { id: OrbId; accent: string; live?: boolean }) {
  const box = useRef<HTMLSpanElement>(null);
  const [gl, setGl] = useState(false), [active, setActive] = useState(false), [reduced, setReduced] = useState(false), [shared, setShared] = useState(false);
  useEffect(() => {
    setGl(hasWebGL2());
    setShared(renderTier() === "low");
    setReduced(matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = box.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: "0px" });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <span ref={box} className={s.orbStack}>
    {!gl && <GlassOrb id={id} accent={accent}><OrbContent id={id} /></GlassOrb>}
    {/* Low tier: the shared index canvas (OrbStage) draws this box; otherwise one canvas per orb (bloom). */}
    {gl && shared && <OrbView id={id} accent={accent} className={s.orbCanvas} />}
    {gl && !shared && <span className={s.orbCanvas}><OrbScene id={id} accent={accent} active={active && live} reduced={reduced} /></span>}
  </span>;
}
