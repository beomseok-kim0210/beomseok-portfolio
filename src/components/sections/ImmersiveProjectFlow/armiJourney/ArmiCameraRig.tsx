"use client";
import { useMemo, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Fog, PerspectiveCamera, Vector3 } from "three";
import { journeyFov, sampleJourney } from "./goldenPaths";
import { ease, entryLocal, interval } from "./experienceData";
import { travelProgress } from "./paths";

export function ArmiCameraRig({ progress, compact }: { progress: RefObject<number>; compact: boolean }) {
  const target = useMemo(() => new Vector3(), []);
  useFrame(({ camera, pointer, scene }) => {
    const t = travelProgress(entryLocal(progress.current));
    sampleJourney(progress.current,compact,camera.position,target);
    // Mobile preserves travel, with a wider entrance view and no banking.
    if (!compact && t < .1) {
      camera.position.x += pointer.x * .12 * (1 - t * 10);
      camera.position.y += pointer.y * .07 * (1 - t * 10);
    }
    const p=progress.current;
    const bank=p<=.32 ? Math.sin(t*Math.PI*2)*.025 : Math.sin(interval(p,.70,.84)*Math.PI*2)*.035;
    camera.up.set(compact ? 0 : bank, 1, 0);
    camera.lookAt(target);
    if(camera instanceof PerspectiveCamera) {
      const far=p<=.32?75:180;
      const fov=journeyFov(p,compact);
      if(camera.fov!==fov||camera.far!==far) { camera.fov=fov;camera.far=far; camera.updateProjectionMatrix(); }
    }
    if(scene.fog instanceof Fog) {
      const open=ease(interval(p,.32,.43))*(1-ease(interval(p,.95,.985)));
      scene.fog.near=12+open*32; scene.fog.far=42+open*108;
    }
  });
  return null;
}
