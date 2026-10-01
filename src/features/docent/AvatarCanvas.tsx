"use client";

import { Canvas } from "@react-three/fiber";
import { Component, Suspense, useCallback, useEffect, useReducer, type ReactNode } from "react";
import { ACESFilmicToneMapping, type WebGLRenderer } from "three";
import type { VisemeKey } from "@/lib/docent/visemes";
import type { SemanticMouthPose } from "@/lib/docent/semanticMouth";
import type { DocentEmotion } from "@/types/docent";
import { AvatarFallback } from "./AvatarFallback";
import { AVATAR_RECOVERY, avatarGlReducer, initialAvatarGlState } from "./avatarRecovery";
import { ACTIVATION_PENDING_COPY, VOICE_ENGINE_WARMING_COPY } from "./docentStatus";
import { DocentHead } from "./DocentHead";
import type { HologramState } from "./hologram/hologramConfig";
import { HologramChamber } from "./hologram/HologramChamber";
import { SceneLighting } from "./hologram/SceneLighting";

interface AvatarCanvasProps {
  /** shell 챔버의 투사 상태. 없으면 안정된 대기 상태. */
  hologramState?: HologramState;
  emotion: DocentEmotion;
  viseme: VisemeKey | null;
  /** LAM-A2E 가 만든 입 자세. 있으면 viseme 라벨보다 우선한다. */
  mouth?: SemanticMouthPose | null;
  /** 발화 중인가(세그먼트 사이 공백 포함). 발화 중에는 감정 모프의 입 기여를 줄인다. */
  speaking?: boolean;
  /** 도크 안의 낮은 캔버스. */
  compact?: boolean;
  /** 전역 패널 안에서 채팅 영역을 침범하지 않는 얕은 캔버스. */
  shell?: boolean;
  /** shell 이 오른쪽 사이드 패널 안에 있을 때. */
  sidecar?: boolean;
  /** 질문이 처리 중이다 — 얼굴이 돌아오는 중이면 "곧 활성화" 안내를 보인다. */
  questionPending?: boolean;
  /**
   * 음성 엔진(워커)이 깨어나는 중. 아바타 자체의 준비(WebGL·GLB)와는 다른 상태다 —
   * 얼굴은 떠 있고 음성만 아직일 수 있다.
   */
  voiceWarming?: boolean;
  /** 3D 얼굴이 떠 있는지(false = 컨텍스트 복원 중이거나 쓸 수 없음). */
  onActiveChange?: (active: boolean) => void;
}

// GLB 파싱 실패 등 Suspense 내부 throw를 흡수한다. 영구 폴백이 아니라 한 번 더
// 새 캔버스로 시도하도록 위로 알린다 — 부모가 key 를 바꾸면 이 경계도 새로 시작한다.
class AvatarErrorBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ?? canvas.getContext("webgl")
    );
  } catch {
    return false;
  }
}

