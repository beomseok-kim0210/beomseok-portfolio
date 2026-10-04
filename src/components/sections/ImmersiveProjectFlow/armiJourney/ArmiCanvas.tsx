"use client";
import { Suspense, useEffect, type RefObject } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { AdaptiveDpr } from "@react-three/drei";
import { ArmiCameraRig } from "./ArmiCameraRig";
import { ArmiTabletPortal } from "./ArmiTabletPortal";
import { ArmiVoiceSignal } from "./ArmiVoiceSignal";
import { ArmiEnvironment } from "./ArmiEnvironment";

function ContextGuard({onFailure}: {onFailure: () => void}) {
  const gl = useThree(state => state.gl);
  useEffect(() => {
    const element = gl.domElement;
    element.addEventListener("webglcontextlost", onFailure);
    return () => element.removeEventListener("webglcontextlost", onFailure);
  }, [gl, onFailure]);
  return null;
}

export default function ArmiCanvas({ progress, video, compact, active, onFailure }: { progress: RefObject<number>; video: HTMLVideoElement | null; compact: boolean; active: boolean; onFailure: () => void }) {
  return <Canvas camera={{ position: [0, .6, 12], fov: 43, near: .03, far: 75 }} dpr={compact ? 1 : [1, 1.5]} frameloop={active ? "always" : "never"} gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
    fallback={<span>3D 표시를 사용할 수 없습니다.</span>}>
    <ContextGuard onFailure={onFailure}/>
    <Suspense fallback={null}>
      <ArmiCameraRig progress={progress} compact={compact}/>
      <ArmiEnvironment compact={compact}/>
      <ArmiTabletPortal progress={progress} video={video}/>
      <ArmiVoiceSignal progress={progress}/>
      <AdaptiveDpr pixelated/>
    </Suspense>
  </Canvas>;
}
