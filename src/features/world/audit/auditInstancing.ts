import { InstancedMesh, Matrix4, Mesh, type Object3D, type WebGLRenderer } from "three";
import type { ArmiProductionAsset } from "../adapters/armiV015";
export const auditDomainCounters=new WeakMap<WebGLRenderer,Record<string,number>>();
export function createAuditDrawCounter(roots:Object3D[],gl:WebGLRenderer){
  const entries:{mesh:Mesh;original:Mesh["onBeforeRender"];wrapped:Mesh["onBeforeRender"]}[]=[];
  roots.forEach(root=>root.traverse(node=>{if(!(node instanceof Mesh))return;
    let parent:Object3D|null=node,domain=node.userData.auditDomain??"RuntimeEffects";
    while(parent){if(["Core","Text","Memory","Tavily","Robot","Response","Product","Routes","Environment"].includes(parent.name)){domain=parent.name;break;}parent=parent.parent;}
    const original=node.onBeforeRender;const wrapped:Mesh["onBeforeRender"]=function(this:Mesh,...args){original.apply(this,args);const counts=auditDomainCounters.get(gl);if(counts)counts[domain]=(counts[domain]??0)+1;};entries.push({mesh:node,original,wrapped});
  }));return {reset(){auditDomainCounters.set(gl,{});for(const {mesh,wrapped}of entries)mesh.onBeforeRender=wrapped;},dispose(){for(const {mesh,original}of entries)mesh.onBeforeRender=original;}};
}
/** Preserve every named source and animation binding; batch only shared geometry/material. */
export function createAuditInstances(asset:ArmiProductionAsset){
  const groups=new Map<string,Mesh[]>();
  asset.root.traverse(o=>{
    if(!(o instanceof Mesh)||o.type==="SkinnedMesh"||o.layers.mask!==1||Array.isArray(o.material))return;
    if(!/TextLine|SourceLine|MemoryReact|MemoryContext|IncomingRecord|ResponseRowLine|RobotJointCommand/.test(o.name))return;
    const key=o.geometry.uuid+":"+o.material.uuid;
    if(!groups.has(key))groups.set(key,[]);groups.get(key)!.push(o);
  });
  const batches=[...groups.values()].filter(s=>s.length>1).map(sources=>{
    const mesh=new InstancedMesh(sources[0].geometry,sources[0].material,sources.length);mesh.name="AUDIT_Instances_"+sources[0].name;
    let parent:import("three").Object3D|null=sources[0];while(parent){if(asset.groups.has(parent.name)){mesh.userData.auditDomain=parent.name;break;}parent=parent.parent;}
    return {mesh,sources};
  });
  const inverse=new Matrix4(),matrix=new Matrix4();
  return {objects:batches.map(b=>b.mesh),count:batches.length,sources:batches.reduce((s,b)=>s+b.sources.length,0),sample(){
    for(const {mesh,sources}of batches){if(!mesh.parent)asset.root.add(mesh);sources.forEach(s=>s.layers.set(31));}
    asset.root.updateMatrixWorld(true);inverse.copy(asset.root.matrixWorld).invert();
    for(const {mesh,sources} of batches){let count=0;sources.forEach(source=>{
      let visible=true,node:import("three").Object3D|null=source;while(node){visible&&=node.visible;node=node.parent;}
      if(visible)mesh.setMatrixAt(count++,matrix.multiplyMatrices(inverse,source.matrixWorld));
    });mesh.count=count;mesh.visible=count>0;mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}
  },dispose(){for(const {mesh,sources}of batches){sources.forEach(s=>s.layers.set(0));mesh.removeFromParent();mesh.dispose();}}};
}
