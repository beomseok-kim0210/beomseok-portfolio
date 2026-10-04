"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ProjectStage } from "./ProjectStage";
import { phase, smooth, mixColor } from "./geometry";
import styles from "./flow.module.css";
import { HomeProjectBrief, ProjectDetailLink } from "../HomeProjectBrief";
import { briefTimeline } from "./timeline";
import { HangaraeWeddingTransition } from "./HangaraeWeddingTransition";
import { ArmiExperience } from "./armiJourney/ArmiExperience";
import { observeScrollLayout } from "./observeScrollLayout";

function HangaraeNarrative() {
  return <div className={styles.narrative}>
    <p className={styles.eyebrow}>REHABILITATION AI / HANGARAE</p>
    <h2>행가래<span className={styles.ordinal}> / 02</span></h2>
    <h3>Movement,<br/>in coordinates.</h3>
    <p className={styles.description}>포즈와 깊이 정보를 결합해<br/>움직임을 3축 좌표와 피드백으로 연결합니다.</p>
    <dl className={styles.spatialLegend}>
      <div><dt>POSE</dt><dd>관절의 화면상 위치</dd></div>
      <div><dt>DEPTH</dt><dd>깊이 정보 결합</dd></div>
      <div><dt>XYZ</dt><dd>3축 좌표 구성</dd></div>
    </dl>
  </div>;
}

