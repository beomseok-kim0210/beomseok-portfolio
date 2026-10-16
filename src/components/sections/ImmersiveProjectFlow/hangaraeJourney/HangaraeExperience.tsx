"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useWorldHost } from "@/features/world/runtime/WorldHost";
import { worldPositionForDomProgress } from "@/features/world/director/worldRuntime";
import {
  HG_CAMERA_REGION as CR, HG_FRAME, hgAnchors, hgAsset, hgBones, hgGifPadded, hgVideo, hgMedia, hgRanges, hgSceneRanges, hgScrollToTimeline, hgTimelineToScroll, HG_STOPS_INNER, hgOuter, hgShots, ramp, sampleHangarae, type Rect,
} from "@/features/world/adapters/hangaraeAnimatic";
import type { WorldRenderMode } from "@/features/world/types/contracts";
import { prewarmHangaraeBodies } from "@/features/world/adapters/hangaraeBodyLoader";
import { observeScrollLayout } from "../observeScrollLayout";
import styles from "./hangarae.module.css";
import { DepthHud, PoseLegend, SceneHeaders, SplitHud } from "./HangaraeGraphics";
import { SceneChrome, SceneFooter } from "../SceneHud";
import { onDocentOverlayChange } from "@/features/docent/docentOverlay";
import { applyAperture, armiBriefStopY, debriefPx, weddingHoldStopY } from "@/features/world/runtime/journeyGeometry";
import { WD_HOLD, wdTimelineToScroll } from "@/features/world/adapters/weddingAtelier";
import { registerSteppedRange } from "@/features/world/runtime/sceneStepper";

function place(el: HTMLElement | null, rect: Rect, opacity: number) {
  if (!el) return;
  // Position via `translate` (composited, not layout): scroll-driven motion must not register as layout shift (CLS).
  Object.assign(el.style, { left: "0px", top: "0px", translate: `${rect.x}px ${rect.y}px`, width: `${rect.width}px`, height: `${rect.height}px`, opacity: String(opacity), visibility: opacity > .001 ? "visible" : "hidden" });
}
const mix = (a: Rect, b: Rect, t: number): Rect => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, width: a.width + (b.width - a.width) * t, height: a.height + (b.height - a.height) * t });
/** Fallback-only 2D schematic of the same 21 registered slots. */
function StillPose() {
  return <svg viewBox="0 0 214 407" role="img" aria-label="실제 카메라 crop에 수동 정렬한 설명용 21개 관절 위치">
    {hgBones.map(([a, b]) => <line key={`${a}-${b}`} data-lower={a >= 11 && b >= 11} x1={hgAnchors[a][0]} y1={hgAnchors[a][1]} x2={hgAnchors[b][0]} y2={hgAnchors[b][1]}/>)}
    {hgAnchors.map(([x, y], i) => <circle key={i} data-lower={i >= 11} cx={x} cy={y} r={i <= 4 ? 1.6 : 2.6}/>)}
  </svg>;
}
/** Fallback-only flat branch figures (no WebGL): upper joints left, lower joints + plate right. */
function StaticBranches() {
  const part = (lower: boolean) => <svg viewBox={lower ? "70 175 75 140" : "55 45 115 160"} data-lower={lower}>
    {hgBones.filter(([a, b]) => lower ? a >= 11 && b >= 11 : a < 11 && a > 4).map(([a, b]) => <line key={`${a}-${b}`} x1={hgAnchors[a][0]} y1={hgAnchors[a][1]} x2={hgAnchors[b][0]} y2={hgAnchors[b][1]}/>)}
    {hgAnchors.map(([x, y], i) => (lower ? i >= 11 : i > 4 && i < 13) && <circle key={i} cx={x} cy={y} r={2.6}/>)}
    {lower && <rect x="80" y="304" width="56" height="6" rx="1.5"/>}
  </svg>;
  return <div className={styles.staticBranches} aria-hidden="true">{part(false)}{part(true)}</div>;
}
/** Silent looping product recording; plays only while on screen (no decode cost off-screen). */
function LoopVideo({ base, poster, label, className }: { base: string; poster: string; label: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current; if (!v) return;
    // Cards stay inside the pinned viewport and are shown/hidden by the scroll timeline (inline style),
    // so play state follows BOTH viewport intersection and the card's own visibility.
    const card = v.closest("figure") as HTMLElement | null;
    let inView = false;
    const sync = () => {
      const shown = !card || (card.style.visibility !== "hidden" && +(card.style.opacity || "1") > .02);
      if (inView && shown) { if (v.paused) v.play().catch(() => {}); } else if (!v.paused) v.pause();
    };
    const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); });
    io.observe(v);
    const mo = card ? new MutationObserver(sync) : null;
    if (card) mo!.observe(card, { attributes: true, attributeFilter: ["style"] });
    return () => { io.disconnect(); mo?.disconnect(); };
  }, []);
  return <video ref={ref} className={className} poster={poster} muted loop playsInline preload="none" aria-label={label}>
    <source src={`${base}.webm`} type="video/webm" />
    <source src={`${base}.mp4`} type="video/mp4" />
  </video>;
}
function GameCard({ cardRef, screenRef, tone, kind = "ok", title, sub, gif, crop, still, reduced, alt, children }: {
  cardRef: Ref<HTMLElement>; screenRef?: Ref<HTMLDivElement>; tone: "upper" | "lower"; kind?: "ok" | "fail"; title: ReactNode; sub?: ReactNode; gif: string; crop: boolean; still: string; reduced: boolean; alt: string; children?: ReactNode;
}) {
  return <figure ref={cardRef} className={styles.card} data-tone={tone} data-kind={kind}>
    <figcaption className={styles.cardHead}><strong>{title}</strong>{sub && <span>{sub}</span>}</figcaption>
    <div ref={screenRef} className={styles.screen}>
      {reduced
        ? <img src={hgAsset(still)} alt={alt} decoding="async" loading="lazy"/>
        : <LoopVideo className={crop ? styles.gif : undefined} base={gif} poster={hgAsset(still)} label={alt} />}
      {children}
    </div>
  </figure>;
}

