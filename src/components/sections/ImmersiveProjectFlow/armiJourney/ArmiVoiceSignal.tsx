"use client";
import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, InstancedMesh, Object3D, Vector3 } from "three";
import { ease, interval } from "./experienceData";


export function ArmiVoiceSignal({ progress }: { progress: RefObject<number> }) {
  const waveform = useRef<InstancedMesh>(null);
  const packet = useRef<Group>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const offset = useMemo(() => new Vector3(), []);
  useFrame(({camera, size}) => {
    const p = progress.current;
    const compact = size.width < 700;
    const peripheralX = compact ? .1 : .25;
    const gather = ease(interval(p, .24, .42));

    if (waveform.current) {
      waveform.current.visible = p > .12 && p < .43;
      for (let i = 0; i < 36; i++) {
        const x = (i - 17.5) * (compact ? .008 : .017);
        // Composed illustrative waveform, not microphone capture or measured audio.
        const height = .07 + Math.abs(Math.sin(i * 1.73) * Math.cos(i * .37)) * .72;
        dummy.position.set(peripheralX + x * (1 - gather), -.25, -1.4).applyMatrix4(camera.matrixWorld);
        dummy.quaternion.copy(camera.quaternion);
        dummy.scale.set(.009 + gather * .004, height * .15 * (1 - gather) + .018, .012);
        dummy.updateMatrix(); waveform.current.setMatrixAt(i, dummy.matrix);
      }
      waveform.current.instanceMatrix.needsUpdate = true;
    }
    if (packet.current) {
      packet.current.visible = p >= .32;
      offset.set(peripheralX,-.25,-1.4).applyMatrix4(camera.matrixWorld);
      packet.current.position.copy(offset);
      packet.current.quaternion.copy(camera.quaternion);
      packet.current.scale.setScalar(.45 + gather * .55);
    }


  });
  return <>
    <instancedMesh ref={waveform} args={[undefined, undefined, 36]} frustumCulled={false}><boxGeometry args={[1, 1, 1]}/><meshBasicMaterial color="#d2f059" toneMapped={false}/></instancedMesh>
    <group ref={packet}>
      <mesh><boxGeometry args={[.04, .04, .09]}/><meshBasicMaterial color="#e0ff79" toneMapped={false}/></mesh>
      <mesh position={[0, 0, .13]}><boxGeometry args={[.027, .027, .2]}/><meshBasicMaterial color="#b2d044" transparent opacity={.55} toneMapped={false}/></mesh>
    </group>

  </>;
}
