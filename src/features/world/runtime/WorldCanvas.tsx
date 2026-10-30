"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import type { Group } from "three";
import { afterHomeSettles } from "@/lib/afterHomeSettles";
import { PredrawStandby } from "./WarmCanvas";
import { useBudgetDpr } from "./pixelBudget";
import { prewarmDressGeometries } from "../adapters/weddingDress";
import { wdModels } from "../adapters/weddingAtelier";
import { concreteTexture } from "../adapters/labGallery";
import { Canvas, useThree } from "@react-three/fiber";
import { ArmiDistrictScene } from "../adapters/ArmiDistrictScene";
import { HangaraeDistrictScene } from "../adapters/HangaraeDistrictScene";
import { WeddingDistrictScene } from "../adapters/WeddingDistrictScene";
import { LabDistrictScene } from "../adapters/LabDistrictScene";
import { WorldCameraController } from "./WorldCameraController";
import { WorldRenderPipeline } from "./WorldRenderPipeline";
import type { WorldRuntime } from "../director/worldRuntime";
import { DefaultLoadingManager } from "three";
import { reportWorldProgress } from "./journeyGeometry";
import { tuneRenderer } from "./shaderGate";

// Real asset progress (GLB, Draco decoder, textures) feeds the Home entry cue.
DefaultLoadingManager.onProgress = (_url, loaded, total) => { if (total > 0) reportWorldProgress(loaded / total); };

function FrameSync({ runtime, onFailure }: { runtime: WorldRuntime; onFailure: () => void }) {
  const { gl, invalidate, size } = useThree();
  useEffect(() => runtime.subscribeFrame(invalidate), [runtime, invalidate]);
  useEffect(() => { invalidate(); }, [size.width, size.height, invalidate]);
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.dataset.worldCanvas = "persistent";
    tuneRenderer(gl);
    canvas.addEventListener("webglcontextlost", onFailure);
    return () => canvas.removeEventListener("webglcontextlost", onFailure);
  }, [gl, onFailure]);
  return null;
}
function District({ runtime, video, districtId }: { runtime: WorldRuntime; video: HTMLVideoElement | null; districtId:string }) {
  const compact = useThree(state => state.size.width <= 700);
  const isArmi = districtId !== "hangarae" && districtId !== "wedding" && districtId !== "experimental-wing";
  // Hangarae waits, hidden and pre-drawn, behind ARMI once Home has settled: the hand-off then only
  // flips visibility on the same instance (it used to freeze ~2.5s on first draw).
  const [standby, setStandby] = useState(false);
  useEffect(() => afterHomeSettles(() => setStandby(true), 6000), []);
  const hangarae = useRef<Group>(null), hgStandby = isArmi && standby;
  // The next district's deterministic geometry and textures build in idle slots while this one plays.
  useEffect(() => {
    if (districtId === "hangarae") prewarmDressGeometries(["input", ...wdModels.map(m => m.id)]);
    if (districtId === "wedding") (window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200)))(() => { concreteTexture(); });
  }, [districtId]);
  return <>
    <WorldCameraController runtime={runtime} compact={compact}/>
    {isArmi && <ArmiDistrictScene runtime={runtime} compact={compact} video={video}/>}
    {(districtId === "hangarae" || hgStandby) && <Suspense fallback={null}>
      <group ref={hangarae} visible={districtId === "hangarae"}><HangaraeDistrictScene runtime={runtime} standby={hgStandby}/></group>
      {hgStandby && <PredrawStandby root={hangarae}/>}
    </Suspense>}
    {districtId === "wedding" && <WeddingDistrictScene runtime={runtime}/>}
    {districtId === "experimental-wing" && <LabDistrictScene runtime={runtime}/>}
    <WorldRenderPipeline runtime={runtime} compact={compact} mounted={districtId}/>
  </>;
}
export default function WorldCanvas({ runtime, video, compact, active, onFailure, districtId="armi" }: {
  runtime: WorldRuntime; video: HTMLVideoElement | null; compact: boolean; active: boolean; onFailure: () => void; districtId?:string;
}) {
  const dpr = useBudgetDpr(1.5);
  return <Canvas camera={{ position: [0, .6, 12], fov: 43, near: .03, far: 180 }} dpr={compact ? Math.min(1, dpr) : dpr}
    frameloop={active ? "always" : "demand"} gl={{ antialias: true, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: !!runtime.armiReview.current }}
    fallback={<span>3D 표시를 사용할 수 없습니다.</span>}>
    <FrameSync runtime={runtime} onFailure={onFailure}/>
    <Suspense fallback={null}><District runtime={runtime} video={video} districtId={districtId}/></Suspense>
  </Canvas>;
}
