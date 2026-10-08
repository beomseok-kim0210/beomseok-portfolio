"use client";
import { Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { AdaptiveDpr } from "@react-three/drei";
import { ArmiDistrictScene } from "../adapters/ArmiDistrictScene";
import { WorldCameraController } from "./WorldCameraController";
import { WorldRenderPipeline } from "./WorldRenderPipeline";
import type { WorldRuntime } from "../director/worldRuntime";

function FrameSync({ runtime, onFailure }: { runtime: WorldRuntime; onFailure: () => void }) {
  const { gl, invalidate, size } = useThree();
  useEffect(() => runtime.subscribeFrame(invalidate), [runtime, invalidate]);
  useEffect(() => { invalidate(); }, [size.width, size.height, invalidate]);
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.dataset.worldCanvas = "persistent";
    canvas.addEventListener("webglcontextlost", onFailure);
    return () => canvas.removeEventListener("webglcontextlost", onFailure);
  }, [gl, onFailure]);
  return null;
}
function District({ runtime, video }: { runtime: WorldRuntime; video: HTMLVideoElement | null }) {
  const compact = useThree(state => state.size.width <= 700);
  return <>
    <WorldCameraController runtime={runtime} compact={compact}/>
    <ArmiDistrictScene progress={runtime.progress} compact={compact} video={video}/>
    <WorldRenderPipeline runtime={runtime} compact={compact}/>
    <AdaptiveDpr pixelated/>
  </>;
}
export default function WorldCanvas({ runtime, video, compact, active, onFailure }: {
  runtime: WorldRuntime; video: HTMLVideoElement | null; compact: boolean; active: boolean; onFailure: () => void;
}) {
  return <Canvas camera={{ position: [0, .6, 12], fov: 43, near: .03, far: 180 }} dpr={compact ? 1 : [1, 1.5]}
    frameloop={active ? "always" : "demand"} gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
    fallback={<span>3D 표시를 사용할 수 없습니다.</span>}>
    <FrameSync runtime={runtime} onFailure={onFailure}/>
    <Suspense fallback={null}><District runtime={runtime} video={video}/></Suspense>
  </Canvas>;
}
