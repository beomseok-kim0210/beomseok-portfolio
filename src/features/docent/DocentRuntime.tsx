"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { DocentEmotion, DocentPageContext } from "@/types/docent";
import { useDocentChat, type DocentChatState } from "./useDocentChat";
import { usePageContext } from "./usePageContext";
import { useSupertonicVoice, type SpeechStream, type SupertonicVoiceState } from "./useSupertonicVoice";
import { useVoice, type VoiceState } from "./useVoice";
import { readDocentMountMetrics, registerDocentRuntime } from "./docentMetrics";

const DEV = process.env.NODE_ENV !== "production";

/** 답변·발화가 끝난 뒤 감정 표정을 유지하는 시간. 그 뒤 중립으로 돌아간다. */
export const EMOTION_HOLD_AFTER_ANSWER_MS = 2_500;

export interface DocentRuntimeValue {
  emotion: DocentEmotion;
  pageContext: DocentPageContext;
  chat: DocentChatState;
  voice: VoiceState;
  supertonic: SupertonicVoiceState;
  /** 마지막으로 소리를 낸 엔진. Supertonic 외의 목소리는 없다. */
  lastEngine: "supertonic" | "none";
  send: (text: string) => void;
}

const DocentRuntimeContext = createContext<DocentRuntimeValue | null>(null);
export function DocentRuntimeProvider({ children }: { children: ReactNode }) {
  const runtimeId = useRef(`dd-runtime-${Math.random().toString(36).slice(2)}`);
  const [emotion, setEmotion] = useState<DocentEmotion>("neutral");
  const pageContext = usePageContext();
  const chat = useDocentChat({ onEmotion: setEmotion, pageContext });
  const voice = useVoice();
  const supertonic = useSupertonicVoice();
  const {
    beginSpeaking,
    ensureReady,
    finishSpeaking,
    lifecycle,
    reportError,
    voiceEnabled,
  } = voice;
  const {
    error: supertonicError,
    preparing: supertonicPreparing,
    speaking: supertonicSpeaking,
    stop: stopSupertonic,
  } = supertonic;
  const [lastEngine, setLastEngine] = useState<DocentRuntimeValue["lastEngine"]>("none");

  // 목소리는 Supertonic M1 하나뿐이다. 실패하면 다른 목소리로 이어 말하지 않는다 —
  // 텍스트는 이미 화면에 있고, 실패는 supertonic.error → VOICE_ERROR 로 드러난다.
  // 다음 답변은 ensureReady 가 VOICE_ERROR 에서 다시 시작하므로 그대로 재시도가 된다.
  //
  // 답변 전체를 기다리지 않는다: 답변이 스트리밍되는 동안 완결된 문장부터 합성·재생한다
  // (LLM 생성 · 합성 · 재생이 겹친다). 텍스트는 음성을 기다리지 않는다.
  const streamRef = useRef<{ index: number; stream: SpeechStream; ended: boolean } | null>(null);
  const handledIndexRef = useRef(-1);
  const pendingIndexRef = useRef<number | null>(null);
  const { startStream } = supertonic;

  const openStream = useCallback((index: number) => {
    voice.beginSynthesis();
    const stream = startStream();
    streamRef.current = { index, stream, ended: false };
    void stream.outcome.then((outcome) => {
      if (outcome === "ok") setLastEngine("supertonic");
      // 읽을 글자가 없어 소리를 내지 않았다 — 합성 중 상태에 머물지 않게 돌려 놓는다
      if (outcome === "silent") voice.finishSpeaking();
    });
    return streamRef.current;
  }, [startStream, voice]);

  // 답변이 자랄 때마다 스트림에 넘긴다. 새 답변이면 새 스트림(앞 발화는 끊긴다).
  useEffect(() => {
    if (!voiceEnabled) return;
    const index = chat.messages.length - 1;
    const last = chat.messages[index];
    if (index < handledIndexRef.current) handledIndexRef.current = -1; // 대화를 지웠다
    if (last?.role !== "assistant" || !last.content) return;

    let current = streamRef.current?.index === index ? streamRef.current : null;
    if (!current && index > handledIndexRef.current) {
      handledIndexRef.current = index;
      // 새 답변이 오면 앞 답변의 남은 세그먼트는 버린다. 말하는 중이거나 합성 중이면
      // READY 를 기다리지 않고 바로 교체한다 — 기다리면 긴 답변 뒤에 새 답이 1분 넘게 밀린다.
      if (
        lifecycle === "VOICE_READY"
        || lifecycle === "VOICE_SPEAKING"
        || lifecycle === "VOICE_SYNTHESIZING"
      ) {
        current = openStream(index);
      } else {
        // 음성 워커가 아직 준비되지 않았다(콜드 스타트). 텍스트는 그대로 흐르고,
        // 준비되는 순간 그때까지의 답변으로 스트림을 연다.
        pendingIndexRef.current = index;
        ensureReady();
        return;
      }
    }
    if (!current || current.ended) return;
    if (chat.isStreaming) {
      current.stream.update(last.content);
    } else {
      current.ended = true;
      current.stream.end(last.content);
    }
  }, [chat.isStreaming, chat.messages, ensureReady, lifecycle, openStream, voiceEnabled]);

  // 준비가 끝나면 기다리던 답변을 읽기 시작한다(아직 스트리밍 중이면 위 효과가 이어 받는다).
  useEffect(() => {
    if (!voiceEnabled || lifecycle !== "VOICE_READY") return;
    const index = pendingIndexRef.current;
    if (index === null) return;
    pendingIndexRef.current = null;
    const last = chat.messages[index];
    // 기다리는 동안 더 새로운 답변이 왔거나 대화가 지워졌으면 옛 답변은 읽지 않는다
    if (index !== chat.messages.length - 1 || last?.role !== "assistant" || !last.content) return;
    const opened = openStream(index);
    if (chat.isStreaming) {
      opened.stream.update(last.content);
    } else {
      opened.ended = true;
      opened.stream.end(last.content);
    }
  }, [chat.isStreaming, chat.messages, lifecycle, openStream, voiceEnabled]);

  // 답변과 발화가 모두 끝나면 표정을 잠시 두었다가 중립으로 돌린다 — 마지막 감정으로 굳어 있지 않게.
  // 음성이 아직 준비·합성 중이면 기다린다(그 답변의 감정으로 말해야 한다).
  const voiceBusy = voiceEnabled && (
    lifecycle === "VOICE_WARMING" || lifecycle === "VOICE_DELAYED"
    || lifecycle === "VOICE_SYNTHESIZING" || lifecycle === "VOICE_SPEAKING"
  );
  useEffect(() => {
    if (emotion === "neutral" || chat.isStreaming || supertonicSpeaking || supertonicPreparing || voiceBusy) return;
    const timer = setTimeout(() => setEmotion("neutral"), EMOTION_HOLD_AFTER_ANSWER_MS);
    return () => clearTimeout(timer);
  }, [chat.isStreaming, emotion, supertonicPreparing, supertonicSpeaking, voiceBusy]);

  const wasSupertonicSpeakingRef = useRef(false);
  useEffect(() => {
    if (supertonicSpeaking) {
      wasSupertonicSpeakingRef.current = true;
      beginSpeaking();
    } else if (wasSupertonicSpeakingRef.current) {
      wasSupertonicSpeakingRef.current = false;
      // 앞 발화가 새 발화로 교체된 것이면 끝난 것이 아니다 — 새 발화가 합성 중이다.
      // 여기서 READY 로 돌리면 합성하는 동안 "음성 준비 완료" 가 잘못 뜬다.
      if (!supertonicPreparing) finishSpeaking();
    }
  }, [beginSpeaking, finishSpeaking, supertonicPreparing, supertonicSpeaking]);

  useEffect(() => {
    if (voiceEnabled && supertonicError) reportError();
  }, [reportError, supertonicError, voiceEnabled]);

  useEffect(() => {
    if (!voiceEnabled) {
      pendingIndexRef.current = null;
      streamRef.current = null;
      stopSupertonic();
    }
  }, [stopSupertonic, voiceEnabled]);

  // 마이크가 켜지면 도슨트는 입을 다문다. 스피커 소리가 마이크로 들어가 받아 적히는 것을
  // 막고, 방문자가 끼어들었다는 뜻이기도 하다. 재생 중인 세그먼트·미리 합성 중인 다음
  // 세그먼트·아직 시작 못 한 발화를 모두 버린다 — 멈춘 답변은 다시 이어 말하지 않는다.
  const { listening } = voice;
  const lifecycleRef = useRef(lifecycle);
  lifecycleRef.current = lifecycle;
  useEffect(() => {
    if (!listening) return;
    pendingIndexRef.current = null;
    streamRef.current = null; // 끊긴 답변은 이어 말하지 않는다 — 스트림에 더 넘기지 않는다
    stopSupertonic();
    // 첫 세그먼트를 합성하던 중이었으면 "생성 중" 에 머물지 않게 준비 상태로 돌린다.
    // (재생 중이었으면 speaking → false 전이가 같은 일을 한다.)
    if (lifecycleRef.current === "VOICE_SYNTHESIZING") finishSpeaking();
  }, [finishSpeaking, listening, stopSupertonic]);

  // 음성은 기본으로 켜져 있고(첫 진입 때 useVoice 가 예열만 건다), 방문자가 끄면 여기서도 예열하지 않는다.
  // 워커가 쉬다 내려갔을 만큼 지났으면 질문을 보내는 순간 다시 깨운다 — 답변 텍스트가
  // 생성되는 동안 콜드 스타트가 겹쳐 진행된다. 텍스트는 이것을 기다리지 않는다.
  const { rewarmIfIdle } = voice;
  const send = useCallback((text: string) => {
    if (voiceEnabled) rewarmIfIdle();
    if (voiceEnabled) ensureReady();
    chat.send(text);
  }, [chat, ensureReady, rewarmIfIdle, voiceEnabled]);

  useEffect(() => {
    if (!DEV || typeof window === "undefined") return;
    registerDocentRuntime(runtimeId.current);
  }, []);

  useEffect(() => {
    if (!DEV || typeof window === "undefined") return;
    const diagnostic = {
      runtimeInstanceId: runtimeId.current,
      ...readDocentMountMetrics(),
      pathname: pageContext.pathname,
      sectionId: pageContext.sectionId ?? null,
      messageCount: chat.messages.length,
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
      voiceEnabled: voice.voiceEnabled,
    };
    (window as unknown as { __ddGlobal?: unknown; __ddVoice?: unknown }).__ddGlobal = diagnostic;
    (window as unknown as { __ddVoice?: unknown }).__ddVoice = diagnostic;
    return () => {
      delete (window as unknown as { __ddGlobal?: unknown }).__ddGlobal;
      delete (window as unknown as { __ddVoice?: unknown }).__ddVoice;
    };
  });

  return (
    <DocentRuntimeContext.Provider
      value={{ emotion, pageContext, chat, voice, supertonic, lastEngine, send }}
    >
      {children}
    </DocentRuntimeContext.Provider>
  );
}

export function useDocentRuntime(): DocentRuntimeValue {
  const value = useContext(DocentRuntimeContext);
  if (!value) throw new Error("useDocentRuntime must be used inside DocentRuntimeProvider");
  return value;
}
