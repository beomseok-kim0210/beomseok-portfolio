import test from "node:test";
import assert from "node:assert/strict";
import { routingCue } from "../src/features/world/adapters/armiRoutingCue";

test("Core cue crossfades and Text selection has exactly three scroll-driven pulses", () => {
  let peaks=0, previous=0, rising=false;
  for(let i=0;i<=1000;i++) {
    const value=routingCue(.402+i/1000*.035).blink;
    if(value>previous) rising=true;
    else if(value<previous&&rising) { peaks++; rising=false; }
    previous=value;
  }
  assert.equal(peaks,3);
  assert.equal(routingCue(.44).blink,0);
  assert.equal(routingCue(.3).glow,0);
  assert.equal(routingCue(.36).glow,0);
  assert.ok(routingCue(.349).blend>0&&routingCue(.349).blend<1);
});
