"use client";
 
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRouter } from "next/navigation";
import { heroGatePx } from "@/features/world/runtime/journeyGeometry";
import { journeyHref, type JourneyId } from "@/data/journeys";
import { firstStopOf, registerSteppedRange } from "@/features/world/runtime/sceneStepper";
import { Tunnel } from "./Tunnel";
import { OrbCanvas } from "./OrbCanvas";
import dynamic from "next/dynamic";
import { renderTier } from "@/features/world/runtime/renderTier";
const OrbStage = dynamic(() => import("./OrbViews"), { ssr: false });
import s from "./journey-index.module.css";
import { hasWebGL2 } from "@/lib/webglSupport";

/**
 * The project index is a place, not a list: three project worlds sit on one stage.
 * Each project is its own page (/journeys/<id>): the chosen sphere dives (tunnel in its colour), then
 * that journey opens. Scrolling on passes the index to the personal gallery (Home's last world).
 */
type Id = JourneyId;
const HALL = "/images/journeys/index-hall.jpg";
const projects: { id: JourneyId; no: string; name: string; flow: string; accent: string; line: string }[] = [
  { id: "armi", no: "01", name: "ARMI", flow: "VOICE → ACTION", accent: "#d2f059", line: "VOICE BECOMES ACTION" },
  { id: "hangarae", no: "02", name: "행가래", flow: "MOTION → FEEDBACK", accent: "#63cbdb", line: "MOVEMENT BECOMES FEEDBACK" },
  { id: "wedding", no: "03", name: "Wedding AI", flow: "IMAGE → CREATION", accent: "#a98bff", line: "IMAGE BECOMES CHOICE" },
];

export function JourneyIndex() {
  const router = useRouter();
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [jump, setJump] = useState<{ id: Id; phase: "in" | "out" } | null>(null); // click-driven
  const [mounted, setMounted] = useState(false);
  const [live, setLive] = useState(false);
  const [sharedOrbs, setSharedOrbs] = useState(false);
  useEffect(() => { setSharedOrbs(hasWebGL2() && renderTier() === "low"); }, []); // index revealed (Hero no longer covering it)
  useEffect(() => setMounted(true), []);
  // Each project has its own page now: warm the routes so the dive lands without a wait.
  useEffect(() => { projects.forEach(p => router.prefetch(journeyHref(p.id))); }, [router]);

  // Arrival: the stage rises in as Hero leaves (and stays to be read; no scroll dive any more).
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const node = section.current, view = stage.current; if (!node || !view) return;
    view.style.setProperty("--dive", "0"); view.style.setProperty("--hold", "1");
    const arrive = ScrollTrigger.create({ trigger: node, start: () => heroGatePx() ? "top 22%" : "top bottom", end: "top top", invalidateOnRefresh: true, onUpdate: self => { const lv = self.progress > .25; setLive(prev => prev === lv ? prev : lv); }, onRefresh: self => setLive(self.progress > .25) });
    const arriveVar = ScrollTrigger.create({ trigger: node, start: () => heroGatePx() ? "top 22%" : "top bottom", end: "top top", invalidateOnRefresh: true, onUpdate: self => view.style.setProperty("--arrive", self.progress.toFixed(4)) });
    view.style.setProperty("--arrive", String(arrive.progress));
    return () => { arrive.kill(); arriveVar.kill(); };
  }, []);

  // One gesture = one page from the very top: Hero → this index → the personal gallery's doors.
  useEffect(() => registerSteppedRange({
    id: "hero",
    enabled: () => heroGatePx() > 0,
    stops: () => {
      const node = section.current; if (!node) return [];
      const index = node.getBoundingClientRect().top + window.scrollY, lab = firstStopOf("lab");
      return [{ y: 0, label: "hero" }, { y: index, duration: 1.2, label: "index" }, ...(lab && lab.y > index + 4 ? [{ ...lab, duration: 1.8, label: "lab-hold" }] : [])];
    },
  }), []);

  // The chosen sphere dives (tunnel in its colour), then its journey page opens.
  const enter = useCallback((id: Id) => {
    if (jump) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { router.push(journeyHref(id)); return; }
    setJump({ id, phase: "in" });
    window.setTimeout(() => router.push(journeyHref(id)), 1150);
  }, [jump, router]);

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

        {sharedOrbs && <OrbStage live={live && !jump} />}
        <ul className={s.worlds}>
          {projects.map((p, i) => (
            <li key={p.id} className={s.world} style={{ "--accent": p.accent, "--i": i } as CSSProperties} data-id={p.id} data-default={p.id === "armi"} data-chosen={diving === p.id}>
              <button type="button" className={s.hit} onClick={() => enter(p.id)} aria-label={`${p.no} ${p.name} 프로젝트로 들어가기 · ${p.flow}`}>
                <span className={s.label} aria-hidden="true"><span className={s.no}>{p.no}</span><strong>{p.name}</strong><small>{p.flow}</small></span>
                <span className={s.orbWrap} aria-hidden="true">
                  <span className={s.orb}>
                    {/* The orbs stop animating once a dive starts. */}
                    <OrbCanvas id={p.id} accent={p.accent} live={live && !jump} />
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <aside className={s.cta}>
          <span className={s.ctaRule} aria-hidden="true" />
          <p>보고 싶은 프로젝트를 <br />골라 들어가 보세요.</p>
          <button type="button" className={s.start} onClick={() => enter("armi")}>ARMI부터 보기 <span aria-hidden="true">→</span></button>
          <small>프로젝트마다 한 페이지씩, 끝에서 다음 프로젝트로 이어집니다.</small>
        </aside>

        <p className={s.scrollHint} aria-hidden="true">SCROLL FOR PERSONAL WORKS ↓</p>
      </div>
      {/* Direct-choice tunnel: fixed, because the page jumps underneath it. */}
      {mounted && jump && createPortal(
        <div className={s.jumpLayer} data-phase={jump.phase}>
          {(() => { const p = projects.find(x => x.id === jump.id)!; return <Tunnel accent={p.accent} intensity={1} label={{ no: p.no, name: p.name, line: p.line }} fixed />; })()}
        </div>, document.body)}
    </section>
  );
}

