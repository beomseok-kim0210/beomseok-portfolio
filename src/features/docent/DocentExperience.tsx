"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { projectEntity } from "@/lib/docent/rag/entities";
import { ChatPanel } from "./ChatPanel";
import { useDocentRuntime } from "./DocentRuntime";
import { readDocentMountMetrics, registerDocentAvatar } from "./docentMetrics";
import { resolveHologramState } from "./hologram/hologramConfig";

const AvatarCanvas = dynamic(() => import("./AvatarCanvas"), {
  ssr: false,
  loading: () => <AvatarSkeleton />,
});

function AvatarSkeleton() {
  return (
    <div className="mx-auto h-[clamp(148px,24dvh,210px)] w-full shrink-0 overflow-hidden rounded-[24px] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.15),rgba(11,17,32,0.6))] lg:aspect-square lg:h-auto lg:max-w-[520px] lg:rounded-[30px]">
      <div className="flex h-full items-center justify-center">
        <div className="h-3 w-3 animate-pulse rounded-full bg-blue-400/70 motion-reduce:animate-none" />
      </div>
    </div>
  );
}

export interface DocentExperienceProps {
  focusInputToken?: number;
  /** sidecar = 오른쪽 440px 사이드 패널(세로 한 줄), workspace = 전체 화면 2열. */
  layout?: "sidecar" | "workspace";
}

/** Presentation for the persistent runtime. Hiding it never destroys the provider. */
export function DocentExperience({ focusInputToken = 0, layout = "workspace" }: DocentExperienceProps) {
  const runtime = useDocentRuntime();
  const avatarId = useRef(`dd-avatar-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" || typeof window === "undefined") return;
    registerDocentAvatar(avatarId.current);
    const current = (window as unknown as { __ddGlobal?: Record<string, unknown> }).__ddGlobal;
    if (current) Object.assign(current, readDocentMountMetrics());
  }, []);

  // 3D 얼굴이 새 WebGL 컨텍스트로 돌아오는 중이면 질문에 "곧 활성화" 안내를 붙인다.
  const [avatarActive, setAvatarActive] = useState(true);
  const questionPending = runtime.chat.requestState.status === "searching"
    || runtime.chat.requestState.status === "answering"
    || runtime.chat.requestState.status === "delayed";

  // 음성 엔진 준비는 요청 상태(검색·생성)와 따로 보인다 — 텍스트가 흐르는 동안에도 워커는 깨어나는 중일 수 있다.
  const voiceWarming = runtime.voice.voiceEnabled
    && (runtime.voice.lifecycle === "VOICE_WARMING" || runtime.voice.lifecycle === "VOICE_DELAYED");

  const hologramState = resolveHologramState(
    runtime.chat.requestState.status,
    runtime.voice.lifecycle,
    runtime.supertonic.speaking,
  );

  const currentProjectTitle = projectEntity(runtime.pageContext.projectSlug)?.title;
  const contextLabel = currentProjectTitle
    ? `${currentProjectTitle}${runtime.pageContext.sectionId ? ` · ${runtime.pageContext.sectionId}` : ""}`
    : runtime.pageContext.pageType === "home"
      ? "포트폴리오 홈"
      : runtime.pageContext.pageType === "about"
        ? "소개"
        : runtime.pageContext.pageType === "skills"
          ? "기술"
          : "현재 페이지";

  // 두 배치는 같은 요소 트리를 쓰고 클래스만 바꾼다 — 사이드 패널 ↔ 전체 화면을
  // 오가도 아바타 캔버스(WebGL 컨텍스트)가 다시 마운트되지 않는다.
  const sidecar = layout === "sidecar";

  return (
    <div
      className={
        sidecar
          ? "flex h-full min-h-0 flex-col gap-3"
          : // 모바일 열을 minmax(0,1fr) 로 고정한다. 암묵적 auto 열은 캔버스가 이전 크기의
            // 픽셀 폭을 쥐고 있는 동안 그 폭으로 커져, 창을 줄이면 패널 밖으로 잘린다.
            "grid h-full min-h-0 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(360px,42%)_minmax(0,58%)] lg:grid-rows-1 lg:gap-7"
      }
      data-docent-layout={layout}
      data-docent-page-type={runtime.pageContext.pageType}
      data-docent-project={runtime.pageContext.projectSlug ?? ""}
    >
      <section
        className={
          sidecar
            ? "flex shrink-0 flex-col"
            : "flex min-h-0 flex-col rounded-[26px] border border-white/[0.08] bg-[#07101f]/75 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] sm:p-4 lg:rounded-[32px] lg:p-5"
        }
        data-docent-avatar-region
        aria-label="AI 도슨트 아바타와 현재 문맥"
      >
        <div className={sidecar ? "hidden" : "mb-3 flex shrink-0 items-end justify-between gap-4 lg:mb-5 lg:items-start"}>
          <div>
            <p className="cinematic-label text-[11px] text-sky-300">AI DOCENT</p>
            <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-white lg:text-2xl">
              포트폴리오를 함께 살펴봐요
            </h2>
          </div>
          <span className="hidden rounded-full border border-emerald-300/20 bg-emerald-300/[0.06] px-3 py-1 text-[11px] text-emerald-200 sm:inline-flex">
            시스템 준비됨
          </span>
        </div>

        <AvatarCanvas
          hologramState={hologramState}
          emotion={runtime.emotion}
          // 라벨 립싱크는 브라우저 내장 TTS 폴백 전용이었다. 폴백이 없어져 입은 LAM 만 움직인다.
          viseme={null}
          mouth={runtime.supertonic.mouth}
          speaking={runtime.supertonic.speaking}
          shell
          sidecar={sidecar}
          questionPending={questionPending}
          voiceWarming={voiceWarming}
          onActiveChange={setAvatarActive}
        />

        {sidecar ? (
          <p className="mt-2 truncate px-1 text-[11px] text-slate-500">
            현재 보고 있는 내용 · <span className="text-slate-300">{contextLabel}</span>
          </p>
        ) : null}

        <div className={sidecar ? "hidden" : "mt-3 grid shrink-0 grid-cols-2 gap-2 lg:mt-4"}>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] px-3 py-2.5 lg:px-4 lg:py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">현재 보고 있는 내용</p>
            <p className="mt-1 truncate text-xs font-medium text-slate-200 lg:text-sm">{contextLabel}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] px-3 py-2.5 lg:px-4 lg:py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">대화 모드</p>
            <p className="mt-1 text-xs font-medium text-slate-200 lg:text-sm">
              {runtime.voice.voiceEnabled ? "텍스트 + 음성" : "텍스트"}
            </p>
          </div>
        </div>
      </section>

      <section
        className={sidecar ? "min-h-0 flex-1" : "min-h-0"}
        data-docent-conversation-region
        aria-label="AI 도슨트 대화"
      >
        <ChatPanel
          {...runtime.chat}
          send={runtime.send}
          voice={runtime.voice}
          compact
          fill
          focusInputToken={focusInputToken}
          avatarRecovering={!avatarActive}
        />
      </section>
    </div>
  );
}
