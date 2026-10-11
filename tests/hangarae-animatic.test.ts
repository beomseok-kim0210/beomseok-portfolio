import test from "node:test";
import assert from "node:assert/strict";
import { createWorldRuntime,worldPositionForDomProgress,evaluateRuntime } from "../src/features/world/director/worldRuntime";
import { hgAnchors,hgBones,hgJointNames,hgLayout,hgOuter,hgRanges,hgShotIndex,hgRigPlacement,hgRigWorld,hgUpperRig,hgLowerRig,hgBasePose,hgHeroPlacement,sampleHangarae,sampleHangaraeCamera } from "../src/features/world/adapters/hangaraeAnimatic";
import { validateShotProfile } from "../src/features/world/director/shotProfiles";
import { hangaraeRuntimeProfile } from "../src/features/world/adapters/hangaraeAnimatic";

test("Hangarae shot boundaries partition local progress and restore in both directions",()=>{
 validateShotProfile(hangaraeRuntimeProfile);
 for(const p of hgRanges){
  const pos=worldPositionForDomProgress("hangarae",p),a=evaluateRuntime(pos,"forward","webgl"),b=evaluateRuntime(pos,"reverse","webgl");
  assert.equal(a.districtId,"hangarae");assert.equal(a.shotId,b.shotId);assert.ok(Math.abs(a.localProgress-p)<1e-12);
  assert.equal(a.shotId,hangaraeRuntimeProfile.shots[hgShotIndex(p)].shotId);
 }
});
test("Mixed district traversal retains ARMI local clock and reconstructs Hangarae directly",()=>{
 const r=createWorldRuntime();r.publish(worldPositionForDomProgress("armi",.43),"webgl");
 const protectedProgress=r.progress.current;
 for(const p of [.7,.2,.89,.42,.42,0,1]){r.publish(worldPositionForDomProgress("hangarae",p),"webgl");assert.equal(r.progress.current,protectedProgress);assert.ok(Math.abs(r.hangaraeProgress.current-p)<1e-12);}
 r.publish(worldPositionForDomProgress("armi",1),"webgl");assert.equal(r.state.current.districtId,"armi");assert.equal(r.progress.current,1);
});
test("Every visual sample and camera is history independent under rapid scrub",()=>{
 for(const [w,h]of [[1440,828],[945,828],[390,772],[360,828]]){
  const samples=Array.from({length:201},(_,i)=>sampleHangarae(i/200,w,h));
  for(let i=200;i>=0;i--)assert.deepEqual(sampleHangarae(i/200,w,h),samples[i]);
  for(const p of [.42,.94,.11,.68,.31,.88,.42]){
   const c=sampleHangaraeCamera(p,w<=700);assert.deepEqual(c,sampleHangaraeCamera(p,w<=700));assert.equal(c.position.length()<10,true);
  }
 }
});
test("DOM ownership changes only after analytic frame alignment, both boundaries",()=>{
 for(const [w,h]of [[1440,828],[945,828],[390,772],[360,828]]){
  for(const p of [.236,.245,.254].map(hgOuter)){const s=sampleHangarae(p,w,h);assert.deepEqual(s.cameraRect,s.layout.camera);}
  for(const p of [.876,.881,.888].map(hgOuter)){const s=sampleHangarae(p,w,h);assert.equal(s.merge,1);assert.ok(s.returnDomOwnership>0);}
  const l=hgLayout(w,h);for(const r of l.product){assert.ok(r.x>=0&&r.x+r.width<=w);assert.ok(r.y+r.height<h*.84);}
  for(const r of Object.values(l.reaction)){assert.ok(r.x>=0&&r.x+r.width<=w);assert.ok(r.y+r.height<=h*.91);}
 }
 // The 3D camera plane sits exactly under the DOM crop only while the camera is frontal at d=8.
 for(const p of [0,.03,hgOuter(.24)]){const c=sampleHangaraeCamera(p,false);assert.deepEqual(c.position.toArray(),[0,0,8]);}
});
test("ONE → TWO → ONE: branches split, stay distinct through the reaction, then merge",()=>{
 const at=(q:number)=>sampleHangarae(hgOuter(q),1440,828);
 for(const p of [.05,.3,.45,.48])assert.equal(at(p).split,0);
 for(const p of [.57,.62,.7])assert.equal(at(p).split,1);
 for(const p of [.9,.95,1])assert.equal(at(p).merge,1);
 // Reaction cards only rise once the analysis holograms are gone (no overlap).
 for(let p=.70;p<=.80;p+=.002){const s=at(p);if(s.reaction>.1)assert.equal(s.holo,0);}
 // Hero comes first and is gone before the product scene; the 05 seam persists through 06.
 assert.equal(sampleHangarae(0,1440,828).hero,1);assert.equal(at(.02).hero,0);assert.ok(at(.76).seam>.9);
 // Each branch figure is centred in its own half.
 const pl=hgRigPlacement(1440,828),vh=2*9*Math.tan(43*Math.PI/360),halfW=vh/2*1440/828;
 const ux=hgRigWorld(hgUpperRig,pl.upper).slice(0,11).map(v=>v.x),lx=hgRigWorld(hgLowerRig,pl.lower).slice(11).map(v=>v.x);
 assert.ok(Math.abs((Math.min(...ux)+Math.max(...ux))/2+halfW/2)<halfW*.2);assert.ok(Math.abs((Math.min(...lx)+Math.max(...lx))/2-halfW/2)<halfW*.2);
 assert.ok(hgHeroPlacement(1440,828).origin.x>0);
 // Desktop: upper branch left of centre, lower branch right; compact: upper above lower.
 const d=hgRigPlacement(1440,828),U=hgRigWorld(hgUpperRig,d.upper),L=hgRigWorld(hgLowerRig,d.lower);
 for(const i of [5,6,7,8,9])assert.ok(U[i].x<0);for(const i of [13,14,15,16])assert.ok(L[i].x>0);
 const m=hgRigPlacement(390,772),Um=hgRigWorld(hgUpperRig,m.upper),Lm=hgRigWorld(hgLowerRig,m.lower);
 assert.ok(Math.min(...[5,6,9,10].map(i=>Um[i].y))>Math.max(...[13,14].map(i=>Lm[i].y)));
});
test("Pose schema: 21 slots (COCO 17 + foot 4), registered inside the camera crop",()=>{
 assert.equal(hgAnchors.length,21);assert.equal(hgJointNames.length,21);
 assert.ok(hgBones.every(([a,b])=>a<21&&b<21&&a!==b));
 for(const [x,y] of hgAnchors){assert.ok(x>0&&x<214);assert.ok(y>0&&y<407);}
 assert.equal(hgRanges.length,11);
 // Flat (shot 03) pose has no authored depth; depth only appears in shot 04.
 assert.ok(hgBasePose(false).every(v=>v.z===0));
 const r=sampleHangaraeCamera(.45,false,true);assert.equal(r.position.x,0);
});
