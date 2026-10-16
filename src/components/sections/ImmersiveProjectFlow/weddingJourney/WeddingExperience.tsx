"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useWorldHost } from "@/features/world/runtime/WorldHost";
import { worldPositionForDomProgress } from "@/features/world/director/worldRuntime";
import type { WorldRenderMode } from "@/features/world/types/contracts";
import { ramp, sampleWedding, wdExperts, wdModels, wdOuter, wdSceneRanges, wdScenes, wdScrollToTimeline, wdShots, wdTimelineToScroll, wdLocal, WD_ENTRY, WD_HOLD } from "@/features/world/adapters/weddingAtelier";
import { registerSteppedRange } from "@/features/world/runtime/sceneStepper";
import { weddingHoldStopY } from "@/features/world/runtime/journeyGeometry";
import { onDocentOverlayChange } from "@/features/docent/docentOverlay";
import { observeScrollLayout } from "../observeScrollLayout";
import { SceneChrome, SceneFooter, SceneHeaderList } from "../SceneHud";
import styles from "./wedding.module.css";

const IMG = "/images/wedding";
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Entry, after the brief has gone dark: a hairline of light → a full-length arched door → the room. */
function applyArch(view: HTMLElement, open: number, glow: HTMLElement | null) {
  const t = Math.max(0, Math.min(1, open));
  if (t >= 1) { view.style.clipPath = "none"; if (glow) glow.style.opacity = "0"; return; }
  // Closed: fully hidden, so the pinned Hangarae brief is all the visitor sees until the door opens.
  if (t <= 0) { view.style.clipPath = "inset(50% 50% 50% 50%)"; if (glow) glow.style.opacity = "0"; return; }
  const FW = view.offsetWidth, SW = view.clientWidth || FW, H = view.clientHeight;
  const a = smooth(Math.min(1, t / .4)), b = smooth(Math.max(0, (t - .4) / .6));
  // a: the hairline grows tall, then widens into a door; b: the door opens onto the whole frame.
  const w0 = 2 + (Math.min(SW * .2, H * .32) - 2) * smooth(Math.max(0, (a - .3) / .7)), h0 = H * (.12 + .6 * Math.min(1, a / .45)), k = 1 - b;
  const left = k * (SW / 2 - w0 / 2), right = k * (FW - SW / 2 - w0 / 2), top = k * (H * .55 - h0 / 2), bottom = k * (H * .45 - h0 / 2);
  const r = Math.max(1, k * w0 / 2);
  view.style.clipPath = `inset(${top}px ${right}px ${bottom}px ${left}px round ${r}px ${r}px 6px 6px)`;
  if (glow) Object.assign(glow.style, { translate: `${left}px ${top}px`, width: `${FW - left - right}px`, height: `${H - top - bottom}px`, borderRadius: `${r}px ${r}px 6px 6px`, opacity: String(t > .001 ? 1 - smooth(Math.max(0, (t - .75) / .25)) : 0) });
}

