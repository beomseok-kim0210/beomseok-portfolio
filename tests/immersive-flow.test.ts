import assert from "node:assert/strict";
import test from "node:test";
import { pointAt, stageColors, transitionPoints } from "../src/components/sections/ImmersiveProjectFlow/geometry";

test("shared point identity reaches both endpoints and survives reverse traversal", () => {
  for (const [index, point] of transitionPoints.entries()) {
    assert.deepEqual(pointAt(point, 0, index), point.armiPosition);
    assert.deepEqual(pointAt(point, 1, index), point.poseTarget);
    const forward = Array.from({ length: 101 }, (_, n) => pointAt(point, n / 100, index));
    const backward = Array.from({ length: 101 }, (_, n) => pointAt(point, (100 - n) / 100, index)).reverse();
    assert.deepEqual(forward, backward);
    for (let n = 1; n < forward.length; n++) {
      const distance = Math.hypot(forward[n][0] - forward[n - 1][0], forward[n][1] - forward[n - 1][1]);
      assert.ok(distance < 40, `point ${point.id} jumps at ${n / 100}`);
    }
  }
  assert.equal(new Set(transitionPoints.map(point => point.id)).size, transitionPoints.length);
});

test("dark/light field and lime/cobalt signal remain continuous through phase boundaries", () => {
  const channels = (color: string) => color.match(/\d+/g)!.map(Number);
  for (const boundary of [.18, .38, .62, .82]) {
    const before = stageColors(boundary - .0001);
    const after = stageColors(boundary + .0001);
    for (const field of ["background", "accent"] as const) {
      channels(before[field]).forEach((value, i) => assert.ok(Math.abs(value - channels(after[field])[i]) <= 1));
    }
  }
});
