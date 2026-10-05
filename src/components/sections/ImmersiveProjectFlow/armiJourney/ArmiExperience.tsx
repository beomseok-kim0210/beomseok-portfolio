"use client";
import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useArmiScrollDirector } from "./ArmiScrollDirector";
import { journeyPhases, productEvidence, returnRecordingTime } from "./experienceData";
import { ArmiStillWorld } from "./ArmiStillWorld";
import styles from "./journey.module.css";
const ArmiCanvas = dynamic(() => import("./ArmiCanvas"), { ssr: false });

class CanvasBoundary extends Component<{children: ReactNode; onFailure: () => void}, {failed: boolean}> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function ArmiExperience() {
  const section = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<"loading" | "3d" | "reduced" | "fallback">("loading");
  const [compact, setCompact] = useState(false);
  const [active, setActive] = useState(false);
  const fail = useCallback(() => setMode("fallback"), []);
  useArmiScrollDirector(section, progress, setPhase);
  useEffect(() => {
    setVideo(videoRef.current);
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const size = matchMedia("(max-width: 700px)");
    const sync = () => { setCompact(size.matches); if (motion.matches) setMode("reduced"); else {
      const test = document.createElement("canvas");
      const gl = test.getContext("webgl2");
      setMode(gl ? "3d" : "fallback");
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    }};
    sync(); motion.addEventListener("change",sync); size.addEventListener("change",sync);
    const observer = new IntersectionObserver(([entry]) => { setActive(entry.isIntersecting); if (!entry.isIntersecting) videoRef.current?.pause(); });
    if (section.current) observer.observe(section.current);
    return () => { observer.disconnect(); motion.removeEventListener("change",sync); size.removeEventListener("change",sync); };
  }, []);
  useEffect(() => {
    const original = videoRef.current;
    if (!original) return;
    if (phase >= 2) original.pause();
    if (phase >= 4 && original.readyState === 0) original.load();
    if (original.readyState >= 1 && phase >= 9) original.currentTime = returnRecordingTime;
    else if (original.readyState >= 1 && phase < 4 && original.currentTime===returnRecordingTime) original.currentTime = 0;
  }, [phase]);
  const step = journeyPhases[phase];
  const staticMode = mode !== "3d";
  async function play() {
    if (!videoRef.current) return;
    if (playing) videoRef.current.pause(); else try { await videoRef.current.play(); } catch { setPlaying(false); }
  }
  return <section ref={section} className={styles.track} aria-label="ARMI: 음성 요청의 해석·라우팅·응답·제품 복귀 여정" data-armi-journey="golden">
    <div className={styles.viewport} data-phase={step.id} data-render-mode={mode}>
      {!staticMode && <div className={styles.canvas} aria-hidden="true"><CanvasBoundary onFailure={fail}><ArmiCanvas progress={progress} video={video} compact={compact} active={active} onFailure={fail}/></CanvasBoundary></div>}
      <div className={styles.overlay}>
        <header className={styles.identity}><p>01 / ARMI</p>{phase === 0 ? <><h2>ARMI</h2><h3>VOICE BECOMES<br/>ACTION.</h3></> : <span>ARMI / REQUEST JOURNEY</span>}</header>
        <div className={styles.narrative} aria-live="polite"><p className={styles.label}>{step.label}</p>{phase > 0 && <h3>{step.title}</h3>}<p>{step.text}</p></div>
        <div className={styles.footer}><span>{phase === 10 ? "SCROLL FOR EVIDENCE ↓" : "SCROLL TO TRAVEL ↓"}</span><p>원본 제품 시연 · 공간과 신호는 설명용 시각화</p></div>
        {(phase < 2 || phase === 10) && <div className={styles.mediaControl}><p>PATIENT TABLET APP</p><button type="button" onClick={play} aria-pressed={playing}>{playing ? "시연 일시정지 Ⅱ" : "원본 시연 재생 ▷"}</button></div>}
        <a className={styles.skip} href="#armi-brief">설명으로 건너뛰기 ↓</a>
      </div>
      {/* Accessible/reduced-motion narrative keeps the same stages in one viewport. */}
      {staticMode && <div className={styles.staticScene} data-interior={phase>=3 && phase<9} data-response={phase>=8} data-key-world={phase>=4 && phase<9}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={phase>=9 ? productEvidence.returnPoster : productEvidence.poster} alt={phase>=9 ? "원본 ARMI 환자 앱 기록의 대화 모드" : "실제 ARMI 환자 앱: 음성 요청, 물건 반납, 긴급 호출, 로봇 정지"}/>
        <div className={styles.staticSignal} data-phase={step.id} aria-hidden="true">{phase === 1 ? "▂ ▅ ▃ ▇ ▂ ▆ ▄" : phase === 4 ? "━ ▰ ━" : phase>=8 ? "━ ▰ →" : phase >= 2 ? "→" : ""}</div>
        <ArmiStillWorld phase={step.id}/>
      </div>}
      <video ref={videoRef} className={staticMode && ((playing && phase<2) || phase>=9) ? styles.staticVideo : styles.originalVideo} src={productEvidence.video} poster={productEvidence.poster} playsInline muted preload="none" onLoadedMetadata={()=>{if(phase>=9 && videoRef.current) videoRef.current.currentTime=returnRecordingTime;}} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)} aria-label="ARMI 원본 제품 시연"/>
    </div>
  </section>;
}