export function ImmersiveProjectFlow() {
  const section = useRef<HTMLElement>(null);
  const [scene, setScene] = useState(()=>briefTimeline(0));
  const [mobileProgress, setMobileProgress] = useState(1);
  const [reducedMotion, setReducedMotion] = useState(false);
  const mobileHero = useRef<HTMLElement>(null);
  const {progress, briefActive, transition, heroActive} = scene;
  useEffect(()=>{
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add("(min-width: 901px) and (prefers-reduced-motion: no-preference)", ()=>{
      const state = { progress: 0 };
      gsap.to(state, {
        progress: 1, ease: "none",
        onUpdate: ()=>{
          const timeline = briefTimeline(state.progress);
          setScene(timeline);
        },
        scrollTrigger: { trigger: section.current, start: "top 72px", end: "bottom bottom", scrub: .35, invalidateOnRefresh: true, onRefresh:self=>setScene(briefTimeline(self.progress)) },
      });
    });
    media.add("(max-width: 900px) and (prefers-reduced-motion: no-preference)", ()=>{
      const state = { progress: 0 };
      gsap.to(state, { progress: 1, ease: "none", onUpdate:()=>setMobileProgress(state.progress), scrollTrigger:{trigger:mobileHero.current,start:"top 90%",end:"top 35%",scrub:.35,invalidateOnRefresh:true} });
    });
    media.add("(prefers-reduced-motion: reduce)",()=>{ setReducedMotion(true); return ()=>setReducedMotion(false); });
    const stopObserving = observeScrollLayout(section.current);
    return ()=>{ stopObserving(); media.revert(); };
  },[]);
  const light = smooth(phase(transition,.12,.62));
  const briefOpacity = 1-smooth(phase(transition,.15,.34));
  const hangaraeOpacity = smooth(phase(transition,.6,.9));
  const css = {"--stage-bg":`linear-gradient(105deg,#060a0c ${100-light*130}%,#f4f2ec ${102-light*130}%)`,"--stage-ink":light>.6?"#181d28":"#eff1e3","--stage-muted":light>.6?"#454e60":"#c0c9c7","--stage-accent":mixColor([210,240,89],[65,77,207],smooth(phase(transition,.12,.42)))} as CSSProperties;

  return <div id="armi" className={styles.flow}>
    <ArmiExperience/>
    <section ref={section} className={styles.scrollTrack} aria-label="ARMI에서 행가래로 이어지는 시각적 전환">
      <div className={styles.stickyStage} style={css} data-stage-progress={progress.toFixed(4)} data-stage-phase={heroActive?"SYSTEM":briefActive?"BRIEF":"HANDOFF"} data-transition-progress={transition.toFixed(4)}>
        <div id="armi-brief" className={styles.armiBrief} data-active={briefActive || heroActive} style={{opacity:briefOpacity,transform:`translateY(${-64*(1-briefOpacity)}px)`,pointerEvents:briefOpacity>.8?"auto":"none"}}><HomeProjectBrief project="armi"/></div>

        <div className={styles.visual} style={{visibility:heroActive?"hidden":"visible"}}>
          <ProjectStage progress={progress} branch="response" hideSystemLabels/>
        </div>
        <div className={styles.hangaraeCopy} style={{opacity:hangaraeOpacity,visibility:hangaraeOpacity>.01?"visible":"hidden"}}><HangaraeNarrative/></div>
        <div className={styles.stageFooter} style={{opacity:heroActive?0:hangaraeOpacity}}><span>POSE SCHEMATIC / 실시간 측정 아님</span></div>
      </div>
    </section>

    {/* Mobile/reduced motion preserve the same factual endpoints without pinning. */}

    <section ref={mobileHero} className={styles.staticHangarae} style={{"--mobile-reveal":mobileProgress} as CSSProperties} aria-label="행가래 정적 공간 설명">
      <HangaraeNarrative/>
      <div className={styles.staticVisual}><ProjectStage progress={reducedMotion?1:.18+.82*mobileProgress} compact hideSystemLabels/></div>
      <p className={styles.schematicNote}>설명용 포즈 도식 · 실제 모델 관절 정의 및 실시간 측정 아님</p>
    </section>

    <HangaraeWeddingTransition>
    <section id="hangarae" className={styles.evidence}>
      <div className={styles.evidenceHeading}><p className={styles.eyebrow}>HANGARAE / FROM VISION TO FEEDBACK</p><h2>좌표는 목적이 아니라,<br/>피드백으로 가는 과정.</h2></div>
      <ol className={styles.pipeline}>{[
        ["CAMERA","영상 입력"],["POSE","관절 위치 추정"],["DEPTH","깊이 결합"],["3D COORDINATE","x / y / z 구성"],["FEEDBACK","웹 운동 피드백"],
      ].map(([label,detail])=><li key={label}><span>{label}</span><p>{detail}</p></li>)}</ol>
      <div className={styles.evidenceGrid}>
        <div className={styles.modelEvidence}><p className={styles.eyebrow}>MODEL EVALUATION / mAP50</p><p className={styles.metric}><span>0.872</span><span aria-hidden="true">→</span><strong>0.988</strong></p><p>YOLOv11-M 재학습 전 → 재학습 후</p><small>모델 평가 지표 · 실행 속도나 전체 시스템 정확도와 별개</small></div>
        <div><p className={styles.eyebrow}>DEVICE & DATA PIPELINE</p><h3>Jetson Nano</h3><p>YOLO Pose + Depth → Redis → React·Three.js 피드백</p><p className={styles.evidenceDetail}>과거 프레임을 쌓지 않고 timestamp 기준 최신 좌표를 우선합니다.</p></div>
        <div><p className={styles.eyebrow}>PROJECT RECORD</p><h3>18 keypoints</h3><p>발끝·뒤꿈치를 포함한 관절 좌표 처리</p><p className={styles.evidenceDetail}>위 포즈는 흐름을 설명하는 도식입니다. 모델의 실제 18관절 배치를 재현한 그림이 아닙니다.</p></div>
      </div>
      <Link href="/projects/hangarae#trouble-01" className={styles.evidenceLink}>성과 근거: 데이터 구축과 재학습 과정 <span aria-hidden="true">↗</span></Link>
      <ProjectDetailLink href="/projects/hangarae">행가래 상세 보기</ProjectDetailLink>
    </section>
    </HangaraeWeddingTransition>
  </div>;
}
