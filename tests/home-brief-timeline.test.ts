import assert from "node:assert/strict";
import test from "node:test";
import { briefTimeline } from "../src/components/sections/ImmersiveProjectFlow/timeline";

test("reading owns the pinned scene; the Hangarae hero wipes in over it",()=>{
  {
    const at=(distance:number)=>briefTimeline(distance/1.15);
    assert.equal(at(0).heroActive,true);
    for (const distance of [.36,.6,.99]) {
      assert.equal(at(distance).briefActive,true);
      assert.equal(at(distance).heroActive,false);
      assert.equal(at(distance).progress,.18);
    }
    assert.equal(at(1).transition,0);
    let previous=0;
    for(let n=0;n<=100;n++) {
      const scene=briefTimeline(n/100);
      assert.ok(scene.progress>=previous);
      if(n/100>=.35/1.15) assert.equal(scene.heroActive,false);
      previous=scene.progress;
    }
    const forward=Array.from({length:101},(_,n)=>briefTimeline(n/100));
    const reverse=Array.from({length:101},(_,n)=>briefTimeline((100-n)/100)).reverse();
    assert.deepEqual(forward,reverse);
  }
});
