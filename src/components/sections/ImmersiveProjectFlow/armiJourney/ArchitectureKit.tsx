"use client";
import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Euler, InstancedMesh, Material, Object3D, Vector3 } from "three";
import { ease, interval } from "./experienceData";
import { districtConfig, worldRoutes } from "./worldConfig";

type V=[number,number,number];
export type KitPart={position:V;scale:V;rotation?:V;color:string;lit?:boolean};
const steel="#283a42",trim="#536772",warm="#d5ad76",cool="#80b9ca";
function part(parts:KitPart[],position:V,scale:V,color=steel,rotation?:V,lit=false){parts.push({position,scale,color,rotation,lit});}
export function StructuralBeam(parts:KitPart[],a:Vector3,b:Vector3,width=.18,color=steel,lit=false){
  const object=new Object3D();object.position.copy(a).add(b).multiplyScalar(.5);object.lookAt(b);
  const e=new Euler().setFromQuaternion(object.quaternion);
  part(parts,object.position.toArray() as V,[width,width,a.distanceTo(b)],color,[e.x,e.y,e.z],lit);
}
export function Platform(parts:KitPart[],x:number,y:number,z:number,w:number,d:number){
  part(parts,[x,y,z],[w,.35,d]);
  for(const side of [-1,1]){part(parts,[x+side*w/2,y+.1,z],[.13,.18,d],trim);part(parts,[x+side*w/2,y+.22,z],[.035,.025,d],warm,undefined,true);}
  for(let i=0;i<Math.ceil(d);i++)part(parts,[x,y+.2,z-d/2+i],[w-.3,.035,.08],trim);
}
export function ServiceRail(parts:KitPart[],route:number){
  const points=worldRoutes[route].getPoints(40),a=new Vector3(),b=new Vector3();
  for(let i=0;i<40;i++){
    const p=points[i],q=points[i+1];
    for(const side of [-1,1]){a.copy(p).add(new Vector3(side*1.2,-.55,0));b.copy(q).add(new Vector3(side*1.2,-.55,0));StructuralBeam(parts,a,b,.2,trim);a.y+=.19;b.y+=.19;StructuralBeam(parts,a,b,.045,route===1?cool:warm,true);}
    if(i%2===0){a.copy(p).add(new Vector3(-1.55,-.9,0));b.copy(p).add(new Vector3(1.55,-.9,0));StructuralBeam(parts,a,b,.16);}
    if(i%5===0){part(parts,[p.x,p.y-4,p.z],[.18,6,.18]);part(parts,[p.x,p.y-7,p.z],[4,.18,1.2]);}
  }
}
function ResponseTerrace(parts:KitPart[],x:number,y:number,z:number){
  Platform(parts,x,y-3,z,15,9);
  for(let i=0;i<5;i++){
    const px=x+(i-2)*2.5,pz=z-i*.65;
    part(parts,[px,y+1,pz],[2.15,5,.14],steel);
    for(const side of [-1,1])part(parts,[px+side*.98,y+1,pz+.09],[.04,5,.04],warm,undefined,true);
    for(let row=0;row<6;row++)part(parts,[px-.2,y+2.7-row*.62,pz+.12],[1.35-(row%3)*.17,.04,.025],warm,undefined,true);
  }
}
function SearchArray(parts:KitPart[],x:number,y:number,z:number){
  Platform(parts,x,y-2,z,18,12);
  for(let row=0;row<2;row++)for(let col=0;col<6;col++){
    const px=x+(col-2.5)*2.6,py=y+row*2.8,pz=z-row*3;
    part(parts,[px,py,pz],[2.2,1.8,.22],trim);
    for(const side of [-1,1])part(parts,[px+side*1.02,py,pz+.14],[.035,1.8,.025],cool,undefined,true);
    for(let line=0;line<3;line++)part(parts,[px,py+.45-line*.4,pz+.15],[1.5,.025,.025],cool,undefined,true);
  }
}
function MemoryArray(parts:KitPart[],x:number,y:number,z:number){
  Platform(parts,x,y-5,z,11,9);
  for(let row=0;row<4;row++)for(let col=0;col<3;col++){
    const px=x+(col-1)*2.8,py=y+(row-1.5)*2.5,pz=z+(col%2)*1.3;
    part(parts,[px,py,pz],[2,2,2],trim);
    part(parts,[px,py,pz+1.01],[1.55,1.55,.04],warm,undefined,true);
    part(parts,[px,py,pz+1.06],[1.2,1.2,.045],"#31434a");
    for(let stripe=0;stripe<3;stripe++)part(parts,[px,py-.4+stripe*.4,pz+1.09],[.82,.07,.02],warm,undefined,true);
  }
}
function ActionBay(parts:KitPart[],x:number,y:number,z:number){
  Platform(parts,x,y-1,z,16,10);
  // Articulated silhouettes describe action; they do not depict real ARMI hardware.
  for(const offset of [-4,3]){
    const points=[new Vector3(x+offset,y,z),new Vector3(x+offset,y+3,z),new Vector3(x+offset+2,y+6,z-1),new Vector3(x+offset+4,y+4,z-2)];
    for(let i=0;i<3;i++){StructuralBeam(parts,points[i],points[i+1],.7,"#9c7953");part(parts,points[i].toArray() as V,[1.1,1.1,1.1],trim);}
    part(parts,points[3].toArray() as V,[1.8,.35,.8],warm);part(parts,[x+offset,y-.3,z],[3,.8,3]);
  }
}
export function buildArchitecture(compact:boolean){
  const parts:KitPart[]=[];
  // Vertical shafts with paired flanges, service bays and sparse warm registration lights.
  for(let col=0;col<(compact?7:11);col++){
    const x=(col-(compact?3:5))*8;
    for(let depth=0;depth<(compact?3:5);depth++){
      const z=-35-depth*14;
      if(Math.abs(x)<6 || (z>-85 && Math.abs(x)<30))continue;
      part(parts,[x,9,z],[.7,48,.7]);
      for(const side of [-1,1])part(parts,[x+side*.55,9,z],[.09,48,.45],trim);
      for(let level=0;level<6;level++){
        const y=-10+level*7;
        part(parts,[x,y,z],[6,.28,2.4]);part(parts,[x+2,y+1,z+.7],[1.4,1.7,.35]);
        part(parts,[x+2,y+1,z+.9],[.65,.08,.025],warm,undefined,true);
        if((col+depth+level)%3===0)part(parts,[x-2,y+2,z+.4],[.035,2,.025],cool,undefined,true);
      }
    }
  }
  for(let level=0;level<4;level++)for(const x of [-34,34])Platform(parts,x,-11+level*10,-62,8,65);
  for(let depth=0;depth<5;depth++){
    const z=-28-depth*16;
    part(parts,[0,32,z],[85,.45,1.4]);part(parts,[0,30,z-2],[85,.2,.5],trim);
    for(let x=-32;x<=32;x+=8)part(parts,[x,31,z-1],[.15,3,2],trim);
  }
  // The camera sees through an off-axis entrance frame, then discovers the districts.
  part(parts,[-33,8,-27],[1.4,38,4]);part(parts,[33,8,-30],[1.3,38,4]);
  part(parts,[2,27,-28],[36,.7,4]);
  worldRoutes.forEach((_,i)=>ServiceRail(parts,i));
  ResponseTerrace(parts,districtConfig[0].position[0],districtConfig[0].position[1],districtConfig[0].position[2]-16);
  SearchArray(parts,...districtConfig[1].position);
  MemoryArray(parts,...districtConfig[2].position);
  ActionBay(parts,...districtConfig[3].position);
  // Rail-side service frames produce two close parallax passes without enclosing the path.
  for(const [x,y,z] of [[12,6,-35],[-5,8,-50]]){
    part(parts,[x,y+3,z],[.55,13,2]);part(parts,[x-3,y+9,z],[7,.3,2]);
    for(let i=0;i<6;i++){part(parts,[x+1,y+i,z],[2,.2,1]);part(parts,[x+1.8,y+i+.4,z+.6],[.07,.3,.04],warm,undefined,true);}
  }
  return parts;
}
/** Product-facing service corridor prevents an empty return flight. */
export function buildReturnArchitecture(){
  const parts:KitPart[]=[];
  for(let i=0;i<6;i++){
    const x=-12+i*2.4,z=-32+i*6;
    Platform(parts,x,-6,z,26,6);
    for(const side of [-1,1]){
      part(parts,[x+side*12,5,z],[.5,22,1.2]);
      part(parts,[x+side*11.7,5,z+.7],[.035,20,.035],cool,undefined,true);
      for(let level=0;level<5;level++){
        part(parts,[x+side*10.8,-3+level*4,z],[2.3,.25,1.8],trim);
        part(parts,[x+side*10,-2+level*4,z+1],[.65,.06,.04],warm,undefined,true);
      }
    }
    part(parts,[x,16,z],[25,.35,1.2],trim);
    part(parts,[x,15.7,z+.7],[23,.035,.035],cool,undefined,true);
  }
  return parts;
}
export function ArchitectureBatch({parts,progress,lit=false}:{parts:KitPart[];progress:RefObject<number>;lit?:boolean}){
  const mesh=useRef<InstancedMesh>(null);
  const material=useRef<Material>(null);
  useFrame(()=>{
    if(!material.current)return;
    const quiet=ease(interval(progress.current,.82,.85))*(1-ease(interval(progress.current,.92,.94)));
    const discovery=.18+.82*ease(interval(progress.current,.395,.43));
    material.current.opacity=discovery*(1-quiet*(lit?.92:.82));
  });
  const selected=useMemo(()=>parts.filter(p=>Boolean(p.lit)===lit),[parts,lit]);
  useLayoutEffect(()=>{
    if(!mesh.current)return;const object=new Object3D(),color=new Color();
    selected.forEach((p,i)=>{object.position.set(...p.position);object.scale.set(...p.scale);object.rotation.set(...(p.rotation??[0,0,0]));object.updateMatrix();mesh.current!.setMatrixAt(i,object.matrix);mesh.current!.setColorAt(i,color.set(p.color));});
    mesh.current.instanceMatrix.needsUpdate=true;if(mesh.current.instanceColor)mesh.current.instanceColor.needsUpdate=true;
  },[selected]);
  return <instancedMesh ref={mesh} args={[undefined,undefined,selected.length]} frustumCulled={false}><boxGeometry args={[1,1,1]}/>{lit?<meshBasicMaterial ref={material} transparent toneMapped={false}/>:<meshStandardMaterial ref={material} transparent roughness={.55} metalness={.5}/>}</instancedMesh>;
}
