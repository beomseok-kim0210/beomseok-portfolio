"use client";

import dynamic from "next/dynamic";
import { MessageCircleQuestion, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { DocentPageContext } from "@/types/docent";

// 3D 헤드와 음성 파이프라인은 열었을 때만 내려받는다 — 프로젝트 페이지 자체를 무겁게 하지 않는다.
const DocentExperience = dynamic(
  () => import("./DocentExperience").then((m) => m.DocentExperience),
  { ssr: false, loading: () => <p className="px-2 py-6 text-sm text-slate-400">도슨트를 불러오는 중…</p> },
);

interface DocentDockProps {
  /** 이 도크가 붙은 페이지가 가리키는 프로젝트. 라우터 값과 같아야 서버가 받아들인다. */
  projectSlug: DocentPageContext["projectSlug"];
  projectTitle: string;
}

/**
 * 프로젝트 페이지의 도슨트 도크. 우하단 버튼 → 드로어.
 *
 * 페이지 문맥은 여기서 명시적으로 넘긴다(라우터 유도값과 같다). 방문자가 이 페이지에서
 * "이 프로젝트에서 가장 어려웠던 점은?" 이라고 물으면 서버는 이 프로젝트를 먼저 본다.
 */
export function DocentDock({ projectSlug, projectTitle }: DocentDockProps) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // 열릴 때 포커스를 패널로 옮기고, 닫힐 때(Escape·X·토글 재클릭 어느 경로든) 토글
  // 버튼으로 되돌린다 — 키보드 사용자가 포커스를 잃지 않게.
  useEffect(() => {
    if (open) {
      panelRef.current?.focus();
    } else if (wasOpen.current) {
      toggleRef.current?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="docent-dock-panel"
        data-docent-dock-toggle
        className="fixed bottom-5 right-5 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-[#0B1120] px-5 text-sm font-medium text-white shadow-[0_12px_40px_rgba(11,17,32,0.35)] ring-1 ring-white/15 transition-transform hover:-translate-y-0.5"
      >
        <MessageCircleQuestion className="h-4 w-4 text-blue-300" />
        {open ? "도슨트 닫기" : `${projectTitle} 도슨트에게 묻기`}
      </button>

      {open ? (
        <section
          ref={panelRef}
          id="docent-dock-panel"
          role="dialog"
          aria-modal="false"
          aria-label={`${projectTitle} AI 도슨트`}
          tabIndex={-1}
          data-docent-dock-panel
          className="fixed bottom-20 right-4 z-40 w-[min(440px,calc(100vw-32px))] rounded-[28px] border border-white/10 bg-[#0B1120]/95 p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur focus:outline-none"
        >
          <div className="mb-3 flex items-center justify-between px-1">
            <div>
              <p className="cinematic-label text-blue-400">AI Docent</p>
              <p className="mt-1 text-sm text-slate-300">{projectTitle} 페이지를 보고 있다는 걸 알고 답합니다.</p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="도슨트 닫기"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-slate-300 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[calc(100vh-160px)] overflow-y-auto" data-lenis-prevent>
            <DocentExperience compact pageContext={{ projectSlug }} />
          </div>
        </section>
      ) : null}
    </>
  );
}
