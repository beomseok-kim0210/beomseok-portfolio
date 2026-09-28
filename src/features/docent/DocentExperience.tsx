"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { ChatPanel } from "./ChatPanel";
import { useDocentRuntime } from "./DocentRuntime";
import { readDocentMountMetrics, registerDocentAvatar } from "./docentMetrics";

const AvatarCanvas = dynamic(() => import("./AvatarCanvas"), {
  ssr: false,
  loading: () => <AvatarSkeleton />,
});

function AvatarSkeleton() {
  return (
    <div className="h-[136px] w-full shrink-0 overflow-hidden rounded-[22px] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.15),rgba(11,17,32,0.6))] sm:h-[204px]">
      <div className="flex h-full items-center justify-center">
        <div className="h-3 w-3 animate-pulse rounded-full bg-blue-400/70 motion-reduce:animate-none" />
      </div>
    </div>
  );
}

export interface DocentExperienceProps {
  focusInputToken?: number;
}

/** Presentation for the persistent runtime. Hiding it never destroys the provider. */
export function DocentExperience({ focusInputToken = 0 }: DocentExperienceProps) {
  const runtime = useDocentRuntime();
  const avatarId = useRef(`dd-avatar-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" || typeof window === "undefined") return;
    registerDocentAvatar(avatarId.current);
    const current = (window as unknown as { __ddGlobal?: Record<string, unknown> }).__ddGlobal;
    if (current) Object.assign(current, readDocentMountMetrics());
  }, []);

  return (
    <div
      className="flex h-full min-h-0 flex-col gap-3"
      data-docent-page-type={runtime.pageContext.pageType}
      data-docent-project={runtime.pageContext.projectSlug ?? ""}
    >
      <AvatarCanvas
        emotion={runtime.emotion}
        viseme={runtime.voice.viseme}
        mouth={runtime.supertonic.mouth}
        shell
      />
      <ChatPanel
        {...runtime.chat}
        send={runtime.send}
        voice={runtime.voice}
        compact
        fill
        focusInputToken={focusInputToken}
      />
    </div>
  );
}
