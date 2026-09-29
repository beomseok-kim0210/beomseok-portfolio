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
import { useSupertonicVoice, type SupertonicVoiceState } from "./useSupertonicVoice";
import { useVoice, type VoiceState } from "./useVoice";
import { readDocentMountMetrics, registerDocentRuntime } from "./docentMetrics";

const DEV = process.env.NODE_ENV !== "production";

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
  const speakOnce = useCallback(async (content: string) => {
    voice.beginSynthesis();
    const outcome = await supertonic.speak(content);
    if (outcome === "ok") setLastEngine("supertonic");
    // 읽을 글자가 없어 소리를 내지 않았다 — 합성 중 상태에 머물지 않게 돌려 놓는다
    if (outcome === "silent") voice.finishSpeaking();
  }, [supertonic, voice]);

  // Text is already visible here. Voice may wait for readiness; text never waits for voice.
  const spokenCountRef = useRef(0);
  const pendingSpeechRef = useRef<string | null>(null);
  useEffect(() => {
    if (chat.isStreaming || !voiceEnabled) return;
    const last = chat.messages[chat.messages.length - 1];
    if (
      last?.role === "assistant"
      && last.content
      && chat.messages.length > spokenCountRef.current
    ) {
      spokenCountRef.current = chat.messages.length;
      // 새 답변이 오면 앞 답변의 남은 세그먼트는 버린다. 말하는 중이거나 합성 중이면
      // READY 를 기다리지 않고 바로 교체한다 — 기다리면 긴 답변 뒤에 새 답이 1분 넘게 밀린다.
      // supertonic.speak 가 앞 발화의 합성 요청과 재생을 끊는다.
      if (
        lifecycle === "VOICE_READY"
        || lifecycle === "VOICE_SPEAKING"
        || lifecycle === "VOICE_SYNTHESIZING"
      ) {
        void speakOnce(last.content);
      } else {
        pendingSpeechRef.current = last.content;
        ensureReady();
      }
    }
  }, [chat.isStreaming, chat.messages, ensureReady, lifecycle, speakOnce, voiceEnabled]);

  useEffect(() => {
    if (!voiceEnabled || lifecycle !== "VOICE_READY") return;
    const pending = pendingSpeechRef.current;
    if (!pending) return;
    pendingSpeechRef.current = null;
    void speakOnce(pending);
  }, [lifecycle, speakOnce, voiceEnabled]);

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
      pendingSpeechRef.current = null;
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
    pendingSpeechRef.current = null;
    stopSupertonic();
    // 첫 세그먼트를 합성하던 중이었으면 "생성 중" 에 머물지 않게 준비 상태로 돌린다.
    // (재생 중이었으면 speaking → false 전이가 같은 일을 한다.)
    if (lifecycleRef.current === "VOICE_SYNTHESIZING") finishSpeaking();
  }, [finishSpeaking, listening, stopSupertonic]);

  // A text send can only prepare voice after the visitor explicitly enabled voice.
  const send = useCallback((text: string) => {
    if (voiceEnabled) ensureReady();
    chat.send(text);
  }, [chat, ensureReady, voiceEnabled]);

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
