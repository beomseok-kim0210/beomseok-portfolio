"use client";

import { Canvas } from "@react-three/fiber";
import { Component, Suspense, useEffect, useState, type ReactNode } from "react";
import { ACESFilmicToneMapping } from "three";
import type { VisemeKey } from "@/lib/docent/visemes";
import type { SemanticMouthPose } from "@/lib/docent/semanticMouth";
import type { DocentEmotion } from "@/types/docent";
import { AvatarFallback } from "./AvatarFallback";
import { DocentHead } from "./DocentHead";

interface AvatarCanvasProps {
  emotion: DocentEmotion;
  viseme: VisemeKey | null;
  /** LAM-A2E 가 만든 입 자세. 있으면 viseme 라벨보다 우선한다. */
  mouth?: SemanticMouthPose | null;
  /** 도크 안의 낮은 캔버스. */
  compact?: boolean;
  /** 전역 패널 안에서 채팅 영역을 침범하지 않는 얕은 캔버스. */
  shell?: boolean;
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

export default function AvatarCanvas({ emotion, viseme, mouth = null, compact = false, shell = false }: AvatarCanvasProps) {
  const [webglOk, setWebglOk] = useState<boolean | null>(null);

  useEffect(() => {
    setWebglOk(webglAvailable());
  }, []);

  const stageClass = shell
    ? "relative h-[136px] w-full shrink-0 overflow-hidden rounded-[22px] border border-blue-300/10 bg-[radial-gradient(ellipse_at_50%_42%,rgba(59,130,246,0.25),rgba(11,17,32,0.72)_62%,rgba(5,10,22,0.96))] sm:h-[204px]"
    : compact
      ? "relative h-[220px] w-full overflow-hidden rounded-[24px] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.15),rgba(11,17,32,0.6))]"
      : "relative h-[42vh] min-h-[300px] w-full overflow-hidden rounded-[32px] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.15),rgba(11,17,32,0.6))] lg:h-[560px]";

  return (
    <div className={stageClass} data-avatar-stage>
      {shell ? (
        <>
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-[18%] top-[6%] z-0 aspect-square rounded-full border border-blue-300/20 shadow-[0_0_32px_rgba(59,130,246,0.12)] motion-safe:animate-[spin_20s_linear_infinite]" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-[27%] top-[18%] z-0 aspect-square rounded-full border border-dashed border-cyan-200/15" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-[18%] bottom-[6%] z-0 h-[14%] rounded-[50%] border border-blue-300/30 bg-blue-400/10 shadow-[0_0_28px_rgba(59,130,246,0.2)]" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 opacity-[0.12] [background-image:linear-gradient(rgba(125,211,252,0.2)_1px,transparent_1px)] [background-size:100%_8px]" />
        </>
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
            toneMapping: ACESFilmicToneMapping,
            toneMappingExposure: 1.05,
          }}
          onCreated={({ gl }) =>
            gl.domElement.addEventListener("webglcontextlost", () =>
              setWebglOk(false)
            )
          }
        >
          {/* 얼굴 정면 키라이트(따뜻)·필라이트(차가움)·림라이트로 입체감 */}
          <ambientLight intensity={0.55} />
          <directionalLight position={[1.5, 2.2, 4]} intensity={1.5} color="#fff2e6" />
          <directionalLight position={[-3, 0.5, 2]} intensity={0.45} color="#9fb8e0" />
          <directionalLight position={[0, 1.5, -3]} intensity={0.35} color="#ffffff" />
          <Suspense fallback={null}>
            <DocentHead emotion={emotion} viseme={viseme} mouth={mouth} />
          </Suspense>
        </Canvas>
      </AvatarErrorBoundary>
      )}
      {shell ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[22%] bg-gradient-to-t from-[#07101f] via-[#0b1830]/70 to-transparent" />
      ) : null}
    </div>
  );
}
