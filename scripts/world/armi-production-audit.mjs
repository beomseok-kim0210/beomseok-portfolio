import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { MeshoptSimplifier } from 'meshoptimizer/simplifier';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Frustum, Matrix4, Box3, PerspectiveCamera, Mesh } from 'three';
import { prepareArmiV015 } from '../../src/features/world/adapters/armiV015.ts';
import { createArmiMotion, createArmiCameraPath } from '../../src/features/world/adapters/armiChoreography.ts';
import { createArmiSelectedRoute } from '../../src/features/world/adapters/armiSelectedRoute.ts';
import { createArmiRequestFlow } from '../../src/features/world/adapters/armiRequestFlow.ts';

const require=createRequire(import.meta.url);
const draco=require('D:/portfolio-world-v2-3d/toolchain/gltf-validation/node_modules/draco3dgltf');
const validator=require('D:/portfolio-world-v2-3d/toolchain/gltf-validation/node_modules/gltf-validator');
const out='D:/portfolio-world-v2-3d/qa/armi-production-optimization';
const served=path.resolve('public/models/armi/audit');
fs.mkdirSync(out,{recursive:true}); fs.mkdirSync(served,{recursive:true});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const copy=x=>structuredClone(x);
function read(file){const b=fs.readFileSync(file),len=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+len));const start=28+len;return {j,views:j.bufferViews.map(v=>b.subarray(start+(v.byteOffset||0),start+(v.byteOffset||0)+v.byteLength)),bytes:b};}
function serialize(g){
  const j=copy(g.j), meshes=new Set(j.nodes.flatMap(n=>n.mesh===undefined?[]:[n.mesh]));
  const usedAccessors=new Set((j.animations||[]).flatMap(a=>a.samplers.flatMap(s=>[s.input,s.output])));
  const usedMaterials=new Set();
  for(const mi of meshes) for(const p of j.meshes[mi].primitives){Object.values(p.attributes).forEach(a=>usedAccessors.add(a));if(p.indices!==undefined)usedAccessors.add(p.indices);if(p.material!==undefined)usedMaterials.add(p.material);}
  const remap=(items,used)=>{const map=new Map(),kept=[];items.forEach((x,i)=>{if(used.has(i)){map.set(i,kept.length);kept.push(x);}});return {map,kept};};
  const mm=remap(j.meshes,meshes),aa=remap(j.accessors,usedAccessors),ma=remap(j.materials,usedMaterials);
  j.nodes.forEach(n=>{if(n.mesh!==undefined)n.mesh=mm.map.get(n.mesh);});
  mm.kept.forEach(m=>m.primitives.forEach(p=>{for(const k in p.attributes)p.attributes[k]=aa.map.get(p.attributes[k]);if(p.indices!==undefined)p.indices=aa.map.get(p.indices);if(p.material!==undefined)p.material=ma.map.get(p.material);}));
  (j.animations||[]).forEach(a=>a.samplers.forEach(s=>{s.input=aa.map.get(s.input);s.output=aa.map.get(s.output);}));
  j.meshes=mm.kept;j.accessors=aa.kept;j.materials=ma.kept;
  const textures=new Set(); const visit=(o,k='')=>{if(!o||typeof o!=='object')return;if(k.toLowerCase().includes('texture')&&typeof o.index==='number')textures.add(o.index);for(const [key,v] of Object.entries(o))visit(v,key);};
  j.materials.forEach(m=>visit(m));const tx=remap(j.textures||[],textures);
  const rewrite=(o,k='')=>{if(!o||typeof o!=='object')return;if(k.toLowerCase().includes('texture')&&typeof o.index==='number')o.index=tx.map.get(o.index);for(const [key,v] of Object.entries(o))rewrite(v,key);};j.materials.forEach(m=>rewrite(m));
  const im=remap(j.images||[],new Set(tx.kept.map(t=>t.source))),sa=remap(j.samplers||[],new Set(tx.kept.map(t=>t.sampler)));
  tx.kept.forEach(t=>{t.source=im.map.get(t.source);if(t.sampler!==undefined)t.sampler=sa.map.get(t.sampler);});j.textures=tx.kept;j.images=im.kept;j.samplers=sa.kept;
  const usedViews=new Set(j.accessors.flatMap(a=>a.bufferView===undefined?[]:[a.bufferView]));
  j.meshes.forEach(m=>m.primitives.forEach(p=>{const d=p.extensions?.KHR_draco_mesh_compression;if(d)usedViews.add(d.bufferView);}));
  j.images.forEach(i=>{if(i.bufferView!==undefined)usedViews.add(i.bufferView);});
  const vm=new Map(),hashes=new Map(),views=[],data=[];let offset=0;
  for(const i of usedViews){const bytes=g.views[i],v=j.bufferViews[i],key=sha(bytes)+':'+(v.byteStride||0)+':'+(v.target||0);if(hashes.has(key)){vm.set(i,hashes.get(key));continue;}
    const index=views.length;hashes.set(key,index);vm.set(i,index);const pad=(4-offset%4)%4;if(pad){data.push(Buffer.alloc(pad));offset+=pad;}views.push({...v,buffer:0,byteOffset:offset,byteLength:bytes.length});data.push(bytes);offset+=bytes.length;
  }
  j.accessors.forEach(a=>{if(a.bufferView!==undefined)a.bufferView=vm.get(a.bufferView);});j.meshes.forEach(m=>m.primitives.forEach(p=>{const d=p.extensions?.KHR_draco_mesh_compression;if(d)d.bufferView=vm.get(d.bufferView);}));j.images.forEach(i=>{if(i.bufferView!==undefined)i.bufferView=vm.get(i.bufferView);});
  j.bufferViews=views;j.buffers=[{byteLength:offset}];for(const key of ['textures','images','samplers','animations','materials','meshes','accessors','bufferViews'])if(!j[key]?.length)delete j[key];
  const jb=Buffer.from(JSON.stringify(j)),jp=Buffer.alloc((4-jb.length%4)%4,32),bb=Buffer.concat(data),bp=Buffer.alloc((4-bb.length%4)%4),head=Buffer.alloc(20),bh=Buffer.alloc(8);
  head.writeUInt32LE(0x46546c67,0);head.writeUInt32LE(2,4);head.writeUInt32LE(28+jb.length+jp.length+bb.length+bp.length,8);head.writeUInt32LE(jb.length+jp.length,12);head.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(bb.length+bp.length,0);bh.writeUInt32LE(0x004e4942,4);
  return Buffer.concat([head,jb,jp,bh,bb,bp]);
}
const base=read('public/models/armi/v015/ARMI_v015_Web.glb');
const geomViews=new Set(base.j.meshes.flatMap(m=>m.primitives.map(p=>p.extensions?.KHR_draco_mesh_compression?.bufferView))),animViews=new Set(base.j.animations.flatMap(a=>a.samplers.flatMap(s=>[base.j.accessors[s.input].bufferView,base.j.accessors[s.output].bufferView]))),imageViews=new Set(base.j.images.map(i=>i.bufferView));
const byteBreakdown={geometry:0,animation:0,embeddedTexture:0,metadata:base.bytes.readUInt32LE(12),otherBuffers:0,containerAndPadding:28};
base.j.bufferViews.forEach((v,i)=>byteBreakdown[geomViews.has(i)?'geometry':animViews.has(i)?'animation':imageViews.has(i)?'embeddedTexture':'otherBuffers']+=v.byteLength);
byteBreakdown.containerAndPadding=base.bytes.length-Object.entries(byteBreakdown).filter(([k])=>k!=='containerAndPadding').reduce((s,[,v])=>s+v,0);
const extras=base.j.scenes.map(s=>({scene:s.name,keys:Object.entries(s.extras||{}).map(([key,value])=>({key,bytes:Buffer.byteLength(JSON.stringify(value))})).sort((a,b)=>b.bytes-a.bytes)}));
fs.writeFileSync(path.join(out,'archived-production-scene-extras.json'),JSON.stringify(base.j.scenes.map(s=>s.extras)));
const A={j:copy(base.j),views:base.views.slice()};A.j.scenes.forEach(s=>delete s.extras);
const decoder=await draco.createDecoderModule({}),encoder=await draco.createEncoderModule({});await MeshoptSimplifier.ready;
function decode(g,p){
  const ext=p.extensions.KHR_draco_mesh_compression,bytes=g.views[ext.bufferView],d=new decoder.Decoder(),db=new decoder.DecoderBuffer(),mesh=new decoder.Mesh();db.Init(new Int8Array(bytes),bytes.length);const status=d.DecodeBufferToMesh(db,mesh);if(!status.ok())throw Error(status.error_msg());
  const face=new decoder.DracoInt32Array(),indices=new Uint32Array(mesh.num_faces()*3);for(let i=0;i<mesh.num_faces();i++){d.GetFaceFromMesh(mesh,i,face);for(let k=0;k<3;k++)indices[i*3+k]=face.GetValue(k);}
  const attrs={};for(const [name,id] of Object.entries(ext.attributes)){const attr=d.GetAttributeByUniqueId(mesh,id),arr=new decoder.DracoFloat32Array(),n=attr.num_components();d.GetAttributeFloatForAllPoints(mesh,attr,arr);const data=new Float32Array(arr.size());for(let i=0;i<data.length;i++)data[i]=arr.GetValue(i);attrs[name]={data,n};decoder.destroy(arr);}
  for(const x of [face,mesh,db,d])decoder.destroy(x);return {indices,attrs};
}
const decoded=base.j.meshes.map(m=>m.primitives.map(p=>decode(base,p)));
const domainByNode=base.j.nodes.map(n=>n.extras?.web_domain||'Other');
for(const domain of ['Core','Text','Memory','Tavily','Robot','Response','Product','Routes','Environment','Anchors']){const walk=i=>{domainByNode[i]=domain;(base.j.nodes[i].children||[]).forEach(walk);};base.j.nodes.forEach((n,i)=>{if(n.name===domain)walk(i);});}
function geometryReport(g){const domains={},uses=new Map();g.j.nodes.forEach((n,i)=>{if(n.mesh===undefined)return;const domain=domainByNode[i],d=domains[domain]??={triangles:0,vertices:0,primitives:0,meshNodes:0};d.meshNodes++;for(const p of g.j.meshes[n.mesh].primitives){d.triangles+=(g.j.accessors[p.indices]?.count||0)/3;d.vertices+=g.j.accessors[p.attributes.POSITION].count;d.primitives++;}if(!uses.has(n.mesh))uses.set(n.mesh,[]);uses.get(n.mesh).push(n.name);});return {domains,uniqueMeshes:g.j.meshes.length,meshNodes:g.j.nodes.filter(n=>n.mesh!==undefined).length,nodes:g.j.nodes.length,uniqueTriangles:g.j.meshes.reduce((s,m)=>s+m.primitives.reduce((t,p)=>t+g.j.accessors[p.indices].count/3,0),0),repeatedMeshes:[...uses].filter(([,n])=>n.length>1).map(([m,names])=>({mesh:g.j.meshes[m].name,instances:names.length,names})),note:'Domain counts include node occurrences. Primitive counts are uncullled single-pass draw submissions, not measured renderer calls.'};}
const C={j:copy(A.j),views:A.views.slice()},simplifications=[];
for(let mi=0;mi<C.j.meshes.length;mi++){
  const users=C.j.nodes.flatMap((n,i)=>n.mesh===mi?[i]:[]);if(!users.length||users.some(i=>!['Memory','Tavily','Robot'].includes(domainByNode[i])))continue;
  for(let pi=0;pi<C.j.meshes[mi].primitives.length;pi++){
    const p=C.j.meshes[mi].primitives[pi],mat=C.j.materials[p.material];if(mat.extensions?.KHR_materials_unlit||mat.alphaMode==='BLEND')continue;
    const data=decoded[mi][pi];if(data.indices.length<1500)continue;
    const [indices,error]=MeshoptSimplifier.simplify(data.indices,data.attrs.POSITION.data,3,Math.floor(data.indices.length*.65/3)*3,.002,['LockBorder']);if(indices.length===data.indices.length)continue;
    const [remap,count]=MeshoptSimplifier.compactMesh(indices),mesh=new encoder.Mesh(),builder=new encoder.MeshBuilder(),enc=new encoder.Encoder(),encoded=new encoder.DracoInt8Array(),ids={};
    builder.AddFacesToMesh(mesh,indices.length/3,indices);
    for(const [name,{data:values,n}] of Object.entries(data.attrs)){const arr=new Float32Array(count*n);for(let i=0;i<remap.length;i++)if(remap[i]!==0xffffffff)for(let k=0;k<n;k++)arr[remap[i]*n+k]=values[i*n+k];
      const type=name==='POSITION'?encoder.POSITION:name==='NORMAL'?encoder.NORMAL:name.startsWith('TEXCOORD')?encoder.TEX_COORD:encoder.GENERIC;ids[name]=builder.AddFloatAttributeToMesh(mesh,type,count,n,arr);C.j.accessors[p.attributes[name]].count=count;
    }
    enc.SetSpeedOptions(5,5);enc.SetAttributeQuantization(encoder.POSITION,16);enc.SetAttributeQuantization(encoder.NORMAL,12);enc.SetEncodingMethod(encoder.MESH_EDGEBREAKER_ENCODING);
    const len=enc.EncodeMeshToDracoBuffer(mesh,encoded);if(len<=0)throw Error('Draco encode failed');const bytes=Buffer.alloc(len);for(let i=0;i<len;i++)bytes.writeInt8(encoded.GetValue(i),i);
    const view=C.views.length;C.views.push(bytes);C.j.bufferViews.push({buffer:0,byteLength:len});p.extensions.KHR_draco_mesh_compression={bufferView:view,attributes:ids};C.j.accessors[p.indices].count=indices.length;
    simplifications.push({mesh:C.j.meshes[mi].name,primitive:pi,domain:domainByNode[users[0]],before:data.indices.length/3,after:indices.length/3,normalizedError:error});for(const x of [mesh,builder,enc,encoded])encoder.destroy(x);
  }
}
function split(domains,animations){const g={j:copy(A.j),views:A.views.slice()};g.j.nodes.forEach((n,i)=>{if(n.mesh!==undefined&&!domains.includes(domainByNode[i]))delete n.mesh;});if(!animations)delete g.j.animations;return g;}
const variants={A:serialize(A),B:serialize(A),C:serialize(C),D_initial:serialize(split(['Core','Text','Routes','Environment','Anchors'],true)),D_alternatives:serialize(split(['Memory','Tavily','Robot'],false)),D_response:serialize(split(['Response'],false)),D_product:serialize(split(['Product'],false))};
const validations={};for(const [name,bytes] of Object.entries(variants)){fs.writeFileSync(path.join(served,`${name}.glb`),bytes);fs.writeFileSync(path.join(out,`${name}.glb`),bytes);const result=await validator.validateBytes(new Uint8Array(bytes),{maxIssues:100});validations[name]={bytes:bytes.length,sha256:sha(bytes),errors:result.issues.numErrors,warnings:result.issues.numWarnings,issues:result.issues.messages};}
// Decode an in-memory geometry-only copy for conservative camera-frustum sampling.
function raw(g,cache){const h={j:copy(g.j),views:g.views.slice()};delete h.j.images;delete h.j.textures;delete h.j.samplers;h.j.materials.forEach(m=>{delete m.pbrMetallicRoughness?.baseColorTexture;delete m.pbrMetallicRoughness?.metallicRoughnessTexture;delete m.normalTexture;delete m.emissiveTexture;delete m.occlusionTexture;});
  h.j.meshes.forEach((m,mi)=>m.primitives.forEach((p,pi)=>{const data=cache[mi][pi];for(const [name,{data:arr,n}] of Object.entries(data.attrs)){const vi=h.views.length;h.views.push(Buffer.from(arr.buffer));h.j.bufferViews.push({buffer:0,byteLength:arr.byteLength,target:34962});const ai=p.attributes[name];h.j.accessors[ai]={...h.j.accessors[ai],bufferView:vi,byteOffset:0,componentType:5126,count:arr.length/n};}const vi=h.views.length;h.views.push(Buffer.from(data.indices.buffer));h.j.bufferViews.push({buffer:0,byteLength:data.indices.byteLength,target:34963});h.j.accessors[p.indices]={...h.j.accessors[p.indices],bufferView:vi,byteOffset:0,componentType:5125};delete p.extensions;}));h.j.extensionsUsed=h.j.extensionsUsed.filter(e=>e!=='KHR_draco_mesh_compression');h.j.extensionsRequired=[];return serialize(h);}
