"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { heroGatePx } from "@/features/world/runtime/journeyGeometry";
import { onDocentOverlayChange } from "@/features/docent/docentOverlay";
import s from "./hero.module.css";

const ramp = (v: number, a: number, b: number) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

/** The lit opening between the two pillars, in the plate's own 1920×1080 pixels. */
const OPENING = { x0: 1215, x1: 1320, y0: 215, y1: 775 };

/**
 * Opening statement as a place: a night landscape, a lit doorway and a figure walking into it.
 * Transition into the project index (scroll-linked, camera still): the light between the two
 * pillars intensifies, spills sideways out of the opening, flares to fill the frame — and the
 * project index is revealed as it clears (it sits underneath).
 * 메인 주장은 고정한다 — 읽는 도중 문구가 바뀌지 않게.
 */
export function HeroSection() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const node = section.current, view = stage.current; if (!node || !view) return;
    const apply = (raw: number) => {
      const cam = view.firstElementChild as HTMLElement | null; if (!cam) return;
      const p = heroGatePx() ? raw : 0;
      // Opening rect on screen: the plate is object-fit: cover inside the camera box.
      const W = cam.clientWidth, H = cam.clientHeight, k = Math.max(W / 1920, H / 1080);
      const L = cam.getBoundingClientRect().left - view.getBoundingClientRect().left; // includes the transform shift
      const ox = L + (W - 1920 * k) / 2, oy = (H - 1080 * k) / 2;
      const x = ox + OPENING.x0 * k, y = oy + OPENING.y0 * k, w = (OPENING.x1 - OPENING.x0) * k, h = (OPENING.y1 - OPENING.y0) * k;
      view.style.setProperty("--door-x", `${x.toFixed(1)}px`); view.style.setProperty("--door-y", `${y.toFixed(1)}px`);
      view.style.setProperty("--door-w", `${w.toFixed(1)}px`); view.style.setProperty("--door-h", `${h.toFixed(1)}px`);
      // 0–.35 the opening brightens · .25–.75 light spills sideways and blooms · .6–.85 white-out · .85–1 clears onto the index
      view.style.setProperty("--p", p.toFixed(4));
      view.style.setProperty("--charge", ramp(p, .04, .4).toFixed(4));
      view.style.setProperty("--spill", ramp(p, .25, .78).toFixed(4));
      view.style.setProperty("--flash", ramp(p, .58, .84).toFixed(4));
      view.style.setProperty("--leave", ramp(p, .84, 1).toFixed(4));
      view.style.pointerEvents = p > .9 ? "none" : "";
    };
    const trigger = ScrollTrigger.create({ trigger: node, start: "top top", end: () => `+=${Math.max(1, heroGatePx())}`, invalidateOnRefresh: true, onUpdate: self => apply(self.progress), onRefresh: self => apply(self.progress) });
    apply(trigger.progress);
    const resize = new ResizeObserver(() => apply(trigger.progress)); resize.observe(view);
    const stopDocent = onDocentOverlayChange(() => requestAnimationFrame(() => apply(trigger.progress)));
    return () => { trigger.kill(); resize.disconnect(); stopDocent(); };
  }, []);
  return (
    <section ref={section} id="hero" className={`scene-shell ${s.hero}`} data-header-tone="dark">
      <div ref={stage} className={s.stage}>
        <div className={s.camera}>
          <HeroBackdrop />
          <span className={s.night} aria-hidden="true" />
        </div>
        {/* Door light: opening core, sideways spill, bloom, rays, then the white-out */}
        <div className={s.flare} aria-hidden="true">
          <span className={s.core} />
          <span className={s.spill} />
          <span className={s.bloom} />
          <span className={s.rays} />
        </div>
        <span className={s.flash} aria-hidden="true" />
        <div className={s.copy}>
          <h1 className={s.title}>
            <span className={s.line}>사람은</span>
            <span className={s.line}>기술보다 <em className={s.word}>경험</em>을 기억합니다.</span>
          </h1>
          <p className={s.lede}>AI의 판단이 실제 사용자 경험으로 이어지는 <br />제품과 서비스를 만듭니다.</p>
          <a href="#journeys" className={s.srEnter}>프로젝트 목차로 이동</a>
        </div>
        <p className={s.rail} aria-label="음성을 행동으로, 움직임을 피드백으로">
          <span>VOICE<br />BECOMES<br />ACTION</span>
          <i aria-hidden="true" />
          <span>MOVEMENT<br />BECOMES<br />FEEDBACK</span>
        </p>
        <a href="#journeys" className={s.scroll}><span>SCROLL</span><i aria-hidden="true"><b /></i></a>
      </div>
    </section>
  );
}

/**
 * Photographic plate (generated in Canva for this page, 1920×1080) with live layers on top:
 * the doorway breathes, haze drifts across the plaza, a soft scrim keeps the copy readable.
 * Swapping the plate means re-measuring OPENING above.
 */
const PLATE = "/images/hero/hero-door.jpg";
function HeroBackdrop() {
  return (
    <div className={s.backdrop} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={s.plate} src={PLATE} alt="" fetchPriority="high" decoding="async" />
      <span className={s.doorGlow} />
      <span className={s.haze} />
      <span className={s.scrim} />
    </div>
  );
}
