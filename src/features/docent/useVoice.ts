"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  initialVoiceLifecycleState,
  isVoiceHealthReady,
  voiceLifecycleReducer,
  voicePollDelay,
  voiceStatusMessage,
  type VoiceLifecycle,
} from "./voiceLifecycle";
import { requestVoiceWarm } from "./voiceWarmClient";

// Web Speech API 타입 (TS 표준 lib에 없어 최소한만 선언)
interface SpeechRecognitionResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * 음성 입력(STT)과 음성 답변의 준비 상태를 맡는다. 소리를 내는 것은 여기가 아니다 —
 * 도슨트의 목소리는 오직 Supertonic 경로(`useSupertonicVoice`)에서만 나온다.
 *
 * 예전에는 여기에 브라우저 내장 TTS(Web Speech) 폴백이 있었다. Supertonic 이 실패하면 OS 의
 * 한국어 음성(Windows 에서는 여성 음성 Microsoft Heami)으로 조용히 이어 말했고, 긴 답변은
 * 늘 그 길로 갔다. 도슨트의 목소리가 다른 사람으로 바뀌는 것이라 제거했다(2026-09-29).
 */
export interface VoiceState {
  sttSupported: boolean;
  /** 음성 답변을 재생할 수 있는 환경인가 (HTMLAudioElement). */
  ttsSupported: boolean;
  listening: boolean;
  voiceEnabled: boolean;
  lifecycle: VoiceLifecycle;
  statusMessage: string | null;
  failureStage: import("@/types/docent").DocentStage | null;
  toggleVoice: () => void;
  disableVoice: () => void;
  /** 실제 헬스 신호를 확인하고, 필요할 때만 예열을 시작한다. 호출자는 기다리지 않는다. */
  ensureReady: () => void;
  beginSynthesis: () => void;
  beginSpeaking: () => void;
  finishSpeaking: () => void;
  reportError: () => void;
  startListening: (onTranscript: (text: string) => void) => void;
  stopListening: () => void;
}