export function HangaraeExperience() {
  const section = useRef<HTMLElement>(null), viewport = useRef<HTMLDivElement>(null), surface = useRef<HTMLDivElement>(null);
  const startUpper = useRef<HTMLElement>(null), startUpperScreen = useRef<HTMLDivElement>(null), handoff = useRef<HTMLImageElement>(null), startLower = useRef<HTMLElement>(null);
  const camFrame = useRef<HTMLDivElement>(null), still = useRef<HTMLDivElement>(null), stillCam = useRef<HTMLImageElement>(null);
  const upperOk = useRef<HTMLElement>(null), lowerOk = useRef<HTMLElement>(null), upperFail = useRef<HTMLElement>(null), lowerFail = useRef<HTMLElement>(null);
  const colUpper = useRef<HTMLDivElement>(null), colLower = useRef<HTMLDivElement>(null), returnFrame = useRef<HTMLDivElement>(null);
  const { runtime, setSurface } = useWorldHost();
  const [mode, setMode] = useState<WorldRenderMode>("static"), [active, setActive] = useState(false), [shot, setShot] = useState(0), [review, setReview] = useState(false);
  const fail = useCallback(() => setMode("fallback"), []);
  useEffect(() => {
    const query = new URLSearchParams(location.search), motion = matchMedia("(prefers-reduced-motion: reduce)"); setReview(query.has("hgReview"));
    const sync = () => { if (motion.matches) setMode("reduced-motion"); else if (query.has("hgFallback")) setMode("fallback"); else { const c = document.createElement("canvas"), gl = c.getContext("webgl2"); setMode(gl ? "webgl" : "fallback"); gl?.getExtension("WEBGL_lose_context")?.loseContext(); } };
    sync(); motion.addEventListener("change", sync);
    // Polygonise the hologram bodies off-thread now, so the hero never waits on them.
    if (!motion.matches) prewarmHangaraeBodies(innerWidth <= 700);
    const observer = new IntersectionObserver(([e]) => setActive(e.isIntersecting)); if (section.current) observer.observe(section.current);
    return () => { observer.disconnect(); motion.removeEventListener("change", sync); };
  }, []);
  useEffect(() => { if (surface.current) setSurface({ element: surface.current, video: null, active, mode, onFailure: fail }, "hangarae"); return () => setSurface(null, "hangarae"); }, [setSurface, mode, active, fail]);
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const node = section.current, view = viewport.current; if (!node || !view) return;
    runtime.hangaraeViewport.current = view;
    let previous = -1;
    const apply = (p: number) => {
      const W = view.clientWidth, H = view.clientHeight, reduced = mode === "reduced-motion", s = sampleHangarae(p, W, H, reduced), isStatic = mode !== "webgl", L = s.layout;
      const q = s.q, eff = s.eff; // q: scene timeline (after hero), eff: outer progress (headers)
      const box = node.getBoundingClientRect();
      if (box.top < innerHeight && box.bottom > 72) runtime.publish(worldPositionForDomProgress("hangarae", p), mode);
      node.dataset.worldDistrict = "hangarae"; node.dataset.worldProgress = String(p); node.dataset.worldShot = hgShots[s.shot].id;
      view.dataset.phase = hgShots[s.shot].id; view.dataset.compact = String(L.compact); view.dataset.medium = String(!L.compact && W < 1100); view.dataset.static = String(isStatic);
      if (previous !== s.shot) { previous = s.shot; setShot(s.shot); }
      const set = (k: string, v: number) => view.style.setProperty(k, v.toFixed(4));
      hgSceneRanges.forEach(([a, b], i) => set(`--h${i}`, (i === 0 ? s.intro : ramp(eff, a - .006, a + .014)) * (i === 6 ? 1 : 1 - ramp(eff, b - .014, b + .004))));
      set("--hero", s.hero); set("--intro", s.intro); set("--ht", s.title);
      /* Entry (desktop): a diagonal light wipe reveals the hero over the still-pinned ARMI brief. */
      const entryOn = innerWidth > 900 && !reduced, wipe = entryOn ? s.wipe : 1;
      // ENTRY (shared with Home → ARMI): a screen-shaped aperture opens onto this world over the ARMI debrief.
      applyAperture(view, wipe, view.querySelector<HTMLElement>("[data-hg-aperture]"));
      node.style.pointerEvents = wipe < .98 ? "none" : "";
      set("--legend", s.legend); set("--depthui", s.depthUI); set("--device", s.device); set("--seam", s.seam); set("--analysis", s.analysis); set("--charts", s.charts);
      set("--holo", s.holo); set("--split", s.split * (1 - ramp(q, .705, .73))); set("--frame", s.frame); set("--merge", s.merge); set("--ret", s.returnFrame);
      view.style.setProperty("--camw", `${L.camera.width}px`);
      /* 01 → 02: the real upper game zooms into its own camera panel while the game UI dissolves. */
      const p0 = L.product[0], cr = s.cameraRect, k = cr.width / CR.width;
      const screen = { x: cr.x - CR.x * k, y: cr.y - CR.y * k, width: HG_FRAME.width * k, height: HG_FRAME.height * k };
      const zoomed = s.zoom > 0 ? screen : p0, rise = (1 - s.intro) * 40;
      const upperOpacity = s.intro * (isStatic ? (q < .35 ? s.person : 0) : s.cameraDomOwnership);
      place(startUpper.current, { ...zoomed, y: zoomed.y + rise }, upperOpacity);
      if (startUpper.current) startUpper.current.style.setProperty("--chrome", String(s.cardChrome));
      if (startUpperScreen.current) {
        const z = s.zoom, t = CR.y / HG_FRAME.height * 100 * z, r = (1 - (CR.x + CR.width) / HG_FRAME.width) * 100 * z, b = (1 - (CR.y + CR.height) / HG_FRAME.height) * 100 * z, l = CR.x / HG_FRAME.width * 100 * z;
        startUpperScreen.current.style.clipPath = z > 0 ? `inset(${t}% ${r}% ${b}% ${l}% round ${6 + 6 * z}px)` : "";
      }
      if (handoff.current) handoff.current.style.opacity = String(s.handoff);
      const lowerShift = s.lowerOut * 90 * (L.compact ? 0 : 1);
      place(startLower.current, { ...L.product[1], x: L.product[1].x + lowerShift, y: L.product[1].y + rise + (L.compact ? s.lowerOut * 60 : 0) }, s.intro * (1 - s.lowerOut));
      place(camFrame.current, cr, s.frame);
      /* Static fallback keeps a 2D schematic over the camera crop. */
      if (still.current) { place(still.current, L.camera, isStatic ? s.pose * (1 - s.split) : 0); still.current.dataset.split = String(q >= .49); }
      if (stillCam.current) stillCam.current.style.opacity = String(s.person);
      /* 06: per branch, success + correction (real GIFs) stay in their own column; 07: successes rejoin one frame. */
      const inA = ramp(q, .728, .765), R6 = L.reaction;
      // Focus: success first, then correction; the other pair dims and recedes.
      const dimOk = s.focus, dimFail = 1 - ramp(q, .762, .776);
      place(upperOk.current, mix(R6.upperOk, L.ret[0], s.merge), inA * (1 - .7 * dimOk));
      place(lowerOk.current, mix(R6.lowerOk, L.ret[1], s.merge), inA * (1 - .7 * dimOk));
      const tuck = (f: Rect, ok: Rect): Rect => mix(f, { x: ok.x + ok.width * .3, y: ok.y + ok.height * .3, width: ok.width * .4, height: ok.height * .4 }, s.merge);
      place(upperFail.current, tuck(R6.upperFail, R6.upperOk), s.fail * (1 - .7 * dimFail));
      place(lowerFail.current, tuck(R6.lowerFail, R6.lowerOk), s.fail * (1 - .7 * dimFail));
      [upperOk.current, lowerOk.current, upperFail.current, lowerFail.current].forEach((el, i) => { if (el) { el.style.setProperty("--in", String(inA)); el.style.setProperty("--merge", String(s.merge)); el.style.setProperty("--dim", String(i < 2 ? dimOk : dimFail)); } });
      const colA = inA * (1 - s.merge) * (L.compact ? 0 : 1);
      for (const [el, r] of [[colUpper.current, R6.upperOk], [colLower.current, R6.lowerOk]] as const) place(el, { x: r.x, y: r.y - 34 - 34, width: r.width, height: 26 }, colA);
      const u = L.ret[0], v = L.ret[1], pad = L.compact ? 14 : 26;
      place(returnFrame.current, { x: Math.min(u.x, v.x) - pad, y: u.y - 46 - pad + rise, width: Math.max(u.x + u.width, v.x + v.width) - Math.min(u.x, v.x) + pad * 2, height: Math.max(u.y + u.height, v.y + v.height) - u.y + 46 + pad * 2 }, Math.max(s.returnFrame, s.intro * (1 - ramp(q, .1, .135))));
      const slider = view.querySelector<HTMLInputElement>("[data-hg-scrub]"); if (slider) slider.value = String(p);
    };
    // EXIT: the timeline completes before the debrief sheet rises over the held final frame.
    const trigger = ScrollTrigger.create({ trigger: node, start: "top 72px", end: () => `bottom-=${debriefPx()} bottom`, invalidateOnRefresh: true, onUpdate: self => apply(hgScrollToTimeline(self.progress)), onRefresh: self => apply(hgScrollToTimeline(self.progress)) });
    apply(hgScrollToTimeline(trigger.progress));
    const resize = new ResizeObserver(() => apply(hgScrollToTimeline(trigger.progress))); resize.observe(view);
    const stopDocent = onDocentOverlayChange(() => requestAnimationFrame(() => apply(hgScrollToTimeline(trigger.progress))));
    const stop = observeScrollLayout(node);
    // Explicit review/deep-link restores DOM range after layout settles.
    const jump = () => { const value = new URLSearchParams(location.search).get("hangarae"); if (value !== null && Number.isFinite(Number(value))) { const p = Math.max(0, Math.min(1, Number(value))); ScrollTrigger.refresh(); window.scrollTo({ top: trigger.start + (trigger.end - trigger.start) * p, behavior: "instant" }); apply(p); } };
    const frame = requestAnimationFrame(jump);
    /* Stepped scenes: ARMI brief (shared stop) → hero (wipe + assembly plays on the way) → 01…07 → the Hangarae
       brief, which then scrolls freely. */
    const stopRange = registerSteppedRange({
      id: "hangarae",
      enabled: () => mode === "webgl",
      stops: () => {
        const at = (t: number) => trigger.start + (trigger.end - trigger.start) * hgTimelineToScroll(t);
        // The Hangarae brief is read where the wedding hold pins it (it is sticky once the wedding mounts).
        const brief = armiBriefStopY(), hold = weddingHoldStopY(wdTimelineToScroll(WD_HOLD * .5));
        return [
          ...(brief !== null ? [{ y: brief, duration: 1.8, label: "armi-brief" }] : []),
          { y: at(.075), duration: 2.4, label: "hero" },
          ...HG_STOPS_INNER.map(q => ({ y: at(hgOuter(q)), duration: 1.5 })),
          ...(hold !== null ? [{ y: hold, duration: 1.8, label: "hangarae-brief" }] : []),
        ];
      },
    });
    return () => { cancelAnimationFrame(frame); stop(); stopDocent(); stopRange(); resize.disconnect(); trigger.kill(); runtime.hangaraeViewport.current = null; };
  }, [runtime, mode]);
  function seek(p: number) { const el = section.current; if (!el) return; const top = el.getBoundingClientRect().top + scrollY - 72, range = el.offsetHeight - (innerHeight - 72); window.scrollTo({ top: top + range * p, behavior: "instant" }); }
  const step = hgShots[shot], reduced = mode === "reduced-motion", scene = Number(step.scene);
  const card = { reduced };
  return <section id="hangarae" ref={section} className={styles.track} data-header-tone="dark" data-hangarae-journey="animatic-v003" data-render-mode={mode} aria-label="행가래: 실제 게임에서 움직임과 하중 분석으로 갈라졌다가 다시 게임으로 돌아오는 여정">
    <div ref={viewport} className={styles.viewport} data-phase={step.id}>
      <div ref={surface} className={styles.canvas} aria-hidden="true"/>
      <div className={styles.atmos} aria-hidden="true"/>
      <div className={styles.apertureEdge} data-hg-aperture aria-hidden="true"/>

      <div className={styles.hero}>
        <span className={styles.heroEyebrow}><span data-from>VOICE → ACTION</span><span data-arrow aria-hidden="true">⟶</span>02 / HANGARAE</span>
        <h2>행가래</h2>
        <p className={styles.heroLine}>MOVEMENT BECOMES<br/>FEEDBACK.</p>
        <p className={styles.heroKo}>AI가 음성을 행동으로 연결했다면,<br/>이번에는 움직임을 피드백으로 연결합니다.</p>
        <div className={styles.heroChips}><span data-tone="upper">UPPER · MOTION</span><span data-tone="lower">LOWER · LOAD</span></div>
      </div>
      <div className={styles.heroStatic} aria-hidden="true"><StillPose/></div>
      <div className={styles.heroCue} aria-hidden="true"><i/>SCROLL</div>

      <SceneHeaders/>
      <SceneChrome project="02 / HANGARAE" name="행가래" count={hgSceneRanges.length} current={scene} skipHref="#hangarae-evidence"/>

      <GameCard {...card} cardRef={startUpper} screenRef={startUpperScreen} tone="upper" title="UPPER BODY" sub="옷 정리 게임" gif={hgVideo.upper} crop={hgGifPadded.upper} still={hgMedia.upperStart} alt="실제 상체 옷 정리 게임 화면">
        <img ref={handoff} className={styles.handoff} src={hgAsset(hgMedia.upperHandoff)} alt=""/>
      </GameCard>
      <GameCard {...card} cardRef={startLower} tone="lower" title="LOWER BODY" sub="두더지 게임" gif={hgVideo.lower} crop={hgGifPadded.lower} still={hgMedia.lowerStart} alt="실제 하체 두더지 게임 화면"/>
      <div ref={camFrame} className={styles.camFrame} aria-hidden="true"><span className={styles.camTag}><i/>LIVE · 실시간 카메라</span><b/><b/><b/><b/></div>
      <div ref={still} className={styles.still} aria-hidden="true"><img ref={stillCam} src={hgAsset(hgMedia.camera)} alt=""/><StillPose/></div>

      <PoseLegend/>
      <DepthHud/>
      <SplitHud/>
      {mode !== "webgl" && <StaticBranches/>}

      <div ref={colUpper} className={styles.colTitle} data-tone="upper"><b>05A</b>상체 → 옷 정리 게임</div>
      <div ref={colLower} className={styles.colTitle} data-tone="lower"><b>05B</b>하체 → 두더지 게임</div>
      <GameCard {...card} cardRef={upperOk} tone="upper" title={<><span className={styles.react}>✓ 정확한 동작</span><span className={styles.ret}>UPPER BODY · 옷 정리 게임</span></>} gif={hgVideo.upper} crop={hgGifPadded.upper} still={hgMedia.upperSuccess} alt="실제 상체 게임: 정확한 동작에 반응"/>
      <GameCard {...card} cardRef={upperFail} tone="upper" kind="fail" title="! 교정 피드백" gif={hgVideo.upperFail} crop={hgGifPadded.upperFail} still={hgMedia.upperFailure} alt="실제 상체 게임: 틀린 동작에 교정 피드백"/>
      <GameCard {...card} cardRef={lowerOk} tone="lower" title={<><span className={styles.react}>✓ 정확한 동작</span><span className={styles.ret}>LOWER BODY · 두더지 게임</span></>} gif={hgVideo.lower} crop={hgGifPadded.lower} still={hgMedia.lowerReaction} alt="실제 하체 게임: 정확한 동작에 반응"/>
      <GameCard {...card} cardRef={lowerFail} tone="lower" kind="fail" title="! 교정 피드백" gif={hgVideo.lowerFail} crop={hgGifPadded.lowerFail} still={hgMedia.lowerFailure} alt="실제 하체 게임: 틀린 동작에 교정 피드백"/>
      <div ref={returnFrame} className={styles.returnFrame} aria-hidden="true"><span><i/>HANGARAE · 하나의 제품</span></div>

      <p className={styles.srOnly} aria-live="polite">{`${step.scene} ${step.title} — ${step.ko}. ${step.text}`}</p>
      <SceneFooter note="게임 화면은 실제 녹화 · 인체 형상 / 관절 정렬 / 깊이 / 그래프는 설명용 시각화"/>
      {review && <nav className={styles.review} aria-label="애니매틱 검토"><input data-hg-scrub type="range" min="0" max="1" step=".001" aria-label="행가래 구간 진행률" onChange={e => seek(Number(e.target.value))}/>{hgShots.map((s, i) => <button key={s.id} type="button" onClick={() => seek((hgRanges[i] + hgRanges[i + 1]) / 2)}>{s.id}</button>)}</nav>}
    </div>
  </section>;
}