export function WeddingExperience() {
  const section = useRef<HTMLElement>(null), viewport = useRef<HTMLDivElement>(null), surface = useRef<HTMLDivElement>(null), glow = useRef<HTMLDivElement>(null);
  const { runtime, setSurface } = useWorldHost();
  const [mode, setMode] = useState<WorldRenderMode>("static"), [active, setActive] = useState(false), [shot, setShot] = useState(0), [split, setSplit] = useState(50);
  const fail = useCallback(() => setMode("fallback"), []);
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => { if (motion.matches) setMode("reduced-motion"); else { const c = document.createElement("canvas"), gl = c.getContext("webgl2"); setMode(gl ? "webgl" : "fallback"); gl?.getExtension("WEBGL_lose_context")?.loseContext(); } };
    sync(); motion.addEventListener("change", sync);
    const observer = new IntersectionObserver(([e]) => setActive(e.isIntersecting)); if (section.current) observer.observe(section.current);
    return () => { observer.disconnect(); motion.removeEventListener("change", sync); };
  }, []);
  useEffect(() => { if (surface.current) setSurface({ element: surface.current, video: null, active, mode, onFailure: fail }, "wedding"); return () => setSurface(null, "wedding"); }, [setSurface, mode, active, fail]);
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const node = section.current, view = viewport.current; if (!node || !view) return;
    runtime.weddingViewport.current = view;
    let previous = -1;
    const evidence = document.getElementById("hangarae-evidence");
    const apply = (p: number) => {
      const s = sampleWedding(p, mode === "reduced-motion"), q = s.q;
      const box = node.getBoundingClientRect();
      if (box.top < innerHeight && box.bottom > 72) runtime.publish(worldPositionForDomProgress("wedding", p), mode);
      node.dataset.worldDistrict = "wedding"; node.dataset.worldProgress = String(p);
      view.dataset.phase = wdShots[s.shot].id; view.dataset.compact = String(view.clientWidth <= 700); view.dataset.medium = String(view.clientWidth > 700 && view.clientWidth < 1100); view.dataset.static = String(mode !== "webgl");
      const set = (k: string, v: number) => view.style.setProperty(k, v.toFixed(4));
      wdScenes.forEach((_, i) => set(`--h${i}`, i === 0 ? ramp(q, .0, .03) * (1 - ramp(q, .11, .125)) : ramp(wdLocal(q, i), .0, .12) * (i === 6 ? 1 : 1 - ramp(wdLocal(q, i), .95, 1))));
      wdScenes.forEach((_, i) => set(`--s${i + 1}`, ramp(wdLocal(q, i), .04, .2) * (i === 6 ? 1 : 1 - ramp(wdLocal(q, i), .93, 1))));
      wdModels.forEach((_, i) => set(`--r${i}`, Math.max(0, Math.min(1, s.reveal - i)) * (1 - s.recede)));
      wdExperts.forEach((_, i) => set(`--e${i}`, Math.max(0, Math.min(1, s.seated - i)) * s.table));
      // 04 chart: A runs to the deadline, then into the unknown; B lands before it; then the judgement.
      const b = s.bend, r = (x: number, a: number, c: number) => Math.max(0, Math.min(1, (x - a) / (c - a)));
      set("--barA", r(b, 0, .4)); set("--barU", r(b, .3, .6)); set("--barB", r(b, .45, .75)); set("--dl", r(b, .15, .35)); set("--judge", r(b, .75, 1));
      set("--success", s.success); set("--fail", s.collapse); set("--verdict", s.verdict);
      set("--evidence", s.evidence); set("--pins", s.pins); set("--bend", s.bend); set("--threads", s.threads); set("--consensus", s.consensus); set("--mirror", s.mirror); set("--result", s.result);
      node.style.setProperty("--cue", s.cue.toFixed(4));
      const entryOn = innerWidth > 900 && mode !== "reduced-motion";
      if (evidence) {
        // The brief recedes into darkness before the door appears (a chapter break, not a scroll).
        const dim = entryOn ? ramp(s.entry, 0, .42) : 0;
        evidence.style.filter = dim > .001 ? `brightness(${(1 - .9 * dim).toFixed(3)})` : "";
        evidence.style.transform = dim > .001 ? `scale(${(1 - .035 * dim).toFixed(4)})` : "";
      }
      set("--tape", q); set("--intro", ramp(p, WD_ENTRY * .6, WD_ENTRY)); set("--flood", s.flood); set("--push", s.exitPush);
      applyArch(view, entryOn ? ramp(s.entry, .34, 1) : 1, glow.current);
      node.style.pointerEvents = entryOn && s.entry < .98 ? "none" : "";
      if (previous !== s.shot) { previous = s.shot; setShot(s.shot); }
    };
    const trigger: ScrollTrigger = ScrollTrigger.create({ trigger: node, start: "top 72px", end: "bottom bottom", invalidateOnRefresh: true,
      onUpdate: self => apply(wdScrollToTimeline(self.progress)), onRefresh: self => apply(wdScrollToTimeline(self.progress)) });
    /* Stepped scenes (pilot): one gesture = one scene. Stops sit where each scene's own animation has
       finished; the glide between them plays that animation. The hold (Hangarae brief + cue) is the first
       stop, the wedding brief the last; outside them the page scrolls freely. */
    const at = (t: number) => trigger.start + (trigger.end - trigger.start) * wdTimelineToScroll(t);
    const SETTLED = [.6, .86, .9, .75, .9, .7, .3] as const;
    const stopRange = registerSteppedRange({
      id: "wedding",
      enabled: () => mode !== "reduced-motion",
      stops: () => {
        const brief = document.getElementById("wedding-brief");
        return [
          { y: weddingHoldStopY(wdTimelineToScroll(WD_HOLD * .5)) ?? at(WD_HOLD * .5), duration: 1.8, label: "hold" },
          ...wdSceneRanges.map(([a, b], i) => ({ y: at(wdOuter(a + (b - a) * SETTLED[i])), duration: i === 0 ? 2.6 : i === 1 ? 4.5 : 1.5, label: wdScenes[i].id })),
          ...(brief ? [{ y: brief.getBoundingClientRect().top + window.scrollY - 72, duration: 2.1, label: "brief" }] : []),
        ];
      },
    });
    /* The Hangarae debrief holds still (bottom-pinned) through the hold and the door opening. */
    const pin = () => { if (evidence) evidence.style.top = `${Math.min(72, innerHeight - evidence.offsetHeight)}px`; };
    if (evidence) { evidence.style.position = "sticky"; evidence.style.zIndex = "0"; pin(); }
    const evResize = new ResizeObserver(pin); if (evidence) evResize.observe(evidence);
    apply(wdScrollToTimeline(trigger.progress));
    const resize = new ResizeObserver(() => apply(wdScrollToTimeline(trigger.progress))); resize.observe(view);
    const stopDocent = onDocentOverlayChange(() => requestAnimationFrame(() => apply(wdScrollToTimeline(trigger.progress))));
    const stop = observeScrollLayout(node);
    const jump = () => { const v = new URLSearchParams(location.search).get("wedding"); if (v !== null && Number.isFinite(Number(v))) { ScrollTrigger.refresh(); const p = wdTimelineToScroll(Math.max(0, Math.min(1, Number(v)))); window.scrollTo({ top: trigger.start + (trigger.end - trigger.start) * p, behavior: "instant" }); } };
    const frame = requestAnimationFrame(jump);
    return () => { cancelAnimationFrame(frame); stop(); stopDocent(); resize.disconnect(); evResize.disconnect(); stopRange(); if (evidence) { evidence.style.position = ""; evidence.style.top = ""; evidence.style.filter = ""; evidence.style.transform = ""; } trigger.kill(); runtime.weddingViewport.current = null; };
  }, [runtime, mode]);

  const scene = Math.max(0, shot - 1), isStatic = mode !== "webgl";
  return <section id="wedding" ref={section} className={styles.track} aria-label="웨딩드레스 AI: 3D 복원의 한계를 분석하고 전문가 토의 기반 비교 경험으로 전환한 여정">
    <div className={styles.cueRail} aria-hidden="true"><div className={styles.cue} style={{ opacity: "var(--cue)" } as CSSProperties}>
      <span>NEXT PROJECT</span><strong>03 · 웨딩드레스 AI</strong><em>계속 내리면 다음 방으로 들어갑니다</em><i/>
    </div></div>
    <div ref={viewport} className={styles.viewport} data-phase={wdShots[shot].id} data-hud="lg">
      <div ref={surface} className={styles.canvas} aria-hidden="true"/>
      {isStatic && <div className={styles.still} aria-hidden="true"><img src={`${IMG}/ball-photo.webp`} alt=""/></div>}
      <div className={styles.veil} aria-hidden="true"/>
      <div ref={glow} className={styles.archGlow} aria-hidden="true"/>
      <div className={styles.scrim} aria-hidden="true"/>
      <div className={styles.dim} aria-hidden="true" style={{ opacity: "calc(var(--s4) * .62)" } as CSSProperties}/>

      <SceneHeaderList scenes={wdScenes}/>
      <SceneChrome project="03 / WEDDING DRESS AI" name="웨딩드레스 AI" count={wdScenes.length} current={scene + (shot > 0 ? 1 : 0)} skipHref="#wedding-brief"/>

      {/* 01 — the question */}
      <div className={styles.question} style={{ opacity: "var(--s1)" } as CSSProperties}>
        <h2>사람은 자신에게 <em>가장 어울리는 선택</em>을<br/>얼마나 알고 있을까?</h2>
        <p className={styles.problem}><b>PROBLEM</b><span>시착 1벌당 5~8만원 (문제 정의 당시)</span><span>입어 볼수록 쌓이는 드레스 투어 비용</span></p>
      </div>

      {/* 02 — candidate tags hang above each form */}
      {wdModels.map((m, i) => <div key={m.id} className={styles.tag} data-status={m.status} style={{ left: `var(--a-g${i}-x)`, top: `var(--a-g${i}-y)`, opacity: `calc(var(--r${i}) * var(--s2) * var(--a-g${i}-z,1))`, "--d": `${(i % 2) * 1.2}deg` } as CSSProperties}>
        <i className={styles.string}/>
        <span className={styles.year}>{m.year} · {m.kind}</span>
        <strong>{m.name}</strong>
        <span className={styles.status}>{m.status}</span>
        <p>{m.note}</p>
        <span className={styles.fit} aria-label={`드레스 적합도 ${m.fit}/5`}>{Array.from({ length: 5 }, (_, k) => <i key={k} data-on={k < m.fit}/>)}</span>
      </div>)}
      <dl className={styles.stats} style={{ opacity: "var(--s2)" } as CSSProperties}>
        {[["3 Weeks", "RESEARCH PERIOD"], ["10+", "ENVIRONMENT BUILDS"], ["30+", "REFERENCES"], ["100+", "RECONSTRUCTED SAMPLES"]].map(([v, l]) => <div key={l}><dt>{v}</dt><dd>{l}</dd></div>)}
      </dl>

      {/* 03 — real evidence: the ECON input and output */}
      <figure className={styles.evidence} style={{ opacity: "var(--evidence)" } as CSSProperties}>
        <figcaption><b>ACTUAL RESULT · ECON</b>같은 모델, 두 드레스 — 입력 사진 → 복원 출력</figcaption>
        <div className={styles.cases}>
          <div className={styles.case} data-ok="true"><span className={styles.caseTag}>SUCCESS · 머메이드 라인</span>
            <div className={styles.casePair}><img src={`${IMG}/mermaid-photo.webp`} alt="머메이드 드레스 입력 사진"/><img src={`${IMG}/mermaid-mesh.webp`} alt="ECON 복원 출력: 몸에 붙는 실루엣이 잘 복원됨"/></div>
            <p>몸에 붙는 라인 · 실루엣 복원</p></div>
          <div className={styles.case} style={{ opacity: "calc(.25 + .75 * var(--fail))" } as CSSProperties}><span className={styles.caseTag}>FAIL · 볼가운</span>
            <div className={styles.casePair}><img src={`${IMG}/ball-photo.webp`} alt="볼가운 드레스 입력 사진"/><img src={`${IMG}/ball-mesh.webp`} alt="ECON 복원 출력: 부피 있는 스커트가 반쪽만 복원됨"/></div>
            <p>부피 있는 스커트가 반쪽만</p></div>
        </div>
        <p className={styles.verdict3} style={{ opacity: "var(--verdict)" } as CSSProperties}><b>결론</b>웨딩드레스의 핵심은 볼륨 — 볼가운을 복원할 수 없어 3D 방식을 포기</p>
      </figure>
      <div className={styles.caseBadge} data-ok="true" style={{ left: "var(--a-mm-x)", top: "var(--a-mm-y)", opacity: "calc(var(--success) * var(--s3))" } as CSSProperties}>✓ 복원 성공<small>MERMAID · 몸에 붙는 라인</small></div>
      <div className={styles.caseBadge} style={{ left: "var(--a-bg-x)", top: "var(--a-bg-y)", opacity: "calc(var(--fail) * var(--s3))" } as CSSProperties}>✕ 복원 실패<small>BALL GOWN · 볼륨 손실</small></div>
      {["스커트 뒤쪽 부피가 잘려 나감", "볼륨이 반쪽만 복원"].map((l, i) => <div key={l} className={styles.pinLabel} data-side={i ? "left" : "right"} style={{ left: `var(--a-pin${i}-x)`, top: `var(--a-pin${i}-y)`, opacity: "var(--pins)" } as CSSProperties}>{l}<small>{i ? "WEDDING VOLUME · FAIL" : "LOOSE SKIRT · FAIL"}</small></div>)}

      {/* 04 — the decision bends */}
      <div className={styles.decision} style={{ opacity: "var(--s4)" } as CSSProperties}>
        <div className={styles.chart} aria-label="프로젝트 기한 대비 두 경로 비교">
          <div className={styles.route} data-route="3d">
            <span className={styles.routeName}><small>A</small>3D 복원 계속</span>
            <div className={styles.bar}><span className={styles.deadlineTag}>DEADLINE · 프로젝트 기한</span><i className={styles.barDone}/><i className={styles.barUnknown}/><em>?</em></div>
            <span className={styles.routeNote}>볼륨 문제 해결 시점 불확실 · 환경 재현만 10회+</span>
          </div>
          <div className={styles.route} data-route="sd">
            <span className={styles.routeName}><small>B</small>Stable Diffusion API · 2D 생성</span>
            <div className={styles.bar}><i className={styles.barSd}/><b className={styles.check2}>✓ 기한 내 완성</b></div>
            <span className={styles.routeNote}>생성 품질은 프롬프트 엔지니어링으로 보완</span>
          </div>
          <span className={styles.axis}>PROJECT TIME →</span>
          <p className={styles.judgement}><b>냉정한 판단</b>기한 안에 볼가운의 볼륨 문제를 풀 수 없다 → <strong>B를 선택</strong></p>
        </div>
        <ol className={styles.steps}>
          {[["01", "Stable Diffusion API", "2D 이미지 생성"], ["02", "프롬프트 엔지니어링 강화", "더 실감 나고 어울리는 결과"], ["03", "전문가 5명 프롬프트", "역할 · SKILL 지침"], ["04", "AI 추천 이유 요약", "왜 이 드레스인가"]].map(([n, t, d], i) =>
            <li key={n} style={{ transitionDelay: `${i * 60}ms` } as CSSProperties}><small>{n}</small><strong>{t}</strong><span>{d}</span></li>)}
        </ol>
      </div>

      {/* 05 — the council */}
      {wdExperts.map((e, i) => <div key={e.id} className={styles.expert} style={{ left: `var(--a-ex${i}-x)`, top: `var(--a-ex${i}-y)`, opacity: `var(--e${i})` } as CSSProperties}>
        <small>EXPERT 0{i + 1} · {e.en}</small><strong>{e.name}</strong><span>{e.focus}</span>
        <em><b>ROLE</b><b>SKILL</b><b data-rag="true">논문 RAG</b></em>
      </div>)}
      <div className={styles.credit} style={{ opacity: "var(--s5)" } as CSSProperties}>
        <span>전문가 5명의 역할 · SKILL 프롬프트 <b data-me="true">개인</b></span>
        <span>전문가별 논문 RAG <b>팀</b></span>
      </div>
      <div className={styles.verdict} style={{ opacity: "var(--consensus)" } as CSSProperties}>
        <small>CONSENSUS</small><strong>다섯 관점을 종합한 추천 드레스</strong><span>전문가별 추천 근거와 함께 제시</span>
      </div>

      {/* 06 — the mirror becomes the comparison */}
      <div className={styles.mirror} style={{ opacity: "var(--mirror)", "--split": `${split}%` } as CSSProperties}>
        <img src="/images/before_wedding.webp" alt="원본 사진"/>
        <img className={styles.after} src="/images/after_wedding.webp" alt="생성된 드레스 착용 이미지"/>
        <i className={styles.handle} aria-hidden="true"/>
        <span className={styles.lb}>BEFORE</span><span className={styles.la}>GENERATED</span>
        <input type="range" min={0} max={100} value={split} onChange={e => setSplit(Number(e.target.value))} aria-label="원본과 생성 결과 비교 슬라이더"/>
      </div>

      {/* 06 — the AI-written summary of why this dress (format shown; not a real output text) */}
      <aside className={styles.summary} style={{ opacity: "calc(var(--mirror) * (1 - var(--push)))" } as CSSProperties}>
        <small>AI SUMMARY · 추천 이유 요약</small>
        <strong>왜 이 드레스를 추천했는가</strong>
        <ul>{wdExperts.map(e => <li key={e.id}><b>{e.en}</b>{e.focus} 관점의 근거</li>)}</ul>
        <p>다섯 전문가의 의견을 AI가 한 문단으로 요약해 결과와 함께 제시합니다. (화면은 형식 예시)</p>
      </aside>

      {/* 07 — result */}
      <div className={styles.award} style={{ opacity: "var(--result)" } as CSSProperties}><small>TEAM RESULT</small><strong>생성형 AI 활용 산업융합 프로젝트 최우수상</strong></div>

      {/* Exit flood: the mirror fills the frame, then the paper of the brief takes over. */}
      <div className={styles.flood} aria-hidden="true" style={{ opacity: "var(--flood)" } as CSSProperties}/>

      {/* Signature: the tailor's tape is the scene progress. */}
      <div className={styles.tape} aria-hidden="true" style={{ opacity: "calc(var(--intro) * (1 - var(--push)))" } as CSSProperties}>
        <ol>{wdScenes.map((s, i) => <li key={s.id} data-on={i === scene && shot > 0}>{s.no}<span>{s.title}</span></li>)}</ol>
        <i className={styles.pin}/>
      </div>
      <p className={styles.srOnly} aria-live="polite">{shot > 0 ? `${wdScenes[scene].no} ${wdScenes[scene].title} — ${wdScenes[scene].ko}. ${wdScenes[scene].text}` : "웨딩드레스 AI"}</p>
      <SceneFooter note="ECON 입력·출력과 Before/After는 실제 결과물 · 드레스 폼과 토의 구조는 설명용 시각화"/>
    </div>
  </section>;
}
