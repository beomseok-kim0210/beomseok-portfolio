"use client";
import { Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ArmiDistrictScene } from "../adapters/ArmiDistrictScene";
import { HangaraeDistrictScene } from "../adapters/HangaraeDistrictScene";
import { WeddingDistrictScene } from "../adapters/WeddingDistrictScene";
import { WorldCameraController } from "./WorldCameraController";
import { WorldRenderPipeline } from "./WorldRenderPipeline";
import type { WorldRuntime } from "../director/worldRuntime";
import { DefaultLoadingManager } from "three";
import { reportWorldProgress } from "./journeyGeometry";

// Real asset progress (GLB, Draco decoder, textures) feeds the Home entry cue.
DefaultLoadingManager.onProgress = (_url, loaded, total) => { if (total > 0) reportWorldProgress(loaded / total); };

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
function District({ runtime, video, districtId }: { runtime: WorldRuntime; video: HTMLVideoElement | null; districtId:string }) {
  const compact = useThree(state => state.size.width <= 700);
  return <>
    <WorldCameraController runtime={runtime} compact={compact}/>
    {districtId === "hangarae" ? <HangaraeDistrictScene runtime={runtime}/> : districtId === "wedding" ? <WeddingDistrictScene runtime={runtime}/> : <ArmiDistrictScene runtime={runtime} compact={compact} video={video}/>}
    <WorldRenderPipeline runtime={runtime} compact={compact}/>
  </>;
}
export default function WorldCanvas({ runtime, video, compact, active, onFailure, districtId="armi" }: {
  runtime: WorldRuntime; video: HTMLVideoElement | null; compact: boolean; active: boolean; onFailure: () => void; districtId?:string;
}) {
  return <Canvas camera={{ position: [0, .6, 12], fov: 43, near: .03, far: 180 }} dpr={compact ? 1 : [1, 1.5]}
    frameloop={active ? "always" : "demand"} gl={{ antialias: true, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: !!runtime.armiReview.current }}
    fallback={<span>3D 표시를 사용할 수 없습니다.</span>}>
    <FrameSync runtime={runtime} onFailure={onFailure}/>
    <Suspense fallback={null}><District runtime={runtime} video={video} districtId={districtId}/></Suspense>
  </Canvas>;
}
