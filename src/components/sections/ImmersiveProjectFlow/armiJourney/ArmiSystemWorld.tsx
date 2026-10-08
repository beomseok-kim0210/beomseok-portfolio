"use client";
import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Line, MeshReflectorMaterial } from "@react-three/drei";
import { AdditiveBlending, Color, Group, MeshBasicMaterial, PointLight } from "three";
import { buildArchitecture, buildReturnArchitecture, ArchitectureBatch } from "./ArchitectureKit";
import { districtConfig, worldRoutes } from "./worldConfig";
import { ease, interval } from "./experienceData";
import styles from "./journey.module.css";
const selectedSegments=Array.from({length:32},(_,i)=>worldRoutes[0].getPoints(128).slice(i*4,i*4+5));
const shaftColor=new Color("#83c7e2").multiplyScalar(2);
function Annotation({progress,position,children,start=.43,end=.60}:{progress:RefObject<number>;position:[number,number,number];children:string;start?:number;end?:number}){
  const element=useRef<HTMLSpanElement>(null);
  useFrame(()=>{if(element.current)element.current.style.opacity=String(ease(interval(progress.current,start,start+.02))*(1-ease(interval(progress.current,end-.015,end))));});
  return <Html position={position} center zIndexRange={[1,0]}><span ref={element} className={styles.worldLabel}>{children}</span></Html>;
}
/** One persistent system complex. Infrastructure is illustrative, never real hardware. */
export function ArmiSystemWorld({progress,compact}:{progress:RefObject<number>;compact:boolean}){
  const world=useRef<Group>(null),result=useRef<Group>(null);
  const returnInfrastructure=useRef<Group>(null);
  const selectedLight=useRef<PointLight>(null);
  const routeLines=useRef<({material:{opacity:number}}|null)[]>([]);
  const panels=useRef<(MeshBasicMaterial|null)[]>([]);
  const parts=useMemo(()=>buildArchitecture(compact),[compact]);
  const returnParts=useMemo(()=>buildReturnArchitecture(),[]);
  useFrame(()=>{
    const p=progress.current;
    if(world.current)world.current.visible=p>.265 && p<.985;
    if(returnInfrastructure.current)returnInfrastructure.current.visible=p>.925 && p<.975;
    if(selectedLight.current)selectedLight.current.intensity=80+600*ease(interval(p,.635,.69))*(1-ease(interval(p,.84,.90)));
    routeLines.current.forEach((line,i)=>{if(line)line.material.opacity=ease(interval(p,.635+i*.001,.647+i*.001))*(1-ease(interval(p,.84,.86)));});
    const formation=ease(interval(p,.835,.88))*(1-ease(interval(p,.905,.935)));
    if(result.current)result.current.scale.setScalar(.3+.7*formation);
    panels.current.forEach((material,i)=>{if(material)material.opacity=formation*(.045+i*.012);});
  });
  return <group ref={world} visible={false} scale={[compact?.5:1,compact?.7:1,1]}>
    <ArchitectureBatch parts={parts} progress={progress}/><ArchitectureBatch parts={parts} progress={progress} lit/>
    <group ref={returnInfrastructure} visible={false}>
      <ArchitectureBatch parts={returnParts} progress={progress}/><ArchitectureBatch parts={returnParts} progress={progress} lit/>
    </group>
    <mesh position={[0,-13,-57]} rotation={[-Math.PI/2,0,0]}>
      <planeGeometry args={[105,130]}/>
      <MeshReflectorMaterial resolution={compact?128:256} blur={[120,60]} mixBlur={1} mixStrength={.6} roughness={.6} metalness={.5} color="#14242d" mirror={.25} depthScale={0} minDepthThreshold={.4} maxDepthThreshold={1.4}/>
    </mesh>
    {/* Six transparent transcription layers: voice -> segmentation -> ordered signal. */}
    <group position={[2.5,3,-17]} rotation={[0,-.48,0]}>
      {[0,1,2,3,4,5].map(i=><group key={i} position={[i*.95,0,-i*.7]}>
        <mesh><planeGeometry args={[3.6,8]}/><meshPhysicalMaterial color="#92b5c0" transparent opacity={.085} depthWrite={false} roughness={.3} metalness={.2} side={2}/></mesh>
        {[-1,1].map(side=><mesh key={side} position={[side*1.8,0,0]}><boxGeometry args={[.025,8,.035]}/><meshBasicMaterial color="#badbe8" toneMapped={false}/></mesh>)}
        {[-1,1].map(side=><mesh key={"h"+side} position={[0,side*4,0]}><boxGeometry args={[3.6,.025,.035]}/><meshBasicMaterial color="#7b9ba9"/></mesh>)}
        {Array.from({length:7},(_,row)=><mesh key={"r"+row} position={[-1.2,2.8-row*.8,.015]}><boxGeometry args={[i*.23+.15,.025,.025]}/><meshBasicMaterial color={i>3?"#cfe965":"#75929c"}/></mesh>)}
      </group>)}
      <mesh position={[2.8,-4.1,-2]}><boxGeometry args={[11,.18,8]}/><meshStandardMaterial color="#263840" roughness={.35} metalness={.7}/></mesh>
    </group>
    <Annotation progress={progress} position={[2,7.8,-17]} start={.345} end={.43}>GOOGLE CLOUD STT</Annotation>
    {/* Cyan shaft is the chamber's depth anchor, not the request entity. */}
    <group position={[0,5,-49]}>
      {[-2,-1,0,1,2].map(i=><mesh key={i} position={[i*.65,4,-Math.abs(i)]}><boxGeometry args={[.035,44,.035]}/><meshBasicMaterial color={shaftColor} transparent opacity={.55} toneMapped={false}/></mesh>)}
      <mesh position={[0,4,0]}><cylinderGeometry args={[.5,2.8,43,16,1,true]}/><meshBasicMaterial color="#75b8d4" transparent opacity={.045} depthWrite={false} blending={AdditiveBlending} side={2}/></mesh>
    </group>
    <pointLight position={[0,12,-43]} color="#bbd8e5" intensity={800} distance={80}/>
    <pointLight ref={selectedLight} position={[1,4,-45]} color="#d7ef8b" intensity={150} distance={55}/>
    {districtConfig.map((d,i)=><group key={d.name}>
      <pointLight position={[d.position[0],d.position[1]+6,d.position[2]+10]} color={d.color} intensity={i===1?100:65} distance={30}/>
      <Annotation progress={progress} position={compact?[d.position[0]*.65,d.position[1]+6,d.position[2]+3]:[d.position[0],d.position[1]+7,d.position[2]+3]} end={i===0?.72:.60}>{d.name}</Annotation>
    </group>)}
    {/* Only one route receives lime; all alternatives remain spatially present. */}
    {selectedSegments.map((points,i)=><Line key={i} ref={line=>{routeLines.current[i]=line;}} points={points.map(p=>[p.x,p.y-.32,p.z] as [number,number,number])} color="#dcff70" lineWidth={compact?5:9} transparent opacity={0} toneMapped={false} depthWrite={false}/>)}
    {/* Quiet response chamber: the persistent request itself supplies its information. */}
    <group position={[-20,10,-68]}>
      <mesh position={[0,-3.4,0]}><cylinderGeometry args={[5,5,.35,48]}/><meshStandardMaterial color="#34434b" roughness={.25} metalness={.8}/></mesh>
      {[-3.15,4.8].map(y=><mesh key={y} position={[0,y,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[4.3,.025,8,64]}/><meshBasicMaterial color="#c5d9cb" transparent opacity={.65}/></mesh>)}
      {[-1,1].map(side=><mesh key={side} position={[side*4,1,-.2]}><boxGeometry args={[.06,8,.06]}/><meshBasicMaterial color="#91b7c6" transparent opacity={.45}/></mesh>)}
      <group ref={result}>
        {[0,1,2,3].map(i=><group key={i} position={[(i-1.5)*.18,(i-1.5)*.12,-(3-i)*.7]}>
          <mesh><planeGeometry args={[5.3-i*.65,6.5-i*.45]}/><meshBasicMaterial ref={material=>{panels.current[i]=material;}} color={i<2?"#8db1ba":"#bddeb5"} transparent opacity={0} depthWrite={false} side={2}/></mesh>
          {[-1,1].map(side=><mesh key={side} position={[side*(5.3-i*.65)/2,0,0]}><boxGeometry args={[.018,6.5-i*.45,.02]}/><meshBasicMaterial color="#dceacc" transparent opacity={.5}/></mesh>)}
          {[-1,1].map(side=><mesh key={"h"+side} position={[0,side*(6.5-i*.45)/2,0]}><boxGeometry args={[5.3-i*.65,.018,.02]}/><meshBasicMaterial color="#a4c7cc" transparent opacity={.45}/></mesh>)}
        </group>)}
      </group>
      <mesh position={[0,7,0]}><cylinderGeometry args={[1,3,16,20,1,true]}/><meshBasicMaterial color="#9bcadb" transparent opacity={.018} depthWrite={false} blending={AdditiveBlending} side={2}/></mesh>
      <pointLight position={[0,1,2]} color="#d9edc2" intensity={160} distance={18}/>
    </group>
  </group>;
}
