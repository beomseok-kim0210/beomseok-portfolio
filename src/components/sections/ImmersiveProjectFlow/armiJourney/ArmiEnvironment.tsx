"use client";
import { useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
/** Occluding surfaces reveal the distance behind the original product plane.
 * These are spatial staging, not a representation of ARMI hardware/architecture. */
export function ArmiEnvironment({ compact,progress }: { compact: boolean; progress:RefObject<number> }) {
  const entrance=useRef<Group>(null);
  useFrame(()=>{if(entrance.current) entrance.current.visible=progress.current<=.345 || progress.current>=.965;});
  return <>
    <color attach="background" args={["#080d10"]}/>
    <fog attach="fog" args={["#080d10", 12, 42]}/>
    <ambientLight intensity={.8}/>
    <directionalLight position={[3, 6, 8]} intensity={2} color="#dce6e2"/>
    <pointLight position={[-2, 1, -6]} intensity={30} color="#9eaeb0" distance={17}/>
    <group ref={entrance}><mesh position={[0, -3.25, -8]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[32, 56]}/><meshStandardMaterial color="#182125" metalness={.35} roughness={.65}/></mesh>
    {(compact ? [0, 2, 4] : [0, 1, 2, 3, 4]).map(i => <group key={i} position={[i % 2 ? -1.5 : .6, 0, -3 - i * 4.8]}>
      <mesh position={[-4.4, -.3, 0]} rotation={[0, .12, .04]}><boxGeometry args={[.22, 6.1, 2.6]}/><meshStandardMaterial color="#334349" metalness={.6} roughness={.48}/></mesh>
      <mesh position={[5.5, .3, -.8]} rotation={[0, -.2, -.04]}><boxGeometry args={[.15, 7.4, 3.4]}/><meshStandardMaterial color="#28363c" metalness={.6} roughness={.5}/></mesh>
      <mesh position={[.5, 3.5, -1.5]} rotation={[.08, 0, -.08]}><boxGeometry args={[10.5, .12, 1.4]}/><meshStandardMaterial color="#233037" metalness={.4} roughness={.6}/></mesh>
    </group>)}
    {/* Single inbound rail supplies a directional depth cue. Not a decorative grid. */}
    <mesh position={[-1.4, -3.2, -10]}><boxGeometry args={[.035, .025, 32]}/><meshBasicMaterial color="#627d82" transparent opacity={.38}/></mesh></group>
  </>;
}
