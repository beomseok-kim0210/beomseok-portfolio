"use client";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { applyCircleAperture, armiBriefStopY, debriefPx, gatePx, reportWorldReady } from "@/features/world/runtime/journeyGeometry";
import { registerSteppedRange } from "@/features/world/runtime/sceneStepper";
import { armiOverviewToScroll, armiProgressToScroll } from "@/features/world/adapters/armiScrollTiming";
import { ArmiOverviewFocus } from "./ArmiOverviewFocus";
import { useWorldHost } from "@/features/world/runtime/WorldHost";
import { useWorldDirector } from "@/features/world/director/useWorldDirector";
import type { WorldRenderMode } from "@/features/world/types/contracts";
import { journeyPhases, productEvidence, returnRecordingTime } from "./experienceData";
import { armiSceneIndex, armiScenes } from "./armiScenes";
import { SceneChrome, SceneFooter, SceneHeaderList } from "../SceneHud";
import { ArmiStillWorld } from "./ArmiStillWorld";
import styles from "./journey.module.css";
import { armiStage } from "@/features/world/adapters/armiChoreography";
import { ArmiRoutingOptions } from "./ArmiRoutingOptions";
import { ArmiProductTransition } from "./ArmiProductTransition";
const webp = (src: string) => src.replace(/\.png$/, ".webp"); // WebP twins of the frozen evidence paths

