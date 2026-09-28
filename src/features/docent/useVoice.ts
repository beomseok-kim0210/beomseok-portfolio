"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  estimateCharsPerSecond,
  textToVisemeTimeline,
  visemeAt,
  type VisemeKey,
  type VisemeTimeline,
} from "@/lib/docent/visemes";
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

/** TTS로 읽기 좋게 마크다운·이모지류 제거. */
function toSpeakable(text: string): string {
  return text
    .replace(/[*_`#>]/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .trim();
}

const SPEECH_RATE = 1.05;

export interface VoiceState {
  sttSupported: boolean;
  ttsSupported: boolean;
  listening: boolean;
  ttsSpeaking: boolean;
  voiceEnabled: boolean;
  lifecycle: VoiceLifecycle;
  statusMessage: string | null;
  failureStage: import("@/types/docent").DocentStage | null;
  /** 현재 발음 중인 입모양. 말하고 있지 않으면 null. */
  viseme: VisemeKey | null;
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
  speak: (text: string) => void;
  stopSpeaking: () => void;
}

export function useVoice(): VoiceState {
  const [sttSupported, setSttSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [ttsSpeaking, setTtsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [viseme, setViseme] = useState<VisemeKey | null>(null);
  const [lifecycleState, dispatchLifecycle] = useReducer(
    voiceLifecycleReducer,
    initialVoiceLifecycleState,
  );
  const [statusNow, setStatusNow] = useState(0);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const frameRef = useRef<number | null>(null);
  const voiceEnabledRef = useRef(false);
  const lifecycleRef = useRef(lifecycleState);
  lifecycleRef.current = lifecycleState;
  const warmCycleRef = useRef<Promise<void> | null>(null);
  const prepareIssuedRef = useRef(false);
  const warmAbortRef = useRef<AbortController | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 립싱크 진행 상태: onboundary가 실제 위치를 알려주고, 그 사이는 추정 속도로 보간
  const trackRef = useRef<{
    timeline: VisemeTimeline;
    charsPerSecond: number;
    anchorChar: number;
    anchorTime: number;
  } | null>(null);

  const stopVisemeLoop = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    trackRef.current = null;
    setViseme(null);
  }, []);

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
    setTtsSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      recognitionRef.current?.abort();
      warmAbortRef.current?.abort();
      if (pollTimerRef.current !== null) clearTimeout(pollTimerRef.current);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
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

      // 듣는 동안 TTS는 멈춘다 (에코 방지)
      window.speechSynthesis?.cancel();
      setTtsSpeaking(false);
      stopVisemeLoop();

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
    [stopVisemeLoop]
  );

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      stopVisemeLoop();

      const speakable = toSpeakable(text);
      if (!speakable) return;

      const utterance = new SpeechSynthesisUtterance(speakable);
      const isKorean = /[가-힣]/.test(speakable);
      utterance.lang = isKorean ? "ko-KR" : "en-US";
      const voices = synth.getVoices();
      const preferred = voices.find((v) =>
        v.lang.startsWith(isKorean ? "ko" : "en")
      );
      if (preferred) utterance.voice = preferred;
      utterance.rate = SPEECH_RATE;

      const timeline = textToVisemeTimeline(speakable);

      // 매 프레임 현재 문자 위치를 추정해 입모양을 갱신한다.
      const tick = () => {
        const track = trackRef.current;
        if (!track) return;
        const elapsed = (performance.now() - track.anchorTime) / 1000;
        const charIndex = track.anchorChar + elapsed * track.charsPerSecond;
        setViseme(visemeAt(track.timeline, charIndex));
        frameRef.current = requestAnimationFrame(tick);
      };

      utterance.onstart = () => {
        setTtsSpeaking(true);
        dispatchLifecycle({ type: "PLAYBACK_STARTED" });
        trackRef.current = {
          timeline,
          charsPerSecond: estimateCharsPerSecond(speakable, SPEECH_RATE),
          anchorChar: 0,
          anchorTime: performance.now(),
        };
        frameRef.current = requestAnimationFrame(tick);
      };

      // 단어 경계마다 실제 위치를 받아 추정 오차를 보정하고, 관측된 속도로 갱신
      utterance.onboundary = (event) => {
        const track = trackRef.current;
        if (!track || typeof event.charIndex !== "number") return;
        const now = performance.now();
        const elapsed = (now - track.anchorTime) / 1000;
        if (elapsed > 0.15 && event.charIndex > track.anchorChar) {
          const observed = (event.charIndex - track.anchorChar) / elapsed;
          // 관측값에 천천히 수렴시켜 튀는 것을 막는다
          track.charsPerSecond = track.charsPerSecond * 0.6 + observed * 0.4;
        }
        track.anchorChar = event.charIndex;
        track.anchorTime = now;
      };

      const finish = () => {
        setTtsSpeaking(false);
        stopVisemeLoop();
        dispatchLifecycle({ type: "PLAYBACK_FINISHED" });
      };
      utterance.onend = finish;
      utterance.onerror = () => {
        setTtsSpeaking(false);
        stopVisemeLoop();
        dispatchLifecycle({ type: "FAILED", stage: "tts" });
      };

      synth.speak(utterance);
    },
    [stopVisemeLoop]
  );

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setTtsSpeaking(false);
    stopVisemeLoop();
  }, [stopVisemeLoop]);

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
      window.speechSynthesis?.cancel();
    }
    setTtsSpeaking(false);
    stopVisemeLoop();
  }, [cancelWarmCycle, ensureReady, stopVisemeLoop]);

  const disableVoice = useCallback(() => {
    if (!voiceEnabledRef.current) return;
    voiceEnabledRef.current = false;
    setVoiceEnabled(false);
    prepareIssuedRef.current = false;
    cancelWarmCycle();
    dispatchLifecycle({ type: "DISABLE" });
    window.speechSynthesis?.cancel();
    setTtsSpeaking(false);
    stopVisemeLoop();
  }, [cancelWarmCycle, stopVisemeLoop]);

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
    ttsSpeaking,
    voiceEnabled,
    lifecycle: lifecycleState.status,
    statusMessage,
    failureStage: lifecycleState.failureStage,
    viseme,
    toggleVoice,
    disableVoice,
    ensureReady,
    beginSynthesis,
    beginSpeaking,
    finishSpeaking,
    reportError,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
