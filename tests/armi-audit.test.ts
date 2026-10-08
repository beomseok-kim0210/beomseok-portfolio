import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Group,Mesh,BoxGeometry,MeshStandardMaterial } from "three";
import { createAuditInstances } from "../src/features/world/audit/auditInstancing";
import type { ArmiProductionAsset } from "../src/features/world/adapters/armiV015";

function read(file:string){const bytes=readFileSync(file),jsonLength=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+jsonLength).toString());return{json,bin:bytes.subarray(28+jsonLength)};}
test("audit instance batching preserves source names, compacts hidden sources and restores layers",()=>{
  const root=new Group(),text=new Group();text.name="Text";root.add(text);
  const geometry=new BoxGeometry(),material=new MeshStandardMaterial();
  const a=new Mesh(geometry,material),b=new Mesh(geometry,material);a.name="GEO-V013-TextLine-A";b.name="GEO-V013-TextLine-B";b.position.x=2;text.add(a,b);
  const asset={root,groups:new Map([["Text",text]])} as unknown as ArmiProductionAsset;
  const first=createAuditInstances(asset),second=createAuditInstances(asset);
  assert.equal(first.count,1);assert.equal(second.count,1);assert.equal(a.layers.mask,1);assert.equal(root.children.length,1);
  second.sample();assert.equal(a.layers.mask,2**31);assert.equal(second.objects[0].count,2);
  b.visible=false;second.sample();assert.equal(second.objects[0].count,1);assert.equal(root.getObjectByName(a.name),a);
  text.visible=false;second.sample();assert.equal(second.objects[0].visible,false);
  second.dispose();assert.equal(a.layers.mask,1);assert.equal(root.children.length,1);first.dispose();geometry.dispose();material.dispose();
});
test("lossless audit candidate preserves all node contracts and animation channels",()=>{
  const baseline=read("public/models/armi/v015/ARMI_v015_Web.glb"),a=read("public/models/armi/audit/A.glb");
  assert.deepEqual(a.json.nodes,baseline.json.nodes);
  assert.deepEqual(a.json.animations,baseline.json.animations);
  assert.equal(a.json.scenes[0].extras,undefined);
  const contract=(g:ReturnType<typeof read>)=>g.json.meshes.map((m:{primitives:{extensions:{KHR_draco_mesh_compression:{bufferView:number|string}}}[]})=>{
    const mesh=structuredClone(m);for(const p of mesh.primitives){const ext=p.extensions.KHR_draco_mesh_compression,v=g.json.bufferViews[Number(ext.bufferView)];ext.bufferView=createHash("sha256").update(g.bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength)).digest("hex");}return mesh;
  });
  assert.deepEqual(contract(a),contract(baseline));
});
test("camera simplification leaves Core, Text and Response Draco geometry byte-identical",()=>{
  const baseline=read("public/models/armi/v015/ARMI_v015_Web.glb"),c=read("public/models/armi/audit/C.glb");
  for(const node of baseline.json.nodes){
    if(node.mesh===undefined||!["Core","Text","Response"].includes(node.extras?.web_domain))continue;
    const other=c.json.nodes.find((n:{name:string})=>n.name===node.name);
    const prims=baseline.json.meshes[node.mesh].primitives,others=c.json.meshes[other.mesh].primitives;
    prims.forEach((p:{extensions:{KHR_draco_mesh_compression:{bufferView:number}}},i:number)=>{
      const v=baseline.json.bufferViews[p.extensions.KHR_draco_mesh_compression.bufferView],w=c.json.bufferViews[others[i].extensions.KHR_draco_mesh_compression.bufferView];
      assert.deepEqual(baseline.bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength),c.bin.subarray(w.byteOffset||0,(w.byteOffset||0)+w.byteLength),node.name);
    });
  }
});
