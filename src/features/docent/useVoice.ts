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
  /**
   * 음성 워커가 쉬다가 내려갔을 만큼 시간이 지났으면 다시 예열한다. 질문을 보낼 때 부른다 —
   * 답변 텍스트가 생성되는 동안 워커가 깨어나도록. 텍스트는 이것을 기다리지 않는다.
   */
  rewarmIfIdle: () => void;
  beginSynthesis: () => void;
  beginSpeaking: () => void;
  finishSpeaking: () => void;
  reportError: () => void;
  startListening: (onTranscript: (text: string) => void) => void;
  stopListening: () => void;
}

/**
 * 마지막 음성 활동 뒤 이만큼 지나면 워커가 내려갔다고 보고 다시 예열한다. RunPod 유휴 제한(120초)
 * 보다 짧다 — 우리 쪽 마지막 활동 시각(재생 끝)은 워커의 마지막 작업(합성 끝)보다 늦기 때문이다.
 */
export const VOICE_REWARM_AFTER_MS = 90_000;

/**
 * 음성은 기본으로 켜져 있다(2026-10-01, Human 결정). 사이트에 들어오면 스피커 UI 가 켜진 상태로
 * 시작하고 RunPod 워커 예열만 바로 건다 — 소리는 내지 않는다. 브라우저 자동재생 정책을 우회하는
 * 무음 재생 같은 꼼수는 쓰지 않는다. 첫 답변 음성은 방문자가 질문을 보낸(사용자 활성화가 있는) 뒤에만 난다.
 *
 * 방문자가 끄면 그 선택을 이 브라우저에 기억해 다음 방문에도 꺼진 채로 시작한다(예열도 하지 않는다).
 * 저장소를 못 쓰면(사생활 보호 모드 등) 기본값(켜짐)으로 동작한다.
 *
 * 비용: 방문만으로 예열 요청이 나간다. RunPod workersMin 0 은 그대로라 유휴 120 초 뒤 내려가지만,
 * 질문 없이 떠나는 방문도 워커 기동(콜드 스타트) 시간만큼 GPU 를 쓴다.
 */
export const VOICE_PREFERENCE_KEY = "dd-voice-enabled";

export function readVoicePreference(storage: Pick<Storage, "getItem"> | null): boolean {
  try {
    return storage?.getItem(VOICE_PREFERENCE_KEY) !== "0";
  } catch {
    return true;
  }
}

export function persistVoicePreference(storage: Pick<Storage, "setItem"> | null, enabled: boolean): void {
  try {
    storage?.setItem(VOICE_PREFERENCE_KEY, enabled ? "1" : "0");
  } catch {
    // 저장하지 못해도 이번 방문의 선택은 유지된다
  }
}

function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function useVoice(): VoiceState {
  const [sttSupported, setSttSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [lifecycleState, dispatchLifecycle] = useReducer(
    voiceLifecycleReducer,
    initialVoiceLifecycleState,
  );
  const [statusNow, setStatusNow] = useState(0);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceEnabledRef = useRef(true);
  const lifecycleRef = useRef(lifecycleState);
  lifecycleRef.current = lifecycleState;
  const warmCycleRef = useRef<Promise<void> | null>(null);
  const prepareIssuedRef = useRef(false);
  const warmAbortRef = useRef<AbortController | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 마지막 음성 활동(준비·합성·재생 전이) 시각. RunPod 워커는 마지막 작업 뒤 유휴 120초가
  // 지나면 내려간다(workersMin 0, scale-to-zero) — 사이트 첫 방문 한 번만의 일이 아니다.
  const lastVoiceActivityRef = useRef(0);
  useEffect(() => {
    const s = lifecycleState.status;
    if (s === "VOICE_READY" || s === "VOICE_SYNTHESIZING" || s === "VOICE_SPEAKING") lastVoiceActivityRef.current = Date.now();
  }, [lifecycleState.status]);

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
    // 첫 진입: 기본 켜짐이면 예열만 시작한다(재생 없음). 방문자가 예전에 껐으면 꺼진 채로 둔다.
    if (readVoicePreference(browserStorage())) {
      prepareIssuedRef.current = false;
      dispatchLifecycle({ type: "ENABLE", now: Date.now() });
      queueMicrotask(ensureReady);
    } else {
      voiceEnabledRef.current = false;
      setVoiceEnabled(false);
    }
    return () => {
      recognitionRef.current?.abort();
      warmAbortRef.current?.abort();
      if (pollTimerRef.current !== null) clearTimeout(pollTimerRef.current);
    };
  }, [ensureReady]);

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

  const rewarmIfIdle = useCallback(() => {
    if (!voiceEnabledRef.current || lifecycleRef.current.status !== "VOICE_READY") return;
    if (Date.now() - lastVoiceActivityRef.current < VOICE_REWARM_AFTER_MS) return;
    // 준비 완료로 보였지만 워커는 이미 내려갔을 가능성이 높다. 상태를 "준비 중" 으로 돌리고
    // 예열을 다시 건다 — 콜드 스타트가 "음성 생성 중" 으로 15~20초 멈춰 보이지 않게.
    prepareIssuedRef.current = false;
    dispatchLifecycle({ type: "ENABLE", now: Date.now() });
    lifecycleRef.current = { status: "VOICE_WARMING", warmingSince: Date.now(), failureStage: null };
    queueMicrotask(ensureReady);
  }, [ensureReady]);

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
    persistVoicePreference(browserStorage(), next);
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
    // 음성 실패 뒤 "텍스트로만 계속" 은 이번 방문의 복구다 — 다음 방문의 기본값으로 저장하지 않는다.
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
    rewarmIfIdle,
    beginSynthesis,
    beginSpeaking,
    finishSpeaking,
    reportError,
    startListening,
    stopListening,
  };
}
