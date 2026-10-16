"use client";
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "three";
import { createArmiCameraSample, sampleArmiCamera } from "../adapters/armiRuntime";
import type { WorldRuntime } from "../director/worldRuntime";
import { applyArmiReferenceCamera } from "../adapters/armiV015";
import { createArmiCameraPath } from "../adapters/armiChoreography";
import { useRef } from "react";
import { sampleHangaraeCamera } from "../adapters/hangaraeAnimatic";
import { sampleWeddingCamera } from "../adapters/weddingAtelier";
import { docentOverlayPx } from "@/features/docent/docentOverlay";
import type { Camera } from "three";

/** The canvas spans under the floating docent; shift the projection so the shot centres on the visible stage. */
function centreOnStage(camera: Camera, width: number, height: number) {
  if (!(camera instanceof PerspectiveCamera)) return;
  const shift = docentOverlayPx() / 2;
  // clearViewOffset() only flips `enabled` and keeps the old offsetX, so re-docking must check `enabled` too.
  if (shift > 0 && width > shift * 2) { if (!camera.view?.enabled || camera.view.offsetX !== shift || camera.view.fullWidth !== width || camera.view.fullHeight !== height) camera.setViewOffset(width, height, shift, 0, width, height); }
  else if (camera.view?.enabled) camera.clearViewOffset();
}

export function WorldCameraController({ runtime, compact }: { runtime: WorldRuntime; compact: boolean }) {
  const sample = useMemo(createArmiCameraSample, []);
  const path = useRef<{ asset: NonNullable<WorldRuntime["armiAsset"]["current"]>; sample: ReturnType<typeof createArmiCameraPath> } | null>(null);
  // Apply before district callbacks (priority 0), matching V1's registration order.
  useFrame(({ camera, pointer, size }) => {
    centreOnStage(camera, size.width, size.height);
    if (runtime.state.current.districtId === "wedding") {
      sampleWeddingCamera(runtime.weddingProgress.current, compact, sample);
      camera.position.copy(sample.position); camera.up.copy(sample.up); camera.lookAt(sample.target);
      if (camera instanceof PerspectiveCamera) { camera.fov = sample.fov; camera.far = sample.far; camera.updateProjectionMatrix(); }
      return;
    }
    if (runtime.state.current.districtId === "hangarae") {
      sampleHangaraeCamera(runtime.hangaraeProgress.current,compact,false,sample);
      camera.position.copy(sample.position);camera.up.copy(sample.up);camera.lookAt(sample.target);
      if(camera instanceof PerspectiveCamera){camera.fov=sample.fov;camera.far=sample.far;camera.updateProjectionMatrix();}
      return;
    }
    const asset = runtime.armiAsset.current;
    if (asset && camera instanceof PerspectiveCamera) {
      if (runtime.armiReview.current) applyArmiReferenceCamera(asset, camera, runtime.armiReview.current);
      else {
        if (path.current?.asset !== asset) path.current = { asset, sample: createArmiCameraPath(asset) };
        path.current.sample.sample(runtime.progress.current, camera);
      }
      return;
    }
    sampleArmiCamera(runtime.progress.current, compact, pointer, sample);
    camera.position.copy(sample.position);
    camera.up.copy(sample.up);
    camera.lookAt(sample.target);
    if (camera instanceof PerspectiveCamera && (camera.fov !== sample.fov || camera.far !== sample.far)) {
      camera.fov = sample.fov; camera.far = sample.far; camera.updateProjectionMatrix();
    }
  }, -1);
  return null;
}