export function useVoice(): VoiceState {
  const [sttSupported, setSttSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [lifecycleState, dispatchLifecycle] = useReducer(
    voiceLifecycleReducer,
    initialVoiceLifecycleState,
  );
  const [statusNow, setStatusNow] = useState(0);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceEnabledRef = useRef(false);
  const lifecycleRef = useRef(lifecycleState);
  lifecycleRef.current = lifecycleState;
  const warmCycleRef = useRef<Promise<void> | null>(null);
  const prepareIssuedRef = useRef(false);
  const warmAbortRef = useRef<AbortController | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelWarmCycle = useCallback(() => {
    warmAbortRef.current?.abort();
    warmAbortRef.current = null;
    if (pollTimerRef.current !== null) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    warmCycleRef.current = null;
  }, []);

  const ensureReady = useCallback(() => {
    if (!voiceEnabledRef.current || warmCycleRef.current) return;
    if (lifecycleRef.current.status === "VOICE_READY") return;
    if (
      lifecycleRef.current.status === "VOICE_SYNTHESIZING"
      || lifecycleRef.current.status === "VOICE_SPEAKING"
    ) return;
    if (lifecycleRef.current.status === "VOICE_ERROR") {
      dispatchLifecycle({ type: "ENABLE", now: Date.now() });
    }

    const controller = new AbortController();
    warmAbortRef.current = controller;

    const wait = (delay: number) => new Promise<void>((resolve) => {
      pollTimerRef.current = setTimeout(() => {
        pollTimerRef.current = null;
        resolve();
      }, delay);
      controller.signal.addEventListener("abort", () => resolve(), { once: true });
    });

    const cycle = (async () => {
      let attempt = 0;
      let warmRequested = false;
      while (voiceEnabledRef.current && !controller.signal.aborted) {
        let response: Response;
        let payload: unknown;
        try {
          response = await fetch("/api/docent/voice/health?probe=1", {
            signal: controller.signal,
            cache: "no-store",
          });
          payload = await response.json().catch(() => null);
        } catch {
          if (!controller.signal.aborted) dispatchLifecycle({ type: "FAILED", stage: "voice_warm" });
          return;
        }

        if (isVoiceHealthReady(payload)) {
          dispatchLifecycle({ type: "HEALTH_READY" });
          return;
        }
        if (!response.ok) {
          dispatchLifecycle({ type: "FAILED", stage: "voice_warm" });
          return;
        }

        dispatchLifecycle({ type: "HEALTH_WAITING", now: Date.now() });
        if (!warmRequested && !prepareIssuedRef.current) {
          warmRequested = true;
          prepareIssuedRef.current = true;
          const requested = await requestVoiceWarm(controller.signal);
          if (!requested && !controller.signal.aborted) {
            dispatchLifecycle({ type: "FAILED", stage: "voice_warm" });
            return;
          }
        }

        await wait(voicePollDelay(attempt));
        attempt += 1;
      }
    })();

    warmCycleRef.current = cycle;
    void cycle.finally(() => {
      if (warmCycleRef.current === cycle) warmCycleRef.current = null;
      if (warmAbortRef.current === controller) warmAbortRef.current = null;
    });
  }, []);

  useEffect(() => {
    setSttSupported(Boolean(getSpeechRecognition()));
    setTtsSupported(typeof window !== "undefined" && typeof window.Audio === "function");
    return () => {
      recognitionRef.current?.abort();
      warmAbortRef.current?.abort();
      if (pollTimerRef.current !== null) clearTimeout(pollTimerRef.current);
    };
  }, []);

  // 5초와 20초 경계에서만 다시 렌더한다. 폴링 횟수는 aria-live 문구에 영향을 주지 않는다.
  useEffect(() => {
    const since = lifecycleState.warmingSince;
    if (since === null) return;
    const elapsed = Date.now() - since;
    const boundary = elapsed < 5_000 ? 5_000 : elapsed < 20_000 ? 20_000 : null;
    if (boundary === null) return;
    const timer = setTimeout(() => {
      const now = Date.now();
      dispatchLifecycle({ type: "HEALTH_WAITING", now });
      setStatusNow(now);
    }, Math.max(0, boundary - elapsed));
    return () => clearTimeout(timer);
  }, [lifecycleState.status, lifecycleState.warmingSince, statusNow]);

  const startListening = useCallback(
    (onTranscript: (text: string) => void) => {
      const Recognition = getSpeechRecognition();
      if (!Recognition || recognitionRef.current) return;

      const recognition = new Recognition();
      recognition.lang = "ko-KR";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript?.trim();
        if (transcript) onTranscript(transcript);
      };
      recognition.onend = () => {
        recognitionRef.current = null;
        setListening(false);
      };
      recognition.onerror = () => {
        recognitionRef.current = null;
        setListening(false);
      };

      recognitionRef.current = recognition;
      setListening(true);
      recognition.start();
    },
    []
  );

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const toggleVoice = useCallback(() => {
    const next = !voiceEnabledRef.current;
    voiceEnabledRef.current = next;
    setVoiceEnabled(next);
    if (next) {
      prepareIssuedRef.current = false;
      dispatchLifecycle({ type: "ENABLE", now: Date.now() });
      // 네트워크 작업은 기다리지 않는다. 클릭 핸들러는 여기서 즉시 끝난다.
      queueMicrotask(ensureReady);
    } else {
      prepareIssuedRef.current = false;
      cancelWarmCycle();
      dispatchLifecycle({ type: "DISABLE" });
    }
  }, [cancelWarmCycle, ensureReady]);

  const disableVoice = useCallback(() => {
    if (!voiceEnabledRef.current) return;
    voiceEnabledRef.current = false;
    setVoiceEnabled(false);
    prepareIssuedRef.current = false;
    cancelWarmCycle();
    dispatchLifecycle({ type: "DISABLE" });
  }, [cancelWarmCycle]);

  const beginSynthesis = useCallback(() => {
    dispatchLifecycle({ type: "SYNTHESIS_STARTED" });
  }, []);
  const beginSpeaking = useCallback(() => {
    dispatchLifecycle({ type: "PLAYBACK_STARTED" });
  }, []);
  const finishSpeaking = useCallback(() => {
    dispatchLifecycle({ type: "PLAYBACK_FINISHED" });
  }, []);
  const reportError = useCallback(() => {
    dispatchLifecycle({ type: "FAILED", stage: "tts" });
  }, []);

  const statusMessage = voiceStatusMessage(
    lifecycleState,
    statusNow || Date.now(),
  );

  return {
    sttSupported,
    ttsSupported,
    listening,
    voiceEnabled,
    lifecycle: lifecycleState.status,
    statusMessage,
    failureStage: lifecycleState.failureStage,
    toggleVoice,
    disableVoice,
    ensureReady,
    beginSynthesis,
    beginSpeaking,
    finishSpeaking,
    reportError,
    startListening,
    stopListening,
  };
}
