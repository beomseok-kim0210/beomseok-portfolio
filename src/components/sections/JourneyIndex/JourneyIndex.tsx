"use client";
 
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { WD_ENTRY, wdTimelineToScroll } from "@/features/world/adapters/weddingAtelier";
import { gatePx, heroGatePx, scrollToY } from "@/features/world/runtime/journeyGeometry";
import { firstStopOf, registerSteppedRange } from "@/features/world/runtime/sceneStepper";
import { Tunnel } from "./Tunnel";
import { OrbCanvas } from "./OrbCanvas";
import dynamic from "next/dynamic";
import { renderTier } from "@/features/world/runtime/renderTier";
const OrbStage = dynamic(() => import("./OrbViews"), { ssr: false });
import { docentOverlayPx } from "@/features/docent/docentOverlay";
import s from "./journey-index.module.css";

/**
 * The project index is a place, not a list: three project worlds sit on one stage.
 * Default journey (scroll): the stage holds to be read → the ARMI sphere comes forward and becomes a
 * tunnel → ARMI's world opens from the sphere's centre (ArmiExperience reads --world-gate).
 * Direct choice (click): the chosen sphere dives the same way, then lands in that world.
 */
type Id = "armi" | "hangarae" | "wedding";
const HALL = "/images/journeys/index-hall.jpg";
const projects: { id: Id; no: string; name: string; flow: string; accent: string; line: string }[] = [
  { id: "armi", no: "01", name: "ARMI", flow: "VOICE → ACTION", accent: "#d2f059", line: "VOICE BECOMES ACTION" },
  { id: "hangarae", no: "02", name: "행가래", flow: "MOTION → FEEDBACK", accent: "#63cbdb", line: "MOVEMENT BECOMES FEEDBACK" },
  { id: "wedding", no: "03", name: "Wedding AI", flow: "IMAGE → CREATION", accent: "#a98bff", line: "IMAGE BECOMES CHOICE" },
];

/** Where each world is "entered" in the page (scroll Y). */
function destination(id: Id): number {
  const top = (el: Element | null) => el ? el.getBoundingClientRect().top + window.scrollY : 0;
  if (id === "armi") {
    const index = document.getElementById("journeys");
    return gatePx() ? top(index) + gatePx() + 2 : top(document.getElementById("armi")) - 56;
  }
  if (id === "hangarae") {
    const track = document.getElementById("hangarae"); if (!track) return 0;
    // Hangarae's own entry (aperture + hero title) completes within its first ~7% of progress.
    const start = top(track) - 72, end = top(track) + track.offsetHeight - window.innerHeight;
    return start + (end - start) * .075;
  }
  // Wedding: land just past its arched-light entry, on 01 QUESTION (the entry plays only on the walk-in).
  const wedding = document.getElementById("wedding"); if (!wedding) return top(document.getElementById("projects"));
  const start = top(wedding) - 72, end = top(wedding) + wedding.offsetHeight - window.innerHeight;
  return start + (end - start) * wdTimelineToScroll(WD_ENTRY + .035);
}

