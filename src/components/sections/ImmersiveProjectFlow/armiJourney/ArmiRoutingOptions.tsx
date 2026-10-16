"use client";
import { useEffect, useRef } from "react";
import type { WorldRuntime } from "@/features/world/director/worldRuntime";
import { armiOptionsWindow, local } from "@/features/world/adapters/armiChoreography";
import { armiOptionNames, isArmiOptionsVisible } from "@/features/world/adapters/armiRoutingOptions";
import styles from "./journey.module.css";
import { routingCue } from "@/features/world/adapters/armiRoutingCue";
const routeDescriptions = ["일반 질문 → 대화형 답변", "기억 조회 → 관련 저장 기억", "외부 정보 검색 → 웹 자료", "행동 명령 → 로봇 동작"];

export function ArmiRoutingOptions({ runtime }: { runtime: WorldRuntime }) {
  const root = useRef<HTMLDivElement>(null);
  const request = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const sync = () => {
      if (!root.current) return;
      const p = runtime.progress.current, selected = local(p, armiOptionsWindow.select, armiOptionsWindow.select + .01);
      const cue = routingCue(p);
      if (request.current) {
        const alpha = local(p,.326,.329) * (1-local(p,.343,armiOptionsWindow.start));
        request.current.style.opacity=String(alpha);
        request.current.style.visibility=alpha>.001?"visible":"hidden";
        request.current.style.transform=`translate(-50%,-50%) translateY(${(1-alpha)*18}px)`;
      }
      root.current.style.visibility = isArmiOptionsVisible(p) ? "visible" : "hidden";
      root.current.style.opacity = String(cue.blend);
      // Preview walks the four destinations one at a time (TEXT → MEMORY → TAVILY → ROBOT) before the choice.
      const span = (armiOptionsWindow.select - armiOptionsWindow.start) / 4;
      const pre = p < armiOptionsWindow.select ? Math.min(3, Math.max(0, Math.floor((p - armiOptionsWindow.start - span * .25) / span))) : -1;
      root.current.querySelectorAll<HTMLElement>("[data-option]").forEach((panel, i) => {
        const dim = pre >= 0 ? (i === pre ? 0 : .62) : i === 0 ? 0 : selected * .8;
        panel.style.background = dim > 0 ? `rgba(3,8,12,${dim})` : "transparent";
        panel.style.borderColor = (i === 0 && cue.blink > .15) || i === pre ? "#d2f059" : "#758991";
        panel.dataset.focus = String(i === pre);
        panel.style.boxShadow = i === 0 ? `inset 0 0 ${18*cue.blink}px #d2f05980,0 0 ${12*cue.blink}px #d2f05980` : "inset 0 0 0 2px #060e16";
        panel.dataset.selected = String(i === 0 && selected > 0);
        const status = panel.querySelector<HTMLElement>("small")!;
        status.textContent = selected > 0 ? i === 0 ? "SELECTED → TEXT ROUTE" : "NOT SELECTED" : "CAPABILITY PREVIEW";
      });
    };
    sync(); return runtime.subscribeFrame(sync);
  }, [runtime]);
  return <>
    <p ref={request} className={styles.routingRequest} aria-label="라우팅 코어에서 사용자 요청을 분류합니다">
      <strong>USER REQUEST · 사용자의 음성 요청</strong>
      <span>사용자의 음성 요청을 분류 중 · 답변 / 기억 조회 / 검색 / 로봇 행동</span>
    </p>
    <div ref={root} className={styles.routingOptions} aria-label="네 라우팅 목적지 기능 미리보기">
    {armiOptionNames.map((name, i) => <div data-option key={name}><h4>{name}</h4><small>CAPABILITY PREVIEW</small><p className={styles.routeDescription}>{routeDescriptions[i]}</p></div>)}
  </div></>;
}
