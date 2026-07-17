"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { DocentEmotion } from "@/types/docent";
import { ChatPanel } from "./ChatPanel";
import { useDocentChat } from "./useDocentChat";

const AvatarCanvas = dynamic(() => import("./AvatarCanvas"), {
  ssr: false,
  loading: () => <AvatarSkeleton />,
});

function AvatarSkeleton() {
  return (
    <div className="relative h-[42vh] min-h-[300px] w-full overflow-hidden rounded-[32px] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.15),rgba(11,17,32,0.6))] lg:h-[560px]">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-3 w-3 animate-pulse rounded-full bg-blue-400/70" />
      </div>
    </div>
  );
}

export function DocentExperience() {
  const [emotion, setEmotion] = useState<DocentEmotion>("neutral");
  const chat = useDocentChat({ onEmotion: setEmotion });

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <AvatarCanvas emotion={emotion} speaking={chat.isStreaming} />
      <ChatPanel {...chat} />
    </div>
  );
}
