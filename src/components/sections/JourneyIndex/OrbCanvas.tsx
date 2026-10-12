"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { GlassOrb, OrbContent } from "./GlassOrb";
import type { OrbId } from "./OrbScene";
import s from "./journey-index.module.css";

const OrbScene = dynamic(() => import("./OrbScene"), { ssr: false });

/** 3D glass world when WebGL is available and on screen; the SVG orb is the fallback (and SSR) layer. */
export function OrbCanvas({ id, accent, live = true }: { id: OrbId; accent: string; live?: boolean }) {
  const box = useRef<HTMLSpanElement>(null);
  const [gl, setGl] = useState(false), [active, setActive] = useState(false), [reduced, setReduced] = useState(false);
  useEffect(() => {
    const c = document.createElement("canvas"), ctx = c.getContext("webgl2");
    setGl(!!ctx); ctx?.getExtension("WEBGL_lose_context")?.loseContext();
    setReduced(matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = box.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: "0px" });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <span ref={box} className={s.orbStack}>
    {!gl && <GlassOrb id={id} accent={accent}><OrbContent id={id} /></GlassOrb>}
    {gl && <span className={s.orbCanvas}><OrbScene id={id} accent={accent} active={active && live} reduced={reduced} /></span>}
  </span>;
}
