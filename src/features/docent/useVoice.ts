"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

export interface VoiceState {
  sttSupported: boolean;
  ttsSupported: boolean;
  listening: boolean;
  ttsSpeaking: boolean;
  voiceEnabled: boolean;
  toggleVoice: () => void;
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
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSttSupported(Boolean(getSpeechRecognition()));
    setTtsSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      recognitionRef.current?.abort();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const startListening = useCallback(
    (onTranscript: (text: string) => void) => {
      const Recognition = getSpeechRecognition();
      if (!Recognition || recognitionRef.current) return;

      // 듣는 동안 TTS는 멈춘다 (에코 방지)
      window.speechSynthesis?.cancel();
      setTtsSpeaking(false);

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

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();

    const speakable = toSpeakable(text);
    if (!speakable) return;

    const utterance = new SpeechSynthesisUtterance(speakable);
    const isKorean = /[가-힣]/.test(speakable);
    utterance.lang = isKorean ? "ko-KR" : "en-US";
    const voices = synth.getVoices();
    const preferred = voices.find((v) => v.lang.startsWith(isKorean ? "ko" : "en"));
    if (preferred) utterance.voice = preferred;
    utterance.rate = 1.05;
    utterance.onstart = () => setTtsSpeaking(true);
    utterance.onend = () => setTtsSpeaking(false);
    utterance.onerror = () => setTtsSpeaking(false);

    synth.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setTtsSpeaking(false);
  }, []);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled((prev) => {
      if (prev) window.speechSynthesis?.cancel();
      return !prev;
    });
    setTtsSpeaking(false);
  }, []);

  return {
    sttSupported,
    ttsSupported,
    listening,
    ttsSpeaking,
    voiceEnabled,
    toggleVoice,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
