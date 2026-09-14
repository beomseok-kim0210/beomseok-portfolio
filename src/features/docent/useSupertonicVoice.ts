"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  REST_POSE,
  applySemanticMouthCalibration,
  type SemanticMouthPose,
} from "@/lib/docent/semanticMouth";
import { sampleTimeline, type VoiceTimelineFrame } from "@/lib/docent/voiceTimeline";

/**
 * 주 음성 경로: Supertonic 이 만든 파형을 재생하면서, 같은 파형을 LAM 이 읽어
 * 만든 타임라인으로 입을 움직인다.
 *
 * 시계는 `audio.currentTime` 이다. 글자 수 추정도, setTimeout 도, rAF 카운트도
 * 아니다. rAF 는 매 프레임 그 시계를 읽으러 갈 뿐이라, 오디오가 늦거나 끊기면
 * 얼굴도 같이 늦고 같이 끊긴다 — 그것이 맞는 동작이다.
 */

export type { VoiceTimelineFrame };

export interface SupertonicMeta {
  utteranceId: string;
  voiceStyle: string;
  audioSha256: string;
  audioBytes: number;
  audioDurationSeconds: number;
  sampleRate: number;
  timelineFps: number;
  timelineFrameCount: number;
  timelineDurationSeconds: number;
  sameSource: boolean;
  synthesisCount: number;
  preprocessing: string;
  provider: string;
  // 아래 값들은 공급자에 따라 없을 수 있다. RunPod 경로는 모든 지표를 되돌려주지
  // 않으므로, 측정되지 않은 것은 null 로 온다 — 0 은 "없음" 의 표현이 아니다.
  synthesisMs: number | null;
  inferenceMs: number | null;
  totalPrepMs: number | null;
  ttsRtf: number | null;
  lamRtf: number | null;
  jawOpenMax: number | null;
  framesAboveThreshold: number | null;
  coldStart: boolean | null;
}

export type VoiceEngine = "idle" | "supertonic" | "failed";

/**
 * 발화 시도의 결말.
 *
 * `failed` 와 `superseded` 를 반드시 구분해야 한다. 둘 다 "재생하지 못했다" 이지만
 * 대응이 정반대다 — 실패했으면 폴백으로 말해야 하고, 교체됐으면 이미 다음 발화가
 * 말하고 있으니 아무것도 하면 안 된다. 하나로 뭉뚱그리면 두 목소리가 겹친다.
 */
export type SpeakOutcome = "ok" | "failed" | "superseded";

