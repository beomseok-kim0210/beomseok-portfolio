"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DocentEmotion, DocentPageContext } from "@/types/docent";
import { ChatPanel } from "./ChatPanel";
import { useDocentChat } from "./useDocentChat";
import { usePageContext } from "./usePageContext";
import { useSupertonicVoice } from "./useSupertonicVoice";
import { useVoice } from "./useVoice";

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

const DEV = process.env.NODE_ENV !== "production";

interface DocentExperienceProps {
  /** 라우터에서 유도한 값을 덮어쓴다 (예: 프로젝트 페이지의 도크). */
  pageContext?: Partial<DocentPageContext>;
  /** 도크(드로어) 안에서 세로로 쌓는 좁은 배치. */
  compact?: boolean;
}

export function DocentExperience({ pageContext: override, compact = false }: DocentExperienceProps = {}) {
  const [emotion, setEmotion] = useState<DocentEmotion>("neutral");
  const pageContext = usePageContext(override);
  const chat = useDocentChat({ onEmotion: setEmotion, pageContext });
  const voice = useVoice();
  const supertonic = useSupertonicVoice();

  /**
   * 발화 하나에 엔진 하나.
   *
   * 주 경로는 Supertonic 이 만든 파형을 재생하면서 같은 파형을 읽은 LAM 타임라인으로
   * 입을 움직인다. 그 경로가 실패했을 때만 브라우저 TTS + viseme 라벨로 내려간다.
   * 조용히 내려가지는 않는다 — 어느 엔진이 말했는지 진단에 남는다.
   */
  const [lastEngine, setLastEngine] = useState<"supertonic" | "browser_tts" | "none">("none");

  const speakOnce = useCallback(async (content: string) => {
    voice.stopSpeaking();
    const outcome = await supertonic.speak(content);
    if (outcome === "ok") {
      setLastEngine("supertonic");
      return;
    }
    if (outcome === "superseded") {
      // 이 발화는 이미 다음 발화에 밀려났다. 여기서 폴백을 켜면 새 발화 위에
      // 옛 문장을 겹쳐 읽게 된다 — 아무것도 하지 않는 것이 맞다.
      return;
    }
    setLastEngine("browser_tts");
    voice.speak(content);
  }, [supertonic, voice]);

  // 스트리밍이 끝나면 (음성 모드일 때) 마지막 도슨트 답변을 낭독한다.
  const spokenCountRef = useRef(0);
  useEffect(() => {
    if (chat.isStreaming || !voice.voiceEnabled) return;
    const last = chat.messages[chat.messages.length - 1];
    if (
      last?.role === "assistant" &&
      last.content &&
      chat.messages.length > spokenCountRef.current
    ) {
      spokenCountRef.current = chat.messages.length;
      void speakOnce(last.content);
    }
  }, [chat.isStreaming, chat.messages, voice.voiceEnabled, speakOnce, voice]);

  // 음성을 끄면 둘 다 즉시 멈춘다. 입은 중립으로 돌아간다.
  useEffect(() => {
    if (!voice.voiceEnabled) {
      supertonic.stop();
      voice.stopSpeaking();
    }
  }, [voice.voiceEnabled, supertonic, voice]);

  /**
   * 음성을 켜는 순간 원격 워커를 미리 깨운다.
   *
   * 합성은 답변 스트리밍이 끝난 뒤에야 시작되는데, scale-to-zero 워커의 콜드 스타트는
   * 그 시점에 줄일 수 있는 것이 아니다(측정: 콜드 84 초 중 컨테이너 내부 준비는 7 초,
   * 나머지는 GPU 배정·기동). 음성을 켜는 것은 합성보다 한참 앞선 신호라, 여기서 걸면
   * 그 시간이 사용자의 타이핑·답변 생성과 겹친다.
   *
   * 서버가 공짜 조회로 "이미 떠 있음" 을 먼저 확인하므로 켰다 껐다 해도 비용이 쌓이지
   * 않는다. 실패는 무시한다 — 예열이 안 되면 평소대로 콜드를 겪을 뿐이다.
   */
  useEffect(() => {
    if (!voice.voiceEnabled) return;
    const controller = new AbortController();
    void fetch("/api/docent/voice/warm", { method: "POST", signal: controller.signal }).catch(() => undefined);
    return () => controller.abort();
  }, [voice.voiceEnabled]);

  // 질문을 보낼 때도 한 번 더. 음성을 켜 둔 채 오래 머물면 워커가 다시 잠들기 때문이다
  // (idle timeout). 답변 생성과 기동이 겹치므로 여기가 마지막으로 남은 겹칠 기회다.
  const sendWithWarm = useCallback((text: string) => {
    if (voice.voiceEnabled) {
      void fetch("/api/docent/voice/warm", { method: "POST" }).catch(() => undefined);
    }
    chat.send(text);
  }, [voice.voiceEnabled, chat]);

  // 진단 전역. 렌더에서 걸면 StrictMode 의 이중 호출이 cleanup 을 먼저 돌려 값을
  // 지워 버리므로, 매 렌더 뒤 effect 에서 새로 걸고 언마운트에서만 지운다.
  useEffect(() => {
    if (!DEV || typeof window === "undefined") return;
    (window as unknown as { __ddVoice?: unknown }).__ddVoice = {
      lastEngine,
      pageContext,
      lastAnswer: chat.lastAnswer,
      supertonic: {
        engine: supertonic.engine,
        speaking: supertonic.speaking,
        preparing: supertonic.preparing,
        error: supertonic.error,
        meta: supertonic.meta,
        currentTime: supertonic.currentTime,
        mouth: supertonic.mouth,
      },
      browserTts: { speaking: voice.ttsSpeaking, viseme: voice.viseme },
      voiceEnabled: voice.voiceEnabled,
    };
    return () => { delete (window as unknown as { __ddVoice?: unknown }).__ddVoice; };
  });

  return (
    <div
      className={compact ? "grid gap-4" : "grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"}
      data-docent-page-type={pageContext.pageType}
      data-docent-project={pageContext.projectSlug ?? ""}
    >
      <AvatarCanvas emotion={emotion} viseme={voice.viseme} mouth={supertonic.mouth} compact={compact} />
      <ChatPanel {...chat} send={sendWithWarm} voice={voice} compact={compact} />
    </div>
  );
}