globalThis.ProgressEvent=class {constructor(type,props){this.type=type;Object.assign(this,props);}};
const loader=new GLTFLoader(),buf=raw(base,decoded),gltf=await loader.parseAsync(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength),'');
const manifest=JSON.parse(fs.readFileSync('public/models/armi/v015/runtime-manifest.json','utf8')),asset=prepareArmiV015(gltf.scene,gltf.animations,manifest);
async function loadRaw(file){const g=read(file);if(g.j.extensionsUsed?.includes('KHR_draco_mesh_compression')){const d=g.j.meshes.map(m=>m.primitives.map(p=>decode(g,p)));const b=raw(g,d);return loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}const j=copy(g.j);delete j.images;delete j.textures;delete j.samplers;return loader.parseAsync(g.bytes.buffer.slice(g.bytes.byteOffset,g.bytes.byteOffset+g.bytes.byteLength),'');}
const route=await loadRaw('public/models/armi/v016/ARMI_v016_TextRoute.glb'),ingress=await loadRaw('public/models/armi/v017/ARMI_v017_BoxIngress.glb');
const motion=createArmiMotion(asset),selected=createArmiSelectedRoute(asset,route.scene),request=createArmiRequestFlow(asset,ingress.scene),camera=new PerspectiveCamera(65,16/9,.08,1000),cameraPath=createArmiCameraPath(asset),frustum=new Frustum(),matrix=new Matrix4();
const meshes=[];asset.root.traverse(n=>{if(n instanceof Mesh)meshes.push(n);});const observations=new Map(meshes.map(n=>[n,{name:n.name,domain:n.userData.web_domain||(()=>{let o=n;while(o.parent){if(asset.groups.has(o.name))return o.name;o=o.parent;}return 'Other';})(),frustumSamples:0,visibleSamples:0,minDistance:null}]));
function inspect(cam){cam.updateMatrixWorld(true);frustum.setFromProjectionMatrix(matrix.multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse));asset.root.updateMatrixWorld(true);for(const m of meshes){const o=observations.get(m);let visible=m.layers.test(cam.layers),node=m;while(node){visible&&=node.visible;node=node.parent;}if(!visible)continue;o.visibleSamples++;if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();const box=m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld);if(frustum.intersectsBox(box)){o.frustumSamples++;const distance=box.distanceToPoint(cam.position);o.minDistance=o.minDistance===null?distance:Math.min(o.minDistance,distance);}}}
for(let i=36;i<=188;i++){const p=i*.005;motion.sample(p);cameraPath.sample(p,camera);selected.sample(p,request.textTrackProgress(camera,p));request.sample(p,camera);
  if(p>=.345&&p<.442){for(const [i,name] of ['TextAnswer','MemoryRetrieval','TavilySearch','RobotAction'].entries()){const ref=asset.root.getObjectByName(`CAM-WEB-Reference-${name}`);ref.getWorldPosition(camera.position);ref.getWorldQuaternion(camera.quaternion);camera.fov=ref.fov;camera.aspect=16/9;if(i===1){camera.position.set(37.8,98,-22);camera.lookAt(36,99,-74);camera.fov=65;}if(i===2){camera.position.set(31,40,-18);camera.lookAt(31,36,-49);camera.fov=68;}camera.updateProjectionMatrix();const core=asset.groups.get('Core'),v=core.visible;core.visible=false;inspect(camera);core.visible=v;}}
  else inspect(camera);
}
const cameraAudit=[...observations.values()].map(o=>({...o,classification:!o.visibleSamples?'runtime-hidden':!o.frustumSamples?'outside-sampled-frusta':o.minDistance<15?'close-up':'visible-at-distance'}));
const report={source:{file:'public/models/armi/v015/ARMI_v015_Web.glb',bytes:base.bytes.length,sha256:sha(base.bytes)},byteBreakdown,extras,geometry:geometryReport(base),cleanupGeometry:geometryReport(A),simplifiedGeometry:geometryReport(C),simplifications,variants:validations,cameraAudit,cameraAuditMethod:'Conservative transformed bounding-box frusta at 0.005 progress steps, including all four split cameras and runtime visibility/route replacements. No occlusion claim; outside-sampled-frusta is a candidate, not proof of never visible at every viewport.',tools:{meshoptimizer:JSON.parse(fs.readFileSync('node_modules/meshoptimizer/package.json','utf8')).version}};
fs.writeFileSync(path.join(out,'audit.json'),JSON.stringify(report,null,2));fs.writeFileSync(path.join(served,'audit-summary.json'),JSON.stringify({variants:validations,simplifications},null,2));console.log(JSON.stringify({byteBreakdown,domains:report.geometry.domains,variants:Object.fromEntries(Object.entries(validations).map(([k,v])=>[k,{bytes:v.bytes,errors:v.errors,warnings:v.warnings}])),simplifications:simplifications.length,cameraClasses:cameraAudit.reduce((s,o)=>(s[o.classification]=(s[o.classification]||0)+1,s),{})},null,2));