export interface SupertonicVoiceState {
  /** 현재 프레임의 semantic 입 자세. 발화 중이 아니면 null. */
  mouth: SemanticMouthPose | null;
  speaking: boolean;
  preparing: boolean;
  engine: VoiceEngine;
  meta: SupertonicMeta | null;
  error: string | null;
  /** `failed` 일 때만 폴백을 쓴다. `superseded` 는 다음 발화가 이미 권위를 가져간 것이다. */
  speak: (text: string) => Promise<SpeakOutcome>;
  stop: () => void;
  /** 진단용 — 현재 오디오 재생 위치(초). 재생 중이 아니면 null. */
  currentTime: () => number | null;
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

export function useSupertonicVoice(): SupertonicVoiceState {
  const [mouth, setMouth] = useState<SemanticMouthPose | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [engine, setEngine] = useState<VoiceEngine>("idle");
  const [meta, setMeta] = useState<SupertonicMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 발화 세대. 새 발화가 시작되면 앞 세대의 콜백은 전부 무효가 된다.
  const genRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const frameRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const teardown = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const stop = useCallback(() => {
    genRef.current += 1; // 진행 중인 모든 것을 무효화
    teardown();
    setSpeaking(false);
    setPreparing(false);
    setMouth(null); // 입은 중립으로 돌아간다
  }, [teardown]);

  useEffect(() => () => {
    genRef.current += 1;
    teardown();
  }, [teardown]);

  const speak = useCallback(async (text: string): Promise<SpeakOutcome> => {
    const gen = ++genRef.current;
    teardown();
    setError(null);
    setMouth(null);
    setSpeaking(false);
    setPreparing(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let payload: {
      utteranceId: string;
      voiceStyle: string;
      audio: { base64: string; mimeType: string; bytes: number; sampleRate: number;
               durationSeconds: number; sha256: string };
      timeline: { fps: number; frameCount: number; durationSeconds: number;
                  frames: VoiceTimelineFrame[] };
      provider?: string;
      identity: { sameSource: boolean; synthesisCount: number; preprocessing: string };
      diagnostics: { synthesisMs: number | null; inferenceMs: number | null;
                     totalPrepMs: number | null; ttsRtf: number | null;
                     lamRtf: number | null; jawOpenMax: number | null;
                     framesAboveThreshold: number | null; coldStart: boolean | null };
    };
    try {
      const res = await fetch("/api/docent/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const detail = (await res.json().catch(() => ({}))) as { error?: string; stage?: string };
        const where = detail.stage ? ` (${detail.stage})` : "";
        throw new Error(`${detail.error ?? `HTTP ${res.status}`}${where}`);
      }
      payload = await res.json();
    } catch (err) {
      if (gen !== genRef.current) return "superseded"; // 이미 다음 발화가 시작됐다
      setPreparing(false);
      setEngine("failed");
      setMouth(null);
      setError(err instanceof Error ? err.message : String(err));
      return "failed";
    }
    if (gen !== genRef.current) return "superseded";

    const blob = base64ToBlob(payload.audio.base64, payload.audio.mimeType);
    const url = URL.createObjectURL(blob);
    urlRef.current = url;
    const audio = new Audio(url);
    audio.preload = "auto";
    audioRef.current = audio;

    const frames = payload.timeline.frames;
    const fps = payload.timeline.fps;

    const tick = () => {
      if (gen !== genRef.current) return;
      const a = audioRef.current;
      if (!a) return;
      const raw = sampleTimeline(frames, fps, a.currentTime);
      setMouth(raw ? applySemanticMouthCalibration(raw) : REST_POSE);
      frameRef.current = requestAnimationFrame(tick);
    };

    const finish = () => {
      if (gen !== genRef.current) return;
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      setSpeaking(false);
      setMouth(null); // 끝나면 중립
      // 다 끝난 오디오를 붙들고 있을 이유가 없다. blob URL 만 놓아주면 엘리먼트와
      // 디코딩된 버퍼가 남는다.
      const done = audioRef.current;
      if (done) {
        done.onended = null;
        done.onerror = null;
        done.removeAttribute("src");
        done.load();
        audioRef.current = null;
      }
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
    audio.onended = finish;
    audio.onerror = () => {
      if (gen !== genRef.current) return;
      setError("audio playback failed");
      setEngine("failed");
      finish();
    };

    try {
      await audio.play();
    } catch (err) {
      if (gen !== genRef.current) return "superseded";
      setPreparing(false);
      setEngine("failed");
      setError(err instanceof Error ? err.message : "playback was blocked");
      teardown();
      setMouth(null);
      return "failed";
    }
    if (gen !== genRef.current) return "superseded";

    setPreparing(false);
    setSpeaking(true);
    setEngine("supertonic");
    setMeta({
      utteranceId: payload.utteranceId,
      voiceStyle: payload.voiceStyle,
      audioSha256: payload.audio.sha256,
      audioBytes: payload.audio.bytes,
      audioDurationSeconds: payload.audio.durationSeconds,
      sampleRate: payload.audio.sampleRate,
      timelineFps: fps,
      timelineFrameCount: payload.timeline.frameCount,
      timelineDurationSeconds: payload.timeline.durationSeconds,
      sameSource: payload.identity.sameSource,
      synthesisCount: payload.identity.synthesisCount,
      preprocessing: payload.identity.preprocessing,
      provider: payload.provider ?? "unknown",
      coldStart: payload.diagnostics.coldStart,
      synthesisMs: payload.diagnostics.synthesisMs,
      inferenceMs: payload.diagnostics.inferenceMs,
      totalPrepMs: payload.diagnostics.totalPrepMs,
      ttsRtf: payload.diagnostics.ttsRtf,
      lamRtf: payload.diagnostics.lamRtf,
      jawOpenMax: payload.diagnostics.jawOpenMax,
      framesAboveThreshold: payload.diagnostics.framesAboveThreshold,
    });
    // 재생이 시작됐으면 준비 단계의 취소 핸들은 더 이상 붙들 이유가 없다
    abortRef.current = null;
    frameRef.current = requestAnimationFrame(tick);
    return "ok";
  }, [teardown]);

  const currentTime = useCallback(
    () => (audioRef.current ? audioRef.current.currentTime : null),
    [],
  );

  return { mouth, speaking, preparing, engine, meta, error, speak, stop, currentTime };
}