export default function AvatarCanvas({
  emotion,
  viseme,
  mouth = null,
  speaking = false,
  compact = false,
  shell = false,
  sidecar = false,
  hologramState = "ready",
  questionPending = false,
  voiceWarming = false,
  onActiveChange,
}: AvatarCanvasProps) {
  const [gl, dispatch] = useReducer(avatarGlReducer, initialAvatarGlState);

  useEffect(() => {
    dispatch({ type: "PROBED", available: webglAvailable() });
  }, []);

  // 컨텍스트를 잃으면 잠깐 복원을 기다렸다가, 안 오면 새 컨텍스트로 다시 마운트한다.
  useEffect(() => {
    if (gl.status !== "recovering") return;
    const timer = window.setTimeout(() => dispatch({ type: "REMOUNT" }), AVATAR_RECOVERY.restoreWaitMs);
    // 숨은 탭에서는 타이머가 늦어진다 — 다시 보이는 즉시 되살린다.
    const onVisible = () => {
      if (document.visibilityState === "visible") dispatch({ type: "REMOUNT" });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [gl.status, gl.canvasKey]);

  const active = gl.status === "ready" || gl.status === "checking";
  useEffect(() => {
    onActiveChange?.(active);
  }, [active, onActiveChange]);

  const onCreated = useCallback(({ gl: renderer }: { gl: WebGLRenderer }) => {
    const canvas = renderer.domElement;
    // preventDefault 가 있어야 브라우저가 이 컨텍스트를 복원해 준다.
    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      dispatch({ type: "LOST", now: Date.now() });
    });
    canvas.addEventListener("webglcontextrestored", () => dispatch({ type: "RESTORED" }));
    dispatch({ type: "CREATED" });
  }, []);
  const onRenderError = useCallback(() => dispatch({ type: "RENDER_ERROR", now: Date.now() }), []);

  const stageClass = shell && sidecar
    ? // 440px 사이드 패널: 정사각형이면 채팅 자리가 없다. 화면 높이에 따라 늘고 준다.
      "relative w-full shrink-0 overflow-hidden rounded-[22px] border border-sky-200/[0.14] bg-[#050b17] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),inset_0_-36px_80px_rgba(2,8,23,0.78)] h-[clamp(170px,32dvh,320px)]"
    : shell
    ? "relative mx-auto h-[clamp(148px,24dvh,210px)] w-full shrink-0 overflow-hidden rounded-[24px] border border-sky-200/[0.14] bg-[#050b17] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),inset_0_-36px_80px_rgba(2,8,23,0.78)] lg:aspect-square lg:h-auto lg:max-w-[520px] lg:rounded-[30px]"
    : compact
      ? "relative h-[220px] w-full overflow-hidden rounded-[24px] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.15),rgba(11,17,32,0.6))]"
      : "relative h-[42vh] min-h-[300px] w-full overflow-hidden rounded-[32px] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.15),rgba(11,17,32,0.6))] lg:h-[560px]";

  return (
    <div className={stageClass} data-avatar-stage>
      {shell ? (
        /* 순수 2D 배경만 DOM 에 남는다. 후광·원통·받침·호·입자·목 처리는 전부 3D 장면
           (hologram/HologramChamber) 안에 있다 — DOM 층을 얼굴 위에 겹치지 않는다. */
        <div aria-hidden="true" data-chamber-layer="depth" className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_50%_36%,rgba(30,64,175,0.14)_0%,rgba(5,11,23,0)_62%),linear-gradient(180deg,#06111f_0%,#050b17_70%,#03070f_100%)]" />
      ) : null}
      {gl.status === "unavailable" ? (
        <AvatarFallback emotion={emotion} shell={shell} />
      ) : (
      <AvatarErrorBoundary key={gl.canvasKey} onError={onRenderError}>
        <Canvas
          className="relative z-10"
          camera={{ position: [0, 0, 0.7], fov: 30 }}
          dpr={[1, 1.75]}
          gl={{
            antialias: true,
            powerPreference: "high-performance",
            alpha: true,
            preserveDrawingBuffer: true,
            toneMapping: ACESFilmicToneMapping,
            toneMappingExposure: 1.05,
          }}
          onCreated={onCreated}
        >
          <SceneLighting hologram={shell} />
          <Suspense fallback={null}>
            <DocentHead emotion={emotion} viseme={viseme} mouth={mouth} speaking={speaking} projection={shell} />
            {shell ? (
              <HologramChamber state={hologramState} speechLevel={mouth?.jawOpen ?? (viseme ? 0.3 : 0)} voiceWarming={voiceWarming} />
            ) : null}
          </Suspense>
        </Canvas>
      </AvatarErrorBoundary>
      )}
      {voiceWarming && gl.status !== "recovering" ? (
        /* 얼굴은 떠 있고 음성 엔진만 깨어나는 중 — 멈춘 얼굴이 고장처럼 보이지 않게 한 줄로 알린다. */
        <p
          role="status"
          data-voice-warming
          className="pointer-events-none absolute inset-x-0 bottom-2 z-20 text-center text-[11px] tracking-wide text-sky-200/80"
        >
          {VOICE_ENGINE_WARMING_COPY}
        </p>
      ) : null}
      {gl.status === "recovering" ? (
        /* 얼굴이 새 컨텍스트로 돌아오는 짧은 동안. 이모지 대신 조용한 표시, 질문이 들어오면
           곧 활성화된다는 안내를 보인다. */
        <div
          role="status"
          data-avatar-recovering
          className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#050b17]/60"
        >
          <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-sky-300 motion-reduce:animate-none" />
          {questionPending ? (
            <p className="px-6 text-center text-xs leading-5 text-slate-300">{ACTIVATION_PENDING_COPY}</p>
          ) : (
            <span className="sr-only">3D 도슨트를 다시 불러오는 중</span>
          )}
        </div>
      ) : null}
    </div>
  );
}
