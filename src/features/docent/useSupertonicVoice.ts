"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { REST_POSE, type SemanticMouthPose } from "@/lib/docent/semanticMouth";
import { fuseLamMouth } from "@/lib/docent/lamMouthFusion";
import { planSpokenSegments } from "@/lib/docent/ttsSegments";
import { sampleTimeline, type VoiceTimelineFrame } from "@/lib/docent/voiceTimeline";
import { runSegmentQueue } from "./voiceQueue";

/**
 * 도슨트의 유일한 음성 경로: Supertonic 이 만든 파형을 재생하면서, 같은 파형을 LAM 이
 * 읽어 만든 타임라인으로 입을 움직인다.
 *
 * 답변은 세그먼트로 나뉘어 차례로 합성·재생된다(`ttsSegments`, `voiceQueue`).
 * 세그먼트마다 정본 WAV 가 하나고, 그 세그먼트의 재생과 LAM 이 그 WAV 를 본다.
 *
 * 입 자세는 LAM 채널들을 `fuseLamMouth` 로 합친 것이다(입술 닫힘·깔때기 포함, Phase 2).
 *
 * 시계는 지금 재생 중인 세그먼트의 `audio.currentTime` 이다. 글자 수 추정도, setTimeout
 * 도, rAF 카운트도 아니다. rAF 는 매 프레임 그 시계를 읽으러 갈 뿐이라, 오디오가 늦거나
 * 끊기면 얼굴도 같이 늦고 같이 끊긴다 — 그것이 맞는 동작이다.
 *
 * 실패하면 멈춘다. 다른 목소리(브라우저 내장 TTS)로 이어 말하지 않는다 —
 * 텍스트는 이미 화면에 있고, 도슨트의 목소리가 중간에 다른 사람으로 바뀌는 것은
 * 무음보다 나쁘다.
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
  /** 이 메타가 속한 세그먼트와 답변의 세그먼트 수 */
  segmentIndex: number;
  segmentCount: number;
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
 * 발화 시도의 결말. 첫 세그먼트가 재생을 시작하면 `ok` 로 정해진다 — 뒤 세그먼트의
 * 실패는 `error` 상태로 드러난다.
 *
 * `failed` 와 `superseded` 는 구분한다. 교체는 다음 발화가 이미 권위를 가져간 것이라
 * 오류 상태를 켜면 안 된다. `silent` 는 읽을 글자가 없어 아무 요청도 하지 않은 경우다.
 */
export type SpeakOutcome = "ok" | "failed" | "superseded" | "silent";

export interface SupertonicVoiceState {
  /** 현재 프레임의 semantic 입 자세. 발화 중이 아니면 null. */
  mouth: SemanticMouthPose | null;
  /** 첫 세그먼트 재생부터 마지막 세그먼트가 끝날 때까지 참. 세그먼트 사이 공백 포함. */
  speaking: boolean;
  preparing: boolean;
  engine: VoiceEngine;
  meta: SupertonicMeta | null;
  error: string | null;
  speak: (text: string) => Promise<SpeakOutcome>;
  stop: () => void;
  /** 진단용 — 현재 세그먼트의 오디오 재생 위치(초). 재생 중이 아니면 null. */
  currentTime: () => number | null;
}

interface SegmentPayload {
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
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

const aborted = () => new DOMException("speech was cancelled", "AbortError");

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
  // 발화 전체(모든 세그먼트의 합성과 재생)를 끊는 핸들
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
    // 대기 중인 세그먼트 합성과 재생 약속을 함께 끊는다
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

    const fail = (message: string): SpeakOutcome => {
      if (gen !== genRef.current) return "superseded";
      teardown();
      setPreparing(false);
      setSpeaking(false);
      setEngine("failed");
      setMouth(null);
      setError(message);
      return "failed";
    };

    const plan = planSpokenSegments(text);
    if (!plan) return fail("answer is too long for voice");
    const { segments } = plan;
    if (segments.length === 0) {
      setPreparing(false);
      return "silent"; // 읽을 글자가 없다. 실패가 아니다.
    }

    const controller = new AbortController();
    abortRef.current = controller;

    let settleStart: (outcome: SpeakOutcome) => void = () => undefined;
    const started = new Promise<SpeakOutcome>((resolve) => { settleStart = resolve; });

