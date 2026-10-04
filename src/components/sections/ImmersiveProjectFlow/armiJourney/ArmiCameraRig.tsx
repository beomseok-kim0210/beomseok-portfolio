"use client";
import { useMemo, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import { cameraPath, lookPath, travelProgress } from "./paths";

export function ArmiCameraRig({ progress, compact }: { progress: RefObject<number>; compact: boolean }) {
  const target = useMemo(() => new Vector3(), []);
  useFrame(({ camera, pointer }) => {
    const t = travelProgress(progress.current);
    cameraPath.getPointAt(t, camera.position);
    lookPath.getPointAt(t, target);
    // Mobile preserves travel, with a wider entrance view and no banking.
    if (compact) {
      camera.position.z += (1 - t) * 12;
      target.x += (1 - t) * .8;
    }
    else if (t < .1) {
      camera.position.x += pointer.x * .12 * (1 - t * 10);
      camera.position.y += pointer.y * .07 * (1 - t * 10);
    }
    camera.up.set(Math.sin(t * Math.PI * 2) * (compact ? 0 : .025), 1, 0);
    camera.lookAt(target);
  });
  return null;
}
