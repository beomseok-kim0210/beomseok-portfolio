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

export function WorldCameraController({ runtime, compact }: { runtime: WorldRuntime; compact: boolean }) {
  const sample = useMemo(createArmiCameraSample, []);
  const path = useRef<{ asset: NonNullable<WorldRuntime["armiAsset"]["current"]>; sample: ReturnType<typeof createArmiCameraPath> } | null>(null);
  // Apply before district callbacks (priority 0), matching V1's registration order.
  useFrame(({ camera, pointer }) => {
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
