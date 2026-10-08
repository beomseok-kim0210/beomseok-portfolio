import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Box3, Group, PerspectiveCamera, Vector3 } from "three";
import { requestArrivals, requestLegs, sampleRequest, createArmiRequestFlow, railRequestProgress, authoredRequestTracks } from "../src/features/world/adapters/armiRequestFlow";
import { armiMotionWindows, local } from "../src/features/world/adapters/armiChoreography";
import type { ArmiProductionAsset } from "../src/features/world/adapters/armiV015";

test("request remains on the rail near the viewer and Response contains no side entry",()=>{
 const camera=new PerspectiveCamera();camera.position.set(0,3,0);camera.lookAt(0,3,-20);
 const rail=Array.from({length:21},(_,i)=>new Vector3(0,1,-i));
 assert.equal(railRequestProgress(rail,camera),.4);
 camera.position.z=-4;assert.equal(railRequestProgress(rail,camera),.6);
 const tracks=authoredRequestTracks();
 assert.deepEqual(Object.keys(tracks),["response"],"no request paths to unselected branches");
 assert.deepEqual(tracks.response.slice(-3),[[0,35,-152],[0,61,-152],[0,61,-166]],"response rises outside the platform before docking");
 assert.equal(tracks.response.length,3,"no sideways approach is included in the Response trail");
});

test("every interaction waits for the request to arrive, including reverse seeks",()=>{
 for(const name of ['Text','Response'] as const){
  const window=armiMotionWindows.find(w=>w.group===name)!;
  assert.ok(window.start>requestArrivals[name]);
  assert.equal(local(requestArrivals[name]-.001,window.start,window.end),0);
  assert.ok(local(window.start+.002,window.start,window.end)>0);
 }
 assert.deepEqual(armiMotionWindows.map(w=>w.group),["Core","Text","Response"]);
 assert.deepEqual(requestLegs.map(l=>l.id),["ingress","core","core-hold","core-exit","text","response","return"]);
 for(let i=1;i<requestLegs.length;i++){
  if(requestLegs[i].id==="response")continue; // concealed handoff to the vertical response lift
  const a=requestLegs[i-1],b=requestLegs[i];
  assert.ok(a.points.at(-1)!.every((value,axis)=>Math.abs(value-b.points[0][axis])<.0001),`${a.id} to ${b.id} remains spatially continuous`);
 }
 const expected=sampleRequest(.645)!.position;
 for(const p of [.97,.2,.78,.645])sampleRequest(p);
 assert.ok(sampleRequest(.645)!.position.equals(expected));
});

test("v017 ingress ends at box entrance and removed interior objects stay hidden",async()=>{
 const bytes=readFileSync('public/models/armi/v017/ARMI_v017_BoxIngress.glb');
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 assert.equal(gltf.scene.children.length,3);assert.equal(gltf.animations.length,0);
 const bounds=new Box3().setFromObject(gltf.scene);
 assert.ok(bounds.min.z>-17,"track cannot continue inside to the spindle at z=-22.5");
 const oldPath=new Group(),oldBed=new Group(),root=new Group();
 const asset={root,objects:new Map([['GEO-V014-Core-SelectedPath',oldPath],['GEO-V014-Core-SwitchingConduitBed',oldBed]])} as unknown as ArmiProductionAsset;
 const flow=createArmiRequestFlow(asset,gltf.scene),camera=new PerspectiveCamera();
 flow.sample(.31,camera);assert.equal(oldPath.visible,false);assert.equal(oldBed.visible,false);
 const head=flow.group.getObjectByName("ARMI_RequestHead")!;
 assert.equal(head.visible,false);
 flow.sample(.337,camera);assert.equal(head.visible,false);
 flow.sample(.425,camera);assert.equal(head.visible,true);
 flow.sample(.337,camera);assert.equal(head.visible,false,"reverse seek restores absorption inside Core");
 oldPath.visible=true;flow.sample(.8,camera);flow.sample(.31,camera);assert.equal(oldPath.visible,false);
 flow.dispose();assert.equal(oldPath.visible,true);
});



test("ingress climbs continuously from the rail bottom with scroll, then holds at Core",()=>{
 const start=sampleRequest(.155)!;
 assert.deepEqual(start.position.toArray(),requestLegs[0].points[0]);
 let previous=start.position;
 for(let i=1;i<=119;i++){
  const point=sampleRequest(.155+i*.001)!.position;
  assert.ok(point.y>=previous.y,"no vertical jumps or reversals");
  assert.ok(point.distanceTo(previous)<1,"small scroll increments cannot teleport the request");
  previous=point;
 }
 const arrived=sampleRequest(.31)!.position;
 assert.deepEqual(arrived.toArray(),requestLegs[0].points.at(-1));
 const inside=sampleRequest(.345)!.position; assert.ok(inside.z < arrived.z, "request enters the box before the preview"); assert.ok(sampleRequest(.42)!.position.equals(inside),"request waits inside Core during four-way preview and selection");
});
