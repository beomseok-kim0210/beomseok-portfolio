"use client";
import Link from "next/link";
import { useEffect, type CSSProperties, type ReactNode } from "react";
import { firstStopOf, registerSteppedRange } from "@/features/world/runtime/sceneStepper";
import { JOURNEY_QUERY } from "@/features/world/runtime/journeyGeometry";
import { journeyHref, journeyOf, nextJourney, type JourneyId } from "@/data/journeys";
import s from "./journey-frame.module.css";

/**
 * A journey page opens on its own title card. The card stays pinned while the project's world opens
 * over it with the same entry it had on Home (ARMI's circle, Hangarae's aperture, the wedding door),
 * so each page starts at the project, not in the middle of the previous one.
 */
export function JourneyCover({ id, children }: { id: JourneyId; children: ReactNode }) {
  const j = journeyOf(id);
  // One gesture from the title card lands on the project's first scene (its own stepped range continues).
  useEffect(() => registerSteppedRange({
    id: `cover-${id}`,
    enabled: () => matchMedia(JOURNEY_QUERY).matches,
    stops: () => { const first = firstStopOf(id); return first && first.y > 8 ? [{ y: 0, label: "cover" }, first] : []; },
  }), [id]);
  // The header reads its tone from what is under it on scroll; this frame hydrates after it, so ask once.
  // Arriving from the index (client navigation) keeps Home's scroll offset under smooth scrolling: a
  // journey always starts at its title card unless a deep link asks otherwise.
  useEffect(() => {
    if (!location.hash && !location.search) { window.__lenis?.scrollTo(0, { immediate: true, force: true }); window.scrollTo(0, 0); }
    window.dispatchEvent(new Event("scroll"));
  }, []);
  return <div className={s.frame} data-journey={id} style={{ "--accent": j.accent } as CSSProperties}>
    <div className={s.pin} data-header-tone="dark">
      <div className={s.card}>
        <Link href="/#journeys" className={s.back}>← 전체 프로젝트</Link>
        <p className={s.no}>{j.no} / PROJECT</p>
        <h1 className={s.name}>{j.name}</h1>
        <p className={s.line}>{j.line}</p>
        <p className={s.lede}>{j.lede}</p>
        <p className={s.cue}><span>SCROLL</span>스크롤하면 여정이 시작됩니다<i aria-hidden="true"/></p>
        <Link href={`/projects/${id}`} className={s.detail}>여정 없이 상세 기록 바로 보기 ↗</Link>
      </div>
    </div>
    <div className={s.space} aria-hidden="true"/>
    {children}
  </div>;
}

/** End of a journey page: the next project, or back to the index / on to the personal gallery. */
export function JourneyNext({ id }: { id: JourneyId }) {
  const next = nextJourney(id);
  return <nav className={s.next} aria-label="다음 여정" data-header-tone="dark">
    {next
      ? <Link href={journeyHref(next.id)} className={s.nextCard} style={{ "--accent": next.accent } as CSSProperties}>
          <small>NEXT PROJECT</small><strong>{next.no} · {next.name}</strong><span>{next.lede}</span><em>다음 여정으로 →</em>
        </Link>
      : <Link href="/#lab" className={s.nextCard} style={{ "--accent": "#eceae6" } as CSSProperties}>
          <small>NEXT</small><strong>04 · 개인 프로젝트 갤러리</strong><span>Digital Docent · BCOS · Crime Scene — 혼자 만든 작업들을 미술관처럼 둘러봅니다.</span><em>갤러리로 →</em>
        </Link>}
    <div className={s.nextLinks}>
      <Link href="/#journeys">← 전체 프로젝트 목차</Link>
      <Link href={`/projects/${id}`}>{journeyOf(id).name} 상세 기록 ↗</Link>
    </div>
  </nav>;
}
