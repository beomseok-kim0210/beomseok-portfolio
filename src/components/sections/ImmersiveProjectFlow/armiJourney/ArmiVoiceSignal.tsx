"use client";
import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Group, InstancedMesh, MeshBasicMaterial, Object3D, Vector3 } from "three";
import { ease, entryLocal, interval } from "./experienceData";
import { compressWorld, sampleSignal } from "./goldenPaths";
const responseLengths=[1,.82,.94,.68,.87,.55];


export function ArmiVoiceSignal({ progress }: { progress: RefObject<number> }) {
  const waveform = useRef<InstancedMesh>(null);
  const packet = useRef<Group>(null);
  const inner = useRef<MeshBasicMaterial>(null);
  const bands = useRef<MeshBasicMaterial>(null);
  const core = useRef<MeshBasicMaterial>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const offset = useMemo(() => new Vector3(), []);
  const transformed = useMemo(() => new Vector3(), []);
  const tint=useMemo(()=>new Color(),[]);
  const lime=useMemo(()=>new Color("#cfe965"),[]);
  useFrame(({camera, size}) => {
    const master = progress.current;
    const p = entryLocal(master);
    const compact = size.width < 700;
    const peripheralX = compact ? .1 : .25;
    const peripheralY = -.25 + (compact ? .22 : .20)*ease(interval(master,.32,.35));
    const gather = ease(interval(p, .24, .42));

    if(master>.32) {
      sampleSignal(master,offset,compact);
      const transform=ease(interval(master,.35,.43));
      const response=ease(interval(master,.84,.88))*(1-ease(interval(master,.90,.92)));
      const completed=ease(interval(master,.84,.89));
      if(packet.current) {
        packet.current.visible=true;
        packet.current.position.copy(offset);
        packet.current.quaternion.copy(camera.quaternion);
        packet.current.scale.setScalar((.65*(1-ease(interval(master,.32,.345)))+12*ease(interval(master,.415,.445)))*(1-response)+response);
      }
      if(inner.current) inner.current.opacity=completed;
      if(core.current) core.current.color.set(completed>.5?"#eee7d5":transform>.8?"#d5ed70":"#c7d9d7");
      if(waveform.current) {
        waveform.current.visible=master<.985;
        if(bands.current) bands.current.color.set("#ffffff");
        for(let i=0;i<36;i++) {
          const raw=(i-17.5)*.12;
          const ordered=(i%6-2.5)*.14;
          const length=responseLengths[Math.floor(i/6)];
          const expanded=(i%6-2.5)*.5*length-(1-length)*.9;
          const row=Math.floor(i/6);
          const x=(raw*(1-transform)+ordered*transform)*(1-response)+expanded*response;
          const y=(row-2.5)*(.1*transform+.62*response);
          dummy.position.set(x,y,-(row%3)*.3*response).applyQuaternion(camera.quaternion).add(offset);
          dummy.quaternion.copy(camera.quaternion);
          const height=.1+Math.abs(Math.sin(i*1.73)*Math.cos(i*.37))*1.4;
          dummy.scale.set(.055*(1-response)+(.35+(i%3)*.09)*response,height*(1-transform)+.04*transform+.065*response,.045);
          if(master<.43) {
            const lane=ease(interval(master,.345+i*.0014,.365+i*.0014));
            transformed.copy(dummy.position);
            dummy.position.set((-1.5+(i-17.5)*.1)*(1-lane)+(8+(i%6-2.5)*.16)*lane,2.4+(Math.floor(i/6)-2.5)*.14*lane,-16.5+lane*2);
            if(compact) compressWorld(master,dummy.position);
            dummy.position.lerp(transformed,ease(interval(master,.405,.43)));
            const unfold=ease(interval(master,.32,.35));
            dummy.position.lerp(offset,1-unfold);
            dummy.scale.set(.055,height*(1-lane)+.04*lane,.045);
            dummy.scale.multiplyScalar(.15+unfold*.85);
            tint.set("#d4dfdd").lerp(lime,lane);
          } else {
            tint.set(completed>.5?"#eee7d5":"#cfe965").multiplyScalar(1+response*1.6);
          }
          waveform.current.setColorAt(i,tint);
          dummy.scale.multiplyScalar(1-ease(interval(master,.98,.985)));
          dummy.updateMatrix();waveform.current.setMatrixAt(i,dummy.matrix);
        }
        waveform.current.instanceMatrix.needsUpdate=true;
        if(waveform.current.instanceColor) waveform.current.instanceColor.needsUpdate=true;
      }
      return;
    }
    if(core.current) core.current.color.set("#e0ff79");
    if(bands.current) bands.current.color.set("#d2f059");
    if(waveform.current?.instanceColor) { for(let i=0;i<36;i++) waveform.current.setColorAt(i,tint.set("#ffffff")); waveform.current.instanceColor.needsUpdate=true; }

    if (waveform.current) {
      const stt = interval(master,.345,.415);
      waveform.current.visible = (p > .12 && p < .43) || (master > .345 && master < .415);
      for (let i = 0; i < 36; i++) {
        const x = (i - 17.5) * (compact ? .008 : .017);
        // Composed illustrative waveform, not microphone capture or measured audio.
        const height = .07 + Math.abs(Math.sin(i * 1.73) * Math.cos(i * .37)) * .72;
        const spread = master > .32 ? (1-ease(stt))*.7 : 1-gather;
        dummy.position.set(peripheralX + x * spread, peripheralY, -1.4).applyMatrix4(camera.matrixWorld);
        dummy.quaternion.copy(camera.quaternion);
        dummy.scale.set(.009 + gather * .004, height * .15 * spread + .018, .012);
        dummy.updateMatrix(); waveform.current.setMatrixAt(i, dummy.matrix);
      }
      waveform.current.instanceMatrix.needsUpdate = true;
    }
    if (packet.current) {
      packet.current.visible = p >= .32;
      offset.set(peripheralX,peripheralY,-1.4).applyMatrix4(camera.matrixWorld);
      // The same request reaches the original product surface on landing.
      const landing = ease(interval(master,.976,1));
      offset.lerp(dummy.position.set(.3,-.4,.1),landing);
      packet.current.position.copy(offset);
      packet.current.quaternion.copy(camera.quaternion);
      packet.current.scale.setScalar(.45 + gather * .55);
      packet.current.scale.multiplyScalar(1-.35*ease(interval(master,.32,.35)));
      packet.current.scale.x *= 1+ease(interval(master,.36,.415))*.6;
      if(inner.current) inner.current.opacity = ease(interval(master,.84,.88));
    }


  });
  return <>
    <instancedMesh ref={waveform} args={[undefined, undefined, 36]} frustumCulled={false}><boxGeometry args={[1, 1, 1]}/><meshBasicMaterial ref={bands} color="#d2f059" toneMapped={false}/></instancedMesh>
    <group ref={packet}>
      <mesh><boxGeometry args={[.04, .04, .09]}/><meshBasicMaterial ref={core} color="#e0ff79" toneMapped={false}/></mesh>
      <mesh position={[0,0,.052]}><boxGeometry args={[.021,.023,.008]}/><meshBasicMaterial ref={inner} color="#fff1d5" transparent opacity={0} toneMapped={false}/></mesh>
      <mesh position={[0, -.055, .13]}><boxGeometry args={[.018, .018, .2]}/><meshBasicMaterial color="#b2d044" transparent opacity={.55} toneMapped={false}/></mesh>
    </group>

  </>;
}
