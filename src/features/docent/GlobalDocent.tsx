"use client";

import dynamic from "next/dynamic";
import { Bot, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { DocentRuntimeProvider, useDocentRuntime } from "./DocentRuntime";
import {
  globalDocentPresentationReducer,
  initialGlobalDocentState,
  defaultGlobalDocentView,
  persistGlobalDocentView,
  readGlobalDocentView,
} from "./globalDocentState";
import { OPEN_GLOBAL_DOCENT_EVENT } from "./globalDocentEvents";
import { useContextualHint } from "./useContextualHint";

const DocentExperience = dynamic(
  () => import("./DocentExperience").then((module) => module.DocentExperience),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        도슨트를 불러오는 중…
      </div>
    ),
  },
);

interface OpenGlobalDocentDetail {
  question?: string;
}

function GlobalDocentPresentation() {
  const runtime = useDocentRuntime();
  const [state, dispatch] = useReducer(
    globalDocentPresentationReducer,
    initialGlobalDocentState,
  );
  const [focusInputToken, setFocusInputToken] = useState(0);
  const [storageReady, setStorageReady] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const { hint, dismiss } = useContextualHint(runtime.pageContext, state);
  const isOpen = state === "expanded";

  const open = useCallback(() => {
    dispatch({ type: "EXPAND" });
    setFocusInputToken((token) => token + 1);
  }, []);

  const minimize = useCallback(() => {
    dispatch({ type: "MINIMIZE" });
    requestAnimationFrame(() => launcherRef.current?.focus());
  }, []);

  useEffect(() => {
    const firstVisitDefault = defaultGlobalDocentView(window.innerWidth);
    dispatch({
      type: "HYDRATE",
      view: readGlobalDocentView(window.localStorage, firstVisitDefault),
    });
    setStorageReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.globalDocentView = state;
  }, [state]);

  useEffect(() => () => {
    delete document.documentElement.dataset.globalDocentView;
  }, []);

  useEffect(() => {
    if (storageReady) persistGlobalDocentView(state, window.localStorage);
  }, [state, storageReady]);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<OpenGlobalDocentDetail>).detail;
      open();
      if (detail?.question) runtime.send(detail.question);
    };
    window.addEventListener(OPEN_GLOBAL_DOCENT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_GLOBAL_DOCENT_EVENT, onOpen);
  }, [open, runtime]);

  const chooseHint = () => {
    if (!hint) return;
    dismiss(hint);
    open();
    runtime.send(hint.question);
  };

  const dismissHint = () => {
    if (!hint) return;
    dismiss(hint);
  };

  return (
    <aside
      className="pointer-events-none fixed inset-0 z-[60]"
      data-global-docent
      data-docent-state={state}
      aria-label="AI 도슨트"
    >
      {hint && state === "minimized" ? (
        <div className="pointer-events-auto fixed bottom-[76px] right-3 w-[min(320px,calc(100vw-24px))] rounded-[20px] border border-slate-200 bg-white p-4 text-[#111827] shadow-[0_18px_55px_rgba(15,23,42,0.2)] sm:bottom-24 sm:right-6">
          <div className="flex items-start gap-3">
            <Sparkles aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
            <button
              type="button"
              onClick={chooseHint}
              className="flex-1 text-left text-sm font-semibold leading-6 outline-none hover:text-blue-700 focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              {hint.label}
            </button>
            <button
              type="button"
              onClick={dismissHint}
              aria-label="이 제안 닫기"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-500 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <section
          id="global-docent-panel"
          role="dialog"
          aria-modal="false"
          aria-label="포트폴리오 AI 도슨트"
          aria-hidden={!isOpen}
          data-docent-panel
          style={{ maxHeight: "calc(100dvh - 5rem - env(safe-area-inset-bottom))" }}
          className={`pointer-events-auto fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-3 flex h-[430px] w-[min(390px,calc(100vw-24px))] flex-col overflow-hidden rounded-[26px] border border-white/10 bg-[#0B1120]/[0.98] p-3 text-white shadow-[0_24px_90px_rgba(0,0,0,0.45)] backdrop-blur transition-[opacity,transform,visibility] duration-200 motion-reduce:transition-none sm:bottom-[max(1.25rem,env(safe-area-inset-bottom))] sm:right-5 sm:h-[700px] sm:w-[360px] sm:p-4 xl:right-6 xl:w-[390px] ${
            isOpen
              ? "visible translate-y-0 scale-100 opacity-100"
              : "invisible translate-y-3 scale-[0.96] opacity-0"
          }`}
        >
          <div className="flex shrink-0 items-center justify-between px-1 pb-3">
            <div>
              <p className="cinematic-label text-blue-300">AI Docent</p>
              <p className="mt-1 text-xs text-slate-400">현재 페이지를 바탕으로 답합니다.</p>
            </div>
            <button
              type="button"
              onClick={minimize}
              aria-label="AI Docent 최소화"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-slate-300 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1" data-lenis-prevent>
            <DocentExperience focusInputToken={focusInputToken} />
          </div>
        </section>

      <button
        ref={launcherRef}
        type="button"
        onClick={open}
        aria-expanded={isOpen}
        aria-controls="global-docent-panel"
        aria-label="AI Docent 열기"
        className={`pointer-events-auto fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-3 inline-flex h-[52px] min-w-[52px] items-center justify-center gap-2 rounded-full bg-[#0B1120] px-4 text-white shadow-[0_12px_40px_rgba(11,17,32,0.35)] ring-1 ring-white/15 outline-none transition-[opacity,transform,visibility] duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none sm:bottom-[max(1.25rem,env(safe-area-inset-bottom))] sm:right-5 xl:right-6 ${
          isOpen
            ? "invisible pointer-events-none translate-y-2 scale-[0.96] opacity-0"
            : "visible translate-y-0 scale-100 opacity-100"
        }`}
      >
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500/20 ring-1 ring-blue-300/30">
          <Bot aria-hidden="true" className="h-4 w-4 text-blue-200" />
        </span>
        <span className="cinematic-label whitespace-nowrap text-[11px] text-blue-100">
          AI DOCENT
        </span>
      </button>
    </aside>
  );
}

export function GlobalDocent() {
  return (
    <DocentRuntimeProvider>
      <GlobalDocentPresentation />
    </DocentRuntimeProvider>
  );
}
