"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./flow.module.css";
import { HomeProjectBrief, JourneyComplete } from "../HomeProjectBrief";
import { armiScenes } from "./armiJourney/armiScenes";
import { hgSceneRanges, hgShots } from "@/features/world/adapters/hangaraeAnimatic";

const hangaraeRecap = hgSceneRanges.map((_, i) => hgShots.find(s => Number(s.scene) === i + 1)!.title);
import { briefTimeline } from "./timeline";
import { WeddingExperience } from "./weddingJourney/WeddingExperience";
import { ArmiExperience } from "./armiJourney/ArmiExperience";
import { observeScrollLayout } from "./observeScrollLayout";
import { HangaraeExperience } from "./hangaraeJourney/HangaraeExperience";

export function ImmersiveProjectFlow() {
  const section = useRef<HTMLElement>(null);
  const [scene, setScene] = useState(()=>briefTimeline(0));
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
    const stopObserving = observeScrollLayout(section.current);
    return ()=>{ stopObserving(); media.revert(); };
  },[]);
  // The brief stays pinned and readable; the Hangarae hero (next track, overlapping this one)
  // wipes in over it, so ARMI hands over straight into the hero without an interstitial.
  const css = {"--stage-bg":"#060a0c","--stage-ink":"#eff1e3","--stage-muted":"#9eaaaa","--stage-accent":"#d2f059"} as CSSProperties;

  return <div id="armi" className={styles.flow}>
    <ArmiExperience/>
    <section ref={section} className={styles.scrollTrack} data-header-tone="dark" data-armi-brief-track aria-label="ARMI에서 행가래로 이어지는 시각적 전환">
      <div className={styles.stickyStage} style={css} data-stage-progress={progress.toFixed(4)} data-stage-phase={heroActive?"SYSTEM":briefActive?"BRIEF":"HANDOFF"} data-transition-progress={transition.toFixed(4)}>
        <div id="armi-brief" className={styles.armiBrief} data-active={briefActive || heroActive}><HomeProjectBrief project="armi" recap={armiScenes.map(s => s.title)}/></div>
      </div>
    </section>

    <HangaraeExperience/>
    <section id="hangarae-evidence" className={styles.evidence}>
      <div className={styles.evidenceHeading}><p className={styles.eyebrow}>HANGARAE / BRIEF EVIDENCE</p><h2>좌표는 목적이 아니라,<br/>피드백으로 가는 과정.</h2></div>
      <ol className={styles.pipeline}>{[
        ["CAMERA","영상 입력"],["POSE","관절 위치 추정"],["DEPTH","깊이 결합"],["3D COORDINATE","x / y / z 구성"],["FEEDBACK","웹 운동 피드백"],
      ].map(([label,detail])=><li key={label}><span>{label}</span><p>{detail}</p></li>)}</ol>
      <div className={styles.evidenceGrid}>
        <div className={styles.modelEvidence}><p className={styles.eyebrow}>MODEL EVALUATION / mAP50</p><p className={styles.metric}><span>0.872</span><span aria-hidden="true">→</span><strong>0.988</strong></p><p>YOLOv11-M 재학습 전 → 재학습 후</p><small>모델 평가 지표 · 실행 속도나 전체 시스템 정확도와 별개</small></div>
        <div><p className={styles.eyebrow}>DEVICE & DATA PIPELINE</p><h3>Jetson Nano</h3><p>YOLO Pose + Depth → Redis → React·Three.js 피드백</p><p className={styles.evidenceDetail}>과거 프레임을 쌓지 않고 timestamp 기준 최신 좌표를 우선합니다.</p></div>
        <div><p className={styles.eyebrow}>AUDITED SOURCE / 21 SLOTS</p><h3>COCO 17 + 발 관절 4</h3><p>관절별 XYZ · 유효하지 않은 값은 null</p><p className={styles.evidenceDetail}>원본 코드의 21개 슬롯을 확인했습니다. 위 관절 정렬과 깊이 시각화는 설명용이며, GIF와 동기화된 실측 기록은 아닙니다.</p></div>
      </div>
      <p className={styles.evidenceNote}>개인 기여: YOLO Pose 발 키포인트 학습 데이터 20,507장 선별·라벨링과 모델 재학습, React·Three.js 기반 3D 재활 게임과 Pose·Depth 기반 실시간 인터랙션 구현, Blender 에셋 제작(Claude–Blender MCP 활용).</p>
      <Link href="/projects/hangarae#trouble-01" className={styles.evidenceLink}>성과 근거: 데이터 구축과 재학습 과정 <span aria-hidden="true">↗</span></Link>
      <div className={styles.evidenceComplete}><JourneyComplete href="/projects/hangarae" cta="행가래 상세 기록 열기" sub="데이터 구축 · 재학습 · 트러블슈팅 · 기술 스택" recap={hangaraeRecap}/></div>
    </section>
    <WeddingExperience/>
    <div id="wedding-brief" style={{ position: "relative", zIndex: 1 }}><HomeProjectBrief project="wedding"/></div>
  </div>;
}
