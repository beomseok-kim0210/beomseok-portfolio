"use client";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useWorldHost } from "@/features/world/runtime/WorldHost";
import { worldPositionForDomProgress } from "@/features/world/director/worldRuntime";
import type { WorldRenderMode } from "@/features/world/types/contracts";
import { labOuter, labScenes, labStations, labStopInner, sampleLab } from "@/features/world/adapters/labRoom";
import { applyAperture } from "@/features/world/runtime/journeyGeometry";
import { registerSteppedRange } from "@/features/world/runtime/sceneStepper";
import { onDocentOverlayChange } from "@/features/docent/docentOverlay";
import { observeScrollLayout } from "../observeScrollLayout";
import { SceneChrome, SceneFooter } from "../SceneHud";
import styles from "./lab.module.css";

/**
 * 04 Personal Lab (shell). The room, the stations, the stepping and the HUD are built; every project
 * scene shows an EMPTY content slot on its station screen, to be filled with the owner's material.
 */
export function LabExperience() {
  const section = useRef<HTMLElement>(null), viewport = useRef<HTMLDivElement>(null), surface = useRef<HTMLDivElement>(null), edge = useRef<HTMLDivElement>(null);
  const { runtime, setSurface } = useWorldHost();
  const [mode, setMode] = useState<WorldRenderMode>("static"), [active, setActive] = useState(false), [index, setIndex] = useState(0);
  const fail = useCallback(() => setMode("fallback"), []);
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => { if (motion.matches) setMode("reduced-motion"); else { const c = document.createElement("canvas"), gl = c.getContext("webgl2"); setMode(gl ? "webgl" : "fallback"); gl?.getExtension("WEBGL_lose_context")?.loseContext(); } };
    sync(); motion.addEventListener("change", sync);
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting)); if (section.current) io.observe(section.current);
    return () => { io.disconnect(); motion.removeEventListener("change", sync); };
  }, []);
  useEffect(() => { if (surface.current) setSurface({ element: surface.current, video: null, active, mode, onFailure: fail }, "experimental-wing"); return () => setSurface(null, "experimental-wing"); }, [setSurface, mode, active, fail]);
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const node = section.current, view = viewport.current; if (!node || !view) return;
    runtime.labViewport.current = view;
    let previous = -1;
    const apply = (p: number) => {
      const s = sampleLab(p);
      const box = node.getBoundingClientRect();
      if (box.top < innerHeight && box.bottom > 72) runtime.publish(worldPositionForDomProgress("experimental-wing", p), mode);
      node.dataset.worldDistrict = "experimental-wing"; node.dataset.worldProgress = String(p);
      view.dataset.phase = s.scene.id; view.dataset.station = s.scene.station ?? ""; view.dataset.compact = String(view.clientWidth <= 700);
      view.style.setProperty("--intro", s.intro.toFixed(3)); view.style.setProperty("--slot", s.slot.toFixed(3)); view.style.setProperty("--rail", s.rail.toFixed(4));
      applyAperture(view, innerWidth > 900 && mode !== "reduced-motion" ? s.entry : 1, edge.current);
      if (previous !== s.index) { previous = s.index; setIndex(s.index); }
    };
    const trigger: ScrollTrigger = ScrollTrigger.create({ trigger: node, start: "top 72px", end: "bottom bottom", invalidateOnRefresh: true, onUpdate: self => apply(self.progress), onRefresh: self => apply(self.progress) });
    apply(trigger.progress);
    const resize = new ResizeObserver(() => apply(trigger.progress)); resize.observe(view);
    const stopDocent = onDocentOverlayChange(() => requestAnimationFrame(() => apply(trigger.progress)));
    const stop = observeScrollLayout(node);
    // One gesture = one scene: entry (door), three station introductions, then three slots per project.
    const stopRange = registerSteppedRange({
      id: "lab",
      enabled: () => mode !== "reduced-motion",
      stops: () => labScenes.map((sc, i) => ({ y: trigger.start + (trigger.end - trigger.start) * labOuter(labStopInner(i)), duration: i === 0 ? 3.2 : 2.4, label: sc.id })),
    });
    return () => { stop(); stopDocent(); stopRange(); resize.disconnect(); trigger.kill(); runtime.labViewport.current = null; };
  }, [runtime, mode]);

  const scene = labScenes[index], station = labStations.find(s => s.id === scene.station);
  const stationNo = station ? labStations.indexOf(station) + 1 : 0;
  return <section id="lab" ref={section} className={styles.track} data-header-tone="dark" aria-label="개인 연구실: Digital Docent · BCOS · Crime Scene">
    <div ref={viewport} className={styles.viewport} data-phase={scene.id} data-hud="lg">
      <div ref={surface} className={styles.canvas} aria-hidden="true"/>
      <div ref={edge} className={styles.apertureEdge} aria-hidden="true"/>

      <header className={styles.header}>
        <b>{scene.no === "00" ? "04" : scene.no}</b>
        <div><h3>{scene.no === "00" ? "PERSONAL LAB" : scene.title}</h3><p>{scene.ko}</p></div>
      </header>
      <SceneChrome project="04 / PERSONAL LAB" name="개인 연구실" count={labStations.length} current={stationNo} skipHref="#projects"/>

      {/* 00 introductions: a ring on the station being introduced + its name card. */}
      {labStations.map(st => <div key={st.id} className={styles.intro} data-on={scene.id === `intro-${st.id}`} style={{ translate: `var(--d-${st.id}-x) var(--d-${st.id}-y)`, "--c": st.accent } as CSSProperties}>
        <i/><div><small>{String(labStations.indexOf(st) + 1).padStart(2, "0")} / 03</small><strong>{st.name}</strong><span>{st.ko}</span></div>
      </div>)}

      {/* Empty content slots, registered to each station's screen (filled later). */}
      {labStations.map(st => <div key={st.id} className={styles.slot} data-on={scene.station === st.id && scene.slot} style={{ translate: `var(--s-${st.id}-x) var(--s-${st.id}-y)`, width: `var(--s-${st.id}-w)`, height: `var(--s-${st.id}-h)`, "--c": st.accent } as CSSProperties}>
        <span>{scene.slot && scene.station === st.id ? `${scene.id.toUpperCase()} · 콘텐츠 자리` : ""}</span>
      </div>)}
      <div className={styles.panel} data-on={scene.slot} style={{ "--c": station?.accent ?? "#7cc4ff" } as CSSProperties}>
        <small>{station ? `${String(stationNo).padStart(2, "0")} · ${station.en}` : ""}</small>
        <strong>{scene.slot ? scene.ko : ""}</strong>
        <p>이 장면의 설명·이미지·연출이 들어갈 자리입니다.</p>
      </div>

      <div className={styles.rail} aria-hidden="true"><i style={{ left: `calc(var(--rail) * 100%)` } as CSSProperties}/>{labStations.map((st, i) => <span key={st.id} style={{ left: `${(i + .5) / 3 * 100}%`, "--c": st.accent } as CSSProperties} data-on={st.id === scene.station}>{st.en}</span>)}</div>
      <p className={styles.srOnly} aria-live="polite">{`${scene.title} — ${scene.ko}`}</p>
      <SceneFooter note="개인 연구실 · 각 장면 콘텐츠는 준비 중"/>
    </div>
  </section>;
}
