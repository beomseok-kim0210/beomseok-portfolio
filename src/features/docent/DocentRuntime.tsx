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
  lastEngine: "supertonic" | "browser_tts" | "none";
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
    stopSpeaking,
    voiceEnabled,
  } = voice;
  const {
    error: supertonicError,
    speaking: supertonicSpeaking,
    stop: stopSupertonic,
  } = supertonic;
  const [lastEngine, setLastEngine] = useState<DocentRuntimeValue["lastEngine"]>("none");

  const speakOnce = useCallback(async (content: string) => {
    stopSpeaking();
    voice.beginSynthesis();
    const outcome = await supertonic.speak(content);
    if (outcome === "ok") {
      setLastEngine("supertonic");
      return;
    }
    if (outcome === "superseded") return;
    setLastEngine("browser_tts");
    voice.speak(content);
  }, [stopSpeaking, supertonic, voice]);

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
      if (lifecycle === "VOICE_READY") {
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
      finishSpeaking();
    }
  }, [beginSpeaking, finishSpeaking, supertonicSpeaking]);

  useEffect(() => {
    if (voiceEnabled && supertonicError) reportError();
  }, [reportError, supertonicError, voiceEnabled]);

  useEffect(() => {
    if (!voiceEnabled) {
      pendingSpeechRef.current = null;
      stopSupertonic();
      stopSpeaking();
    }
  }, [stopSpeaking, stopSupertonic, voiceEnabled]);

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
      browserTts: { speaking: voice.ttsSpeaking, viseme: voice.viseme },
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