export function JourneyIndex() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const armiOrb = useRef<HTMLDivElement>(null);
  const [dive, setDive] = useState(0);                 // scroll-driven default journey (0..1)
  // The tunnel has its own WebGL canvas + bloom: it must stop once ARMI has fully opened over it,
  // otherwise it keeps rendering behind ARMI (the lag on entering ARMI).
  const [through, setThrough] = useState(false);
  const [jump, setJump] = useState<{ id: Id; phase: "in" | "out" } | null>(null); // click-driven
  const [mounted, setMounted] = useState(false);
  const [live, setLive] = useState(false);
  const [sharedOrbs, setSharedOrbs] = useState(false);
  useEffect(() => { const c = document.createElement("canvas"), ok = !!c.getContext("webgl2"); setSharedOrbs(ok && renderTier() === "low"); }, []); // index revealed (Hero no longer covering it)
  useEffect(() => setMounted(true), []);

  // Default journey: scroll through the gate.
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const node = section.current, view = stage.current; if (!node || !view) return;
    const apply = (p: number) => {
      const g = gatePx() ? p : 0;
      // 0–.28 hold (read & choose) · .28–.66 ARMI comes forward · .55–1 ARMI opens (ArmiExperience)
      const d = Math.max(0, Math.min(1, (g - .28) / .38));
      view.style.setProperty("--dive", d.toFixed(4));
      view.style.setProperty("--hold", Math.min(1, g / .28).toFixed(4));
      const orb = armiOrb.current;
      if (orb) {
        const r = orb.getBoundingClientRect(), v = view.getBoundingClientRect();
        // Travel to the stage centre — where ARMI's circular aperture opens.
        const dx = (v.left + (view.clientWidth - docentOverlayPx()) / 2) - (r.left + r.width / 2 - parseFloat(orb.style.getPropertyValue("--tx") || "0"));
        const dy = (v.top + v.height * .5) - (r.top + r.height / 2 - parseFloat(orb.style.getPropertyValue("--ty") || "0"));
        // Arrive at the centre early in the dive, so the tunnel title never crosses the sphere.
        const m = Math.min(1, d * 1.7), e = m * m * (3 - 2 * m);
        orb.style.setProperty("--tx", `${dx * e}px`); orb.style.setProperty("--ty", `${dy * e}px`);
        orb.style.setProperty("--grow", String(1 + e * 1.6));
      }
      setDive(d);
      const done = g >= .995; setThrough(prev => prev === done ? prev : done);
    };
    const trigger = ScrollTrigger.create({ trigger: node, start: "top top", end: () => `+=${Math.max(1, gatePx())}`, invalidateOnRefresh: true, onUpdate: self => apply(self.progress), onRefresh: self => apply(self.progress) });
    apply(trigger.progress);
    // Arrival: the stage rises in as Hero leaves.
    const arrive = ScrollTrigger.create({ trigger: node, start: () => heroGatePx() ? "top 22%" : "top bottom", end: "top top", invalidateOnRefresh: true, onUpdate: self => { const lv = self.progress > .25; setLive(prev => prev === lv ? prev : lv); }, onToggle: () => {}, onRefresh: self => setLive(self.progress > .25) });
    const arriveVar = ScrollTrigger.create({ trigger: node, start: () => heroGatePx() ? "top 22%" : "top bottom", end: "top top", invalidateOnRefresh: true, onUpdate: self => view.style.setProperty("--arrive", self.progress.toFixed(4)) });
    view.style.setProperty("--arrive", String(arrive.progress));
    return () => { trigger.kill(); arrive.kill(); arriveVar.kill(); };
  }, []);

  // One gesture = one page from the very top: Hero → this index → ARMI's first scene. The last stop is
  // ARMI's own first stop, so this range and ARMI's merge into one stepped region.
  useEffect(() => registerSteppedRange({
    id: "hero",
    enabled: () => heroGatePx() > 0,
    stops: () => {
      const node = section.current; if (!node) return [];
      const index = node.getBoundingClientRect().top + window.scrollY, armi = firstStopOf("armi");
      return [{ y: 0, label: "hero" }, { y: index, duration: 1.2, label: "index" }, ...(armi && armi.y > index + 4 ? [{ ...armi, duration: 2.2, label: "armi-entry" }] : [])];
    },
  }), []);

  const enter = useCallback((id: Id) => {
    if (jump) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (id === "armi" && gatePx() && !reduced) { scrollToY(destination("armi"), { duration: 2.4 }); return; }
    if (reduced) { scrollToY(destination(id), { immediate: true }); return; }
    // Chosen sphere dives (tunnel in its colour), then the page lands inside that world.
    setJump({ id, phase: "in" });
    window.setTimeout(() => { scrollToY(destination(id), { immediate: true }); setJump({ id, phase: "out" }); }, 1150);
    window.setTimeout(() => setJump(null), 1150 + 700);
  }, [jump]);

  const diving = jump?.phase === "in" ? jump.id : null;
  return (
    <section ref={section} id="journeys" className={s.index} aria-labelledby="journeys-title" data-header-tone="dark">
      <div ref={stage} className={s.stage} data-diving={diving ?? undefined}>
        {/* Photographic hall (generated in Canva for this page); centred on the visible stage so the
            floor rings sit under the worlds with or without the docked docent. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div className={s.hall} aria-hidden="true"><img src={HALL} alt="" decoding="async" /></div>
        <div className={s.copy}>
          <p className={s.eyebrow}>01 / PROJECTS</p>
          <h2 id="journeys-title">경험을 만드는 <br />세 가지 여정</h2>
          <p className={s.lede}>음성을 행동으로, 움직임을 피드백으로.<br />사람의 경험으로 이어지는 세 개의 AI 프로젝트입니다.</p>
        </div>

        {sharedOrbs && <OrbStage live={live && dive < .5} />}
        <ul className={s.worlds}>
          {projects.map((p, i) => (
            <li key={p.id} className={s.world} style={{ "--accent": p.accent, "--i": i } as CSSProperties} data-id={p.id} data-default={p.id === "armi"} data-chosen={diving === p.id}>
              <button type="button" className={s.hit} onClick={() => enter(p.id)} aria-label={`${p.no} ${p.name} 프로젝트로 들어가기 · ${p.flow}`}>
                <span className={s.label} aria-hidden="true"><span className={s.no}>{p.no}</span><strong>{p.name}</strong><small>{p.flow}</small></span>
                <span className={s.orbWrap} aria-hidden="true">
                  <span ref={p.id === "armi" ? armiOrb : undefined} className={s.orb}>
                    {/* The orbs stop animating as the dive starts (ARMI's carries on a little longer, it is the one travelling). */}
                    <OrbCanvas id={p.id} accent={p.accent} live={live && dive < (p.id === "armi" ? .5 : .04)} />
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <aside className={s.cta}>
          <span className={s.ctaRule} aria-hidden="true" />
          <p>프로젝트를 선택하거나 <br />그대로 여정을 시작해보세요.</p>
          <button type="button" className={s.start} onClick={() => enter("armi")}>여정 시작하기 <span aria-hidden="true">→</span></button>
          <small>기본 여정은 ARMI부터 시작됩니다.</small>
        </aside>

        <p className={s.scrollHint} aria-hidden="true">SCROLL TO START ↓</p>
        {/* Default journey tunnel (scroll-linked), drawn inside the stage. */}
        <Tunnel accent="#d2f059" intensity={through ? 0 : dive} label={{ no: "01", name: "ARMI", line: "VOICE BECOMES ACTION" }} />
      </div>
      {/* Direct-choice tunnel: fixed, because the page jumps underneath it. */}
      {mounted && jump && createPortal(
        <div className={s.jumpLayer} data-phase={jump.phase}>
          {(() => { const p = projects.find(x => x.id === jump.id)!; return <Tunnel accent={p.accent} intensity={1} label={{ no: p.no, name: p.name, line: p.line }} fixed />; })()}
        </div>, document.body)}
    </section>
  );
}

