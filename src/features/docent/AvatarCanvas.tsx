"use client";

import { Canvas } from "@react-three/fiber";
import { Component, Suspense, useEffect, useState, type ReactNode } from "react";
import type { DocentEmotion } from "@/types/docent";
import { AvatarFallback } from "./AvatarFallback";
import { DocentHead } from "./DocentHead";

interface AvatarCanvasProps {
  emotion: DocentEmotion;
  speaking: boolean;
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

export default function AvatarCanvas({ emotion, speaking }: AvatarCanvasProps) {
  const [webglOk, setWebglOk] = useState<boolean | null>(null);

  useEffect(() => {
    setWebglOk(webglAvailable());
  }, []);

  if (webglOk === false) return <AvatarFallback emotion={emotion} />;

  return (
    <div className="relative h-[42vh] min-h-[300px] w-full overflow-hidden rounded-[32px] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.15),rgba(11,17,32,0.6))] lg:h-[560px]">
      <AvatarErrorBoundary fallback={<AvatarFallback emotion={emotion} />}>
        <Canvas
          camera={{ position: [0, 0.05, 0.62], fov: 30 }}
          dpr={[1, 1.75]}
          gl={{ antialias: true, powerPreference: "high-performance", alpha: true }}
          onCreated={({ gl }) =>
            gl.domElement.addEventListener("webglcontextlost", () =>
              setWebglOk(false)
            )
          }
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[2, 3, 4]} intensity={1.6} />
          <directionalLight position={[-3, 1, 2]} intensity={0.4} color="#8fb8ff" />
          <Suspense fallback={null}>
            <DocentHead emotion={emotion} speaking={speaking} />
          </Suspense>
        </Canvas>
      </AvatarErrorBoundary>
    </div>
  );
}
