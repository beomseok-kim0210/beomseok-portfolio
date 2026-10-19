"use client";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGLTF } from "@react-three/drei";
import { useWorldHost } from "@/features/world/runtime/WorldHost";
import { worldPositionForDomProgress } from "@/features/world/director/worldRuntime";
import type { WorldRenderMode } from "@/features/world/types/contracts";
import { LAB_HEAD_URL, labOuter, labScenes, labStations, labStopInner, sampleLab } from "@/features/world/adapters/labRoom";
import { applyAperture } from "@/features/world/runtime/journeyGeometry";
import { registerSteppedRange } from "@/features/world/runtime/sceneStepper";
import { onDocentOverlayChange } from "@/features/docent/docentOverlay";
import { OPEN_GLOBAL_DOCENT_EVENT } from "@/features/docent/globalDocentEvents";
import { observeScrollLayout } from "../observeScrollLayout";
import { SceneChrome, SceneFooter } from "../SceneHud";
import styles from "./lab.module.css";

/**
 * 04 Personal Gallery. The hall, the three works and the stepping live in the world canvas; this layer
 * carries the header, the intro labels on each work and the wall label (museum caption) for each scene.
 */
/** Where a work's scenes sit on the visit rail (centre of its span). */
const railAt = (id: string) => { const first = labScenes.findIndex(sc => sc.station === id), n = labScenes.filter(sc => sc.station === id).length; return (first + n / 2) / labScenes.length; };

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
    // Fetch the bust's head a couple of screens early so the hall never opens without it.
    const near = new IntersectionObserver(([e]) => { if (e.isIntersecting) { useGLTF.preload(LAB_HEAD_URL); near.disconnect(); } }, { rootMargin: "250% 0px" });
    if (section.current) near.observe(section.current);
    return () => { io.disconnect(); near.disconnect(); motion.removeEventListener("change", sync); };
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
    // One gesture = one scene: the hall, then per work its introduction and three detail scenes.
    const stopRange = registerSteppedRange({
      id: "lab",
      enabled: () => mode !== "reduced-motion",
      stops: () => labScenes.map((sc, i) => ({ y: trigger.start + (trigger.end - trigger.start) * labOuter(labStopInner(i)), duration: i === 0 ? 2.6 : 1.8, label: sc.id })),
    });
    return () => { stop(); stopDocent(); stopRange(); resize.disconnect(); trigger.kill(); runtime.labViewport.current = null; };
  }, [runtime, mode]);

  const scene = labScenes[index], station = labStations.find(s => s.id === scene.station);
  const stationNo = station ? labStations.indexOf(station) + 1 : 0;
  const label = scene.label;
  return <section id="lab" ref={section} className={styles.track} data-header-tone="light" aria-label="개인 작업 갤러리: Digital Docent · BCOS · Crime Scene">
    <div ref={viewport} className={styles.viewport} data-phase={scene.id} data-hud="lg">
      <div ref={surface} className={styles.canvas} aria-hidden="true"/>
      <div className={styles.veil} aria-hidden="true"/>
      <div ref={edge} className={styles.apertureEdge} aria-hidden="true"/>

      <header className={styles.header}>
        <b>{scene.no}</b>
        <div><h3>{scene.title}</h3><p>{scene.ko}</p></div>
      </header>
      <SceneChrome project="04 / PERSONAL WORKS" name="개인 작업 갤러리" count={labStations.length} current={stationNo} skipHref="#projects"/>

      {/* The hall at a glance: a small name tag on each of the three works. */}
      {labStations.map((st, i) => <div key={st.id} className={styles.tag} data-on={scene.id === "entry"} style={{ translate: `var(--d-${st.id}-x) var(--d-${st.id}-y)`, transitionDelay: `${i * 120}ms` } as CSSProperties}>
        <small>{String(i + 1).padStart(2, "0")}</small>{st.name}
      </div>)}
      {/* Each work's short introduction (before its details): a hairline leader from the work to its label. */}
      {labStations.map(st => <div key={st.id} className={styles.intro} data-on={scene.id === `intro-${st.id}`} style={{ translate: `var(--d-${st.id}-x) var(--d-${st.id}-y)`, "--c": st.accent } as CSSProperties}>
        <i/><div><small>{String(labStations.indexOf(st) + 1).padStart(2, "0")} / 03</small><strong>{st.name}</strong><p>{st.line}</p><span>{st.ko}</span><em>{st.medium}</em></div>
      </div>)}

      {/* Wall label for the scene: kicker, title, text, two measured facts, and an optional action. */}
      <aside className={styles.label} data-on={!!label} style={{ "--c": station?.accent ?? "#17181b" } as CSSProperties} aria-hidden={!label}>
        {label && station && <>
          <small><span>{`${String(stationNo).padStart(2, "0")} · ${station.en}`}</span><span>{label.kicker}</span></small>
          <strong>{label.title}</strong>
          <p>{label.body}</p>
          {label.metrics && <dl>{label.metrics.map(m => <div key={m.label}><dt>{m.value}</dt><dd>{m.label}</dd></div>)}</dl>}
          {label.cta && (label.cta.kind === "docent"
            ? <button type="button" className={styles.cta} onClick={() => window.dispatchEvent(new CustomEvent(OPEN_GLOBAL_DOCENT_EVENT))}>{label.cta.text} →</button>
            : <a className={styles.cta} href={label.cta.href}>{label.cta.text} →</a>)}
        </>}
      </aside>

      <div className={styles.rail} aria-hidden="true"><i style={{ left: `calc(var(--rail) * 100%)` } as CSSProperties}/>{labStations.map(st => <span key={st.id} style={{ left: `${railAt(st.id) * 100}%`, "--c": st.accent } as CSSProperties} data-on={st.id === scene.station}>{st.en}</span>)}</div>
      <p className={styles.srOnly} aria-live="polite">{label ? `${scene.title} — ${label.title}. ${label.body}` : `${scene.title} — ${scene.ko}`}</p>
      <SceneFooter note="개인 작업 갤러리 · 수치는 각 프로젝트 기록 기준"/>
    </div>
  </section>;
}