    const fetchSegment = async (index: number, signal: AbortSignal): Promise<SegmentPayload> => {
      const res = await fetch("/api/docent/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: segments[index],
          segment: { index, count: segments.length },
        }),
        signal,
      });
      if (!res.ok) {
        const detail = (await res.json().catch(() => ({}))) as { error?: string; stage?: string };
        const where = detail.stage ? ` (${detail.stage})` : "";
        throw new Error(`${detail.error ?? `HTTP ${res.status}`}${where}`);
      }
      return res.json();
    };

    const playSegment = (
      payload: SegmentPayload,
      index: number,
      signal: AbortSignal,
      started: () => void,
    ) =>
      new Promise<void>((resolve, reject) => {
        if (gen !== genRef.current || signal.aborted) {
          reject(aborted());
          return;
        }
        const url = URL.createObjectURL(base64ToBlob(payload.audio.base64, payload.audio.mimeType));
        const audio = new Audio(url);
        audio.preload = "auto";
        audioRef.current = audio;
        urlRef.current = url;

        // 이 세그먼트의 프레임만 이 세그먼트의 시계로 읽는다
        const frames = payload.timeline.frames;
        const fps = payload.timeline.fps;
        const tick = () => {
          if (gen !== genRef.current) return;
          const a = audioRef.current;
          if (!a || a !== audio) return;
          const raw = sampleTimeline(frames, fps, a.currentTime);
          setMouth(raw ? fuseLamMouth(raw) : REST_POSE);
          frameRef.current = requestAnimationFrame(tick);
        };

        // 다 끝난 세그먼트를 붙들고 있을 이유가 없다. blob URL 만 놓아주면 엘리먼트와
        // 디코딩된 버퍼가 남는다.
        const release = () => {
          signal.removeEventListener("abort", onAbort);
          if (frameRef.current !== null) {
            cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
          }
          audio.onended = null;
          audio.onerror = null;
          audio.removeAttribute("src");
          audio.load();
          if (audioRef.current === audio) audioRef.current = null;
          URL.revokeObjectURL(url);
          if (urlRef.current === url) urlRef.current = null;
        };
        const onAbort = () => {
          release();
          reject(aborted());
        };
        signal.addEventListener("abort", onAbort, { once: true });

        audio.onended = () => {
          release();
          // 다음 세그먼트가 준비되기 전까지 옛 세그먼트의 마지막 프레임을 붙들지 않는다
          if (gen === genRef.current) setMouth(null); // 끝나면 중립
          resolve();
        };
        audio.onerror = () => {
          release();
          reject(new Error("audio playback failed"));
        };

        audio.play().then(() => {
          if (gen !== genRef.current) return;
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
            segmentIndex: index,
            segmentCount: segments.length,
            coldStart: payload.diagnostics.coldStart,
            synthesisMs: payload.diagnostics.synthesisMs,
            inferenceMs: payload.diagnostics.inferenceMs,
            totalPrepMs: payload.diagnostics.totalPrepMs,
            ttsRtf: payload.diagnostics.ttsRtf,
            lamRtf: payload.diagnostics.lamRtf,
            jawOpenMax: payload.diagnostics.jawOpenMax,
            framesAboveThreshold: payload.diagnostics.framesAboveThreshold,
          });
          frameRef.current = requestAnimationFrame(tick);
          settleStart("ok");
          started(); // 소리가 나기 시작했다 — 이제 다음 세그먼트를 합성해도 된다
        }, (err: unknown) => {
          release();
          reject(err instanceof Error ? err : new Error("playback was blocked"));
        });
      });

    void runSegmentQueue({
      count: segments.length,
      signal: controller.signal,
      fetchSegment,
      playSegment,
    }).then((outcome) => {
      if (gen !== genRef.current || outcome.status === "cancelled") {
        settleStart("superseded"); // 이미 다음 발화가 시작됐거나 멈춰졌다
        return;
      }
      if (outcome.status === "failed") {
        const reason = outcome.error instanceof Error ? outcome.error.message : String(outcome.error);
        settleStart(fail(`segment ${outcome.index + 1}/${segments.length}: ${reason}`));
        return;
      }
      if (abortRef.current === controller) abortRef.current = null;
      setSpeaking(false);
      setPreparing(false);
      setMouth(null); // 끝나면 중립
      settleStart("ok");
    });

    return started;
  }, [teardown]);

  const currentTime = useCallback(
    () => (audioRef.current ? audioRef.current.currentTime : null),
    [],
  );

  return { mouth, speaking, preparing, engine, meta, error, speak, stop, currentTime };
}