export function ArmiExperience() {
  const section = useRef<HTMLElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const apertureEdge = useRef<HTMLDivElement>(null);
  const { runtime, setSurface } = useWorldHost();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [phase, setPhase] = useState(0);
  const [productionStage, setProductionStage] = useState(() => armiStage(0));
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<"loading" | "3d" | "reduced" | "fallback">("loading");
  const [inView, setInView] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  // Pinned under Home/index from the first pixel: render only when visible AND the aperture is opening.
  const active = inView && gateOpen;
  const fail = useCallback(() => setMode("fallback"), []);
  const worldMode: WorldRenderMode = mode === "3d" ? "webgl" : mode === "reduced" ? "reduced-motion" : mode === "fallback" ? "fallback" : "static";
  useWorldDirector(section, runtime, setPhase, worldMode);
  /* Stepped scenes: one gesture = one authored ARMI stage; the camera flight between stages plays on the way.
     The last stop is the pinned ARMI brief, shared with the Hangarae entry (one continuous region). */
  useEffect(() => {
    // 00 hero · 01 voice → neon orb → into the UI · 02 overview: TEXT → ROBOT → TAVILY → MEMORY, then straight
    // into the routing box · 03 routing core · 4-split with TEXT blinking · 04 text answer · 05 structured response · 06 back to product
    // ARMI moves at half the speed of the other worlds (scene moves 3.2s).
    const BEFORE = [.045, .154], AFTER = [.338, .437, .585, .885, .985], FOCUS = [.125, .375, .625, .875];
    return registerSteppedRange({
      id: "armi",
      enabled: () => worldMode === "webgl",
      stops: () => {
        const el = section.current; if (!el) return [];
        const top = el.getBoundingClientRect().top + window.scrollY, start = top + gatePx() - 72, end = top + el.offsetHeight - debriefPx() - window.innerHeight;
        const brief = armiBriefStopY();
        const at = (f: number) => start + (end - start) * f;
        return [
          ...BEFORE.map(p => ({ y: at(armiProgressToScroll(p)), duration: 3.2 })),
          ...FOCUS.map(f => ({ y: at(armiOverviewToScroll(f)), duration: 3.2, label: "overview" })),
          ...AFTER.map(p => ({ y: at(armiProgressToScroll(p)), duration: 3.2 })),
          ...(brief !== null ? [{ y: brief, duration: 3.6, label: "armi-brief" }] : []),
        ];
      },
    });
  }, [worldMode]);
  useEffect(() => {
    let previous = "";
    return runtime.subscribeFrame(() => {
      const p = armiStage(runtime.progress.current), next = p.id === "enter" && runtime.progress.current < .156 ? armiStage(.1) : p;
      // Scene 01 owns the voice → neon orb → into-the-UI move; 02 starts when the camera dives in.
      if (next.id !== previous) { previous = next.id; setProductionStage(next); }
    });
  }, [runtime]);
  useEffect(() => {
    if (surface.current) setSurface({ element: surface.current, video, active, mode: worldMode, onFailure: fail });
    return () => setSurface(null);
  }, [setSurface, video, active, worldMode, fail]);
  useEffect(() => {
    setVideo(videoRef.current);
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => { if (motion.matches) setMode("reduced"); else {
      const test = document.createElement("canvas");
      const gl = test.getContext("webgl2");
      setMode(gl ? "3d" : "fallback");
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    }};
    sync(); motion.addEventListener("change",sync);
    const observer = new IntersectionObserver(([entry]) => { setInView(entry.isIntersecting); if (!entry.isIntersecting) videoRef.current?.pause(); });
    if (section.current) observer.observe(section.current);
    return () => { observer.disconnect(); motion.removeEventListener("change",sync); };
  }, []);
  useEffect(() => {
    const original = videoRef.current;
    if (!original) return;
    if (phase >= 2) original.pause();
    if (phase >= 4 && original.readyState === 0) original.load();
    if (original.readyState >= 1 && phase >= 9) original.currentTime = returnRecordingTime;
    else if (original.readyState >= 1 && phase < 4 && original.currentTime===returnRecordingTime) original.currentTime = 0;
  }, [phase]);
  // ENTRY: Home's gate scroll opens a screen-shaped aperture onto this (already pinned) world.
  useEffect(() => {
    const view = viewport.current, node = section.current; if (!view || !node) return;
    gsap.registerPlugin(ScrollTrigger);
    // The ARMI sphere has travelled to the index stage centre by ~.66; ARMI opens from there.
    const set = (p: number) => {
      const g = gatePx();
      applyCircleAperture(view, g ? (p - .58) / .42 : 1, view.clientWidth / 2, window.innerHeight * .5 - 72, 150);
      const open = !g || p > .5; setGateOpen(prev => prev === open ? prev : open);
      // The whole (transparent) track overlaps the index during the gate: let clicks reach the index.
      const through = g && p < .98 ? "none" : "";
      view.style.pointerEvents = through; node.style.pointerEvents = through;
    };
    const trigger = ScrollTrigger.create({ trigger: node, start: "top 72px", end: () => `+=${Math.max(1, gatePx())}`, invalidateOnRefresh: true, onUpdate: self => set(self.progress), onRefresh: self => set(self.progress) });
    set(trigger.progress);
    return () => { trigger.kill(); view.style.clipPath = ""; view.style.pointerEvents = ""; node.style.pointerEvents = ""; };
  }, []);
  // Non-WebGL paths are complete as soon as they render: the Home entry cue must not wait for 3D.
  useEffect(() => { if (mode === "reduced" || mode === "fallback") reportWorldReady(); }, [mode]);
  useEffect(() => {
    const view = viewport.current; if (!view) return;
    // Same compact/medium rule as Hangarae so the shared HUD collapses identically.
    const size = () => { const w = view.clientWidth; view.dataset.compact = String(w <= 700); view.dataset.medium = String(w > 700 && w < 1100); };
    size(); const observer = new ResizeObserver(size); observer.observe(view);
    return () => observer.disconnect();
  }, []);
  const step = mode === "3d" ? { ...productionStage, label: `ARMI / ${productionStage.title}` } : journeyPhases[phase];
  const staticMode = mode !== "3d";
  const scene = staticMode ? (phase === 0 ? -1 : 0) : armiSceneIndex(productionStage.id);
  async function play() {
    if (!videoRef.current) return;
    if (playing) videoRef.current.pause(); else try { await videoRef.current.play(); } catch { setPlaying(false); }
  }
  return <section ref={section} className={styles.track} aria-label="ARMI: 음성 요청의 해석·라우팅·응답·제품 복귀 여정" data-armi-journey="golden" data-header-tone="dark">
    <div ref={viewport} className={styles.viewport} style={{ "--hero": scene < 0 ? 1 : 0 } as CSSProperties} data-phase={step.id} data-render-mode={mode} data-world-asset={mode === "3d" ? "armi-v015" : undefined}>
      <div ref={surface} className={styles.canvas} aria-hidden="true"/>
      <div ref={apertureEdge} className={styles.apertureEdge} aria-hidden="true"/>
      {mode === "3d" && <><ArmiProductTransition runtime={runtime}/><ArmiRoutingOptions runtime={runtime}/><ArmiOverviewFocus runtime={runtime}/></>}
      <div className={styles.overlay}>
        {(staticMode ? phase === 0 : scene < 0) && <header className={styles.identity}><p>01 / ARMI</p><h2>ARMI</h2><h3>VOICE BECOMES<br/>ACTION.</h3></header>}
        {staticMode ? <>
          <div className={styles.narrative} aria-live="polite"><p className={styles.label}>{step.label}</p>{phase > 0 && <h3>{step.title}</h3>}<p>{step.text}</p></div>
          <div className={styles.footer}><span>{phase === 10 ? "SCROLL FOR EVIDENCE ↓" : "SCROLL TO TRAVEL ↓"}</span><p>원본 제품 시연 · 공간과 신호는 설명용 시각화</p></div>
        </> : <div className={styles.hudSlot}>
          <SceneHeaderList scenes={armiScenes} active={scene}/>
          <SceneChrome project="01 / ARMI" name="ARMI" count={armiScenes.length} current={scene + 1} skipHref="#armi-brief"/>
          <SceneFooter note="원본 제품 시연 · 공간과 신호는 설명용 시각화" cue={scene === 5 ? "SCROLL FOR EVIDENCE ↓" : "SCROLL ↓"}/>
          <p className={styles.srOnly} aria-live="polite">{scene < 0 ? "ARMI — 실제 ARMI 환자 앱" : `${armiScenes[scene].no} ${armiScenes[scene].title} — ${armiScenes[scene].ko}`}</p>
        </div>}
        {staticMode && (phase < 2 || phase === 10) && <div className={styles.mediaControl}><p>PATIENT TABLET APP</p><button type="button" onClick={play} aria-pressed={playing}>{playing ? "시연 일시정지 Ⅱ" : "원본 시연 재생 ▷"}</button></div>}
        {mode === "3d" && productionStage.id === "decision" && <div className={styles.routeChoices} aria-label="네 가지 라우팅 후보">
          {["TEXT ANSWER", "MEMORY RETRIEVAL", "TAVILY SEARCH", "ROBOT ACTION"].map(name => <span key={name} data-selected={productionStage.id === "decision" && name === "TEXT ANSWER"}>{name}{productionStage.id === "decision" ? name === "TEXT ANSWER" ? " · SELECTED" : " · INACTIVE" : " · AVAILABLE"}</span>)}
        </div>}
        {staticMode && <a className={styles.skip} href="#armi-brief">설명으로 건너뛰기 ↓</a>}
      </div>
      {/* Accessible/reduced-motion narrative keeps the same stages in one viewport. */}
      {staticMode && <div className={styles.staticScene} data-interior={phase>=3 && phase<9} data-response={phase>=8} data-key-world={phase>=4 && phase<9}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={phase>=9 ? webp(productEvidence.returnPoster) : webp(productEvidence.poster)} alt={phase>=9 ? "원본 ARMI 환자 앱 기록의 대화 모드" : "실제 ARMI 환자 앱: 음성 요청, 물건 반납, 긴급 호출, 로봇 정지"}/>
        <div className={styles.staticSignal} data-phase={step.id} aria-hidden="true">{phase === 1 ? "▂ ▅ ▃ ▇ ▂ ▆ ▄" : phase === 4 ? "━ ▰ ━" : phase>=8 ? "━ ▰ →" : phase >= 2 ? "→" : ""}</div>
        <ArmiStillWorld phase={step.id}/>
      </div>}
      <video ref={videoRef} className={staticMode && ((playing && phase<2) || phase>=9) ? styles.staticVideo : styles.originalVideo} src={productEvidence.video} poster={webp(productEvidence.poster)} playsInline muted preload="none" onLoadedMetadata={()=>{if(phase>=9 && videoRef.current) videoRef.current.currentTime=returnRecordingTime;}} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)} aria-label="ARMI 원본 제품 시연"/>
    </div>
  </section>;
}
