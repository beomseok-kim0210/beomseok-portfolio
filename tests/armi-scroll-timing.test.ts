import test from "node:test";
import assert from "node:assert/strict";
import { armiScrollProgress, selectionExtraScroll, coreExtraScroll } from "../src/features/world/adapters/armiScrollTiming";

test("selection retains the extended hold while later samples retain their authored times", () => {
  const length = 1 + selectionExtraScroll + coreExtraScroll;
  assert.ok(Math.abs(armiScrollProgress(.31 / length) - .31) < 1e-12);
  assert.ok(Math.abs(armiScrollProgress((.345+coreExtraScroll) / length) - .345) < 1e-12);
  assert.ok(Math.abs(armiScrollProgress((.402+coreExtraScroll) / length) - .402) < 1e-12);
  assert.ok(Math.abs(armiScrollProgress((.472+coreExtraScroll) / length) - .442) < 1e-12);
  for (const p of [.442, .507, .68, .89, .94, 1]) {
    assert.ok(Math.abs(armiScrollProgress((p + selectionExtraScroll + coreExtraScroll) / length) - p) < 1e-12);
  }
  let previous = 0;
  for (let i=0;i<=1000;i++) {
    const next = armiScrollProgress(i/1000);
    assert.ok(next >= previous && next-previous < .002);
    previous = next;
  }
});
