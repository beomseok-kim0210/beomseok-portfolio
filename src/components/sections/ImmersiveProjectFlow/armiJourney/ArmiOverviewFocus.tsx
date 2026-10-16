"use client";
import { useEffect, useRef } from "react";
import type { WorldRuntime } from "@/features/world/director/worldRuntime";
import styles from "./journey.module.css";

/** Introduction order inside the overview hold (one stop each). */
export const overviewParts = [
  { id: "Text", name: "TEXT ANSWER", ko: "일반 질문 → 대화형 답변" },
  { id: "Robot", name: "ROBOT ACTION", ko: "행동 명령 → 로봇 동작" },
  { id: "Tavily", name: "TAVILY SEARCH", ko: "외부 정보 검색 → 웹 자료" },
  { id: "Memory", name: "MEMORY RETRIEVAL", ko: "기억 조회 → 관련 저장 기억" },
] as const;

/** Spotlight over the establishing shot: the room dims except the destination being introduced. */
export function ArmiOverviewFocus({ runtime }: { runtime: WorldRuntime }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sync = () => {
      const el = root.current; if (!el) return;
      const f = runtime.armiOverview.current;
      const on = f >= 0;
      // Fade in/out at the edges of the hold; inside it, one part per quarter.
      const alpha = on ? Math.min(1, f / .06, (1 - f) / .06) : 0;
      el.style.opacity = String(Math.max(0, alpha));
      el.style.visibility = alpha > .001 ? "visible" : "hidden";
      if (!on) return;
      const i = Math.min(3, Math.floor(f * 4)), part = overviewParts[i], at = runtime.armiAnchors.current[part.id];
      if (!at) return;
      el.style.setProperty("--fx", `${at[0].toFixed(1)}px`); el.style.setProperty("--fy", `${at[1].toFixed(1)}px`);
      el.dataset.part = part.id;
      el.querySelectorAll<HTMLElement>("[data-part]").forEach((card, k) => { card.dataset.on = String(k === i); });
    };
    sync(); return runtime.subscribeFrame(sync);
  }, [runtime]);
  return <div ref={root} className={styles.overviewFocus} aria-hidden="true">
    <i className={styles.overviewRing}/>
    {overviewParts.map((p, k) => <div key={p.id} data-part={p.id} className={styles.overviewCard}>
      <small>DESTINATION {String(k + 1).padStart(2, "0")} / 04</small><strong>{p.name}</strong><span>{p.ko}</span>
    </div>)}
  </div>;
}
