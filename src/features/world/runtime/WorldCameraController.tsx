"use client";
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "three";
import { createArmiCameraSample, sampleArmiCamera } from "../adapters/armiRuntime";
import type { WorldRuntime } from "../director/worldRuntime";

export function WorldCameraController({ runtime, compact }: { runtime: WorldRuntime; compact: boolean }) {
  const sample = useMemo(createArmiCameraSample, []);
  // Apply before district callbacks (priority 0), matching V1's registration order.
  useFrame(({ camera, pointer }) => {
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
