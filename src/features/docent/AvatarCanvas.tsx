"use client";

import { Canvas } from "@react-three/fiber";
import { Component, Suspense, useEffect, useState, type ReactNode } from "react";
import { ACESFilmicToneMapping } from "three";
import type { VisemeKey } from "@/lib/docent/visemes";
import type { SemanticMouthPose } from "@/lib/docent/semanticMouth";
import type { DocentEmotion } from "@/types/docent";
import { AvatarFallback } from "./AvatarFallback";
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
  /** 도크 안의 낮은 캔버스. */
  compact?: boolean;
  /** 전역 패널 안에서 채팅 영역을 침범하지 않는 얕은 캔버스. */
  shell?: boolean;
  /** shell 이 오른쪽 사이드 패널 안에 있을 때. */
  sidecar?: boolean;
}

// GLB 파싱 실패 등 Suspense 내부 throw를 흡수한다.
class AvatarErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
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
  compact = false,
  shell = false,
  sidecar = false,
  hologramState = "ready",
}: AvatarCanvasProps) {
  const [webglOk, setWebglOk] = useState<boolean | null>(null);

  useEffect(() => {
    setWebglOk(webglAvailable());
  }, []);

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
      {webglOk === false ? (
        <AvatarFallback emotion={emotion} shell={shell} />
      ) : (
      <AvatarErrorBoundary fallback={<AvatarFallback emotion={emotion} shell={shell} />}>
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
          onCreated={({ gl }) =>
            gl.domElement.addEventListener("webglcontextlost", () =>
              setWebglOk(false)
            )
          }
        >
          <SceneLighting hologram={shell} />
          <Suspense fallback={null}>
            <DocentHead emotion={emotion} viseme={viseme} mouth={mouth} projection={shell} />
            {shell ? (
              <HologramChamber state={hologramState} speechLevel={mouth?.jawOpen ?? (viseme ? 0.3 : 0)} />
            ) : null}
          </Suspense>
        </Canvas>
      </AvatarErrorBoundary>
      )}
    </div>
  );
}
