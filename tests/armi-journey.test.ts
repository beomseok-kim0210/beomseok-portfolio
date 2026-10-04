import test from "node:test";
import assert from "node:assert/strict";
import { cameraPath, lookPath, travelProgress } from "../src/components/sections/ImmersiveProjectFlow/armiJourney/paths.ts";
import { entryPhase } from "../src/components/sections/ImmersiveProjectFlow/armiJourney/experienceData.ts";

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
test("bounded progress holds entry and reveals semantic phases in order", () => {
  assert.equal(travelProgress(-1),0);
  assert.equal(travelProgress(2),1);
  assert.equal(entryPhase(.1),0);
  assert.equal(entryPhase(.3),1);
  assert.equal(entryPhase(.5),2);
  assert.equal(entryPhase(.9),3);
});
