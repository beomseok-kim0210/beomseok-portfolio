import test from "node:test";
import assert from "node:assert/strict";
import { cameraPath, lookPath, travelProgress } from "../src/components/sections/ImmersiveProjectFlow/armiJourney/paths";
import { entryPhase } from "../src/components/sections/ImmersiveProjectFlow/armiJourney/experienceData";
import { PerspectiveCamera, Vector3 } from "three";
import { journeyFov, routeCurves, sampleJourney, sampleSignal } from "../src/components/sections/ImmersiveProjectFlow/armiJourney/goldenPaths";
import { journeyPhase, entryLocal } from "../src/components/sections/ImmersiveProjectFlow/armiJourney/experienceData";

test("entry travel crosses the product plane and restores the same camera on reverse", () => {
  const forward = Array.from({length:101}, (_,i) => cameraPath.getPointAt(travelProgress(i/100)).toArray());
  assert.ok(forward[0][2] > 0);
  assert.ok(forward[100][2] < 0);
  assert.ok(Math.max(...forward.map(p=>p[0])) - Math.min(...forward.map(p=>p[0])) > 1, "travel includes lateral movement");
  for (let i=100;i>=0;i--) {
    assert.deepEqual(cameraPath.getPointAt(travelProgress(i/100)).toArray(), forward[i]);
    assert.ok(lookPath.getPointAt(travelProgress(i/100)).distanceTo(cameraPath.getPointAt(travelProgress(i/100))) > .5);
  }
});
test("golden journey preserves entry, crosses STT, follows a spatial branch and returns to the original product", () => {
  for(const compact of [false,true]) {
    const forward = Array.from({length:1001},(_,i)=>{
      const position=new Vector3(),target=new Vector3(); sampleJourney(i/1000,compact,position,target);
      assert.ok(position.toArray().every(Number.isFinite));
      assert.ok(position.distanceTo(target)>.5);
      return {position:position.toArray(),target:target.toArray()};
    });
    assert.ok(forward[430].position[2]<-12,"crosses STT boundary");
    assert.ok(Math.abs(forward[840].position[0]-forward[700].position[0])>7,"selected route includes substantial lateral travel on either layout");
    assert.ok(forward[1000].position[2]>0,"returns in front of original product plane");
    for(let i=1000;i>=0;i--){
      const position=new Vector3(),target=new Vector3();sampleJourney(i/1000,compact,position,target);
      assert.deepEqual({position:position.toArray(),target:target.toArray()},forward[i]);
    }
    for(const boundary of [.32,.395,.43,.60,.70,.84,.92,.938,.963,.985]) {
      const before=new Vector3(),after=new Vector3(),target=new Vector3();
      sampleJourney(boundary-.00001,compact,before,target);sampleJourney(boundary+.00001,compact,after,target);
      assert.ok(before.distanceTo(after)<.08,`continuous camera at ${boundary}`);
      const lookBefore=new Vector3(),lookAfter=new Vector3();
      sampleJourney(boundary-.00001,compact,before,lookBefore);sampleJourney(boundary+.00001,compact,after,lookAfter);
      assert.ok(lookBefore.distanceTo(lookAfter)<.08,`continuous look target at ${boundary}`);
    }
  }
  const expected=cameraPath.getPointAt(travelProgress(entryLocal(.16)));
  const actual=new Vector3();sampleJourney(.16,false,actual,new Vector3());assert.deepEqual(actual.toArray(),expected.toArray());
  const destinations=routeCurves.map(path=>path.getPointAt(1));
  assert.ok(Math.max(...destinations.map(p=>p.y))-Math.min(...destinations.map(p=>p.y))>10);
  assert.ok(Math.max(...destinations.map(p=>p.z))-Math.min(...destinations.map(p=>p.z))>10);
});
test("golden semantic phases reach result and product on both forward and reverse traversal",()=>{
  const checkpoints=[0,.08,.18,.28,.38,.51,.66,.78,.86,.94,1];
  assert.deepEqual(checkpoints.map(journeyPhase),Array.from({length:11},(_,i)=>i));
  assert.deepEqual([...checkpoints].reverse().map(journeyPhase),Array.from({length:11},(_,i)=>10-i));
});
test("bounded progress holds entry and reveals semantic phases in order", () => {
  assert.equal(travelProgress(-1),0);
  assert.equal(travelProgress(2),1);
  assert.equal(entryPhase(.1),0);
  assert.equal(entryPhase(.3),1);
  assert.equal(entryPhase(.5),2);
  assert.equal(entryPhase(.9),3);
});

test("decision stops translation, result lands and signal travels independently",()=>{
  const before=new Vector3(),after=new Vector3(),look=new Vector3(),signal=new Vector3();
  sampleJourney(.605,false,before,look);sampleJourney(.66,false,after,look);
  assert.ok(before.distanceTo(after)<.01,"camera must observe before committing");
  sampleJourney(.85,false,before,look);sampleJourney(.915,false,after,look);
  assert.ok(before.distanceTo(after)<.3,"response formation has a stable camera");
  sampleJourney(.78,false,after,look);sampleSignal(.78,signal);
  assert.ok(signal.distanceTo(after)>3,"signal has its own trajectory, ahead of the viewer");
});

test("request remains visible through discovery, decision, travel and product return on both layouts",()=>{
  for(const compact of [false,true]) {
    const camera=new PerspectiveCamera(43,compact?390/772:1440/828,.03,150);
    const target=new Vector3(),signal=new Vector3();
    for(let i=430;i<=985;i++) {
      const p=i/1000;
      sampleJourney(p,compact,camera.position,target);
      camera.lookAt(target);camera.fov=journeyFov(p,compact);
      camera.updateProjectionMatrix();camera.updateMatrixWorld();
      sampleSignal(p,signal,compact);signal.project(camera);
      assert.ok(Math.abs(signal.x)<.93 && Math.abs(signal.y)<.72 && signal.z<1,`signal in view at ${p}, compact=${compact}: ${signal.toArray()}`);
    }
  }
});

test("request trajectory is continuous and restores exactly on reverse",()=>{
  for(const compact of [false,true]) {
    const points=Array.from({length:681},(_,i)=>{const v=new Vector3();sampleSignal(.32+i/1000,v,compact);return v.toArray();});
    for(let i=680;i>=0;i--) {const v=new Vector3();sampleSignal(.32+i/1000,v,compact);assert.deepEqual(v.toArray(),points[i]);}
    for(const boundary of [.43,.60,.70,.815,.84,.92,.98]) {
      const a=new Vector3(),b=new Vector3();
      sampleSignal(boundary-.00001,a,compact);sampleSignal(boundary+.00001,b,compact);
      assert.ok(a.distanceTo(b)<.03,`signal boundary ${boundary}`);
    }
  }
});

test("mobile STT camera stays inside the product after crossing the portal",()=>{
  const position=new Vector3(),target=new Vector3();
  for(let i=320;i<=430;i++) {
    sampleJourney(i/1000,true,position,target);
    assert.ok(position.z<0,`camera must not re-expose the tablet back face at ${i/1000}`);
  }
});
