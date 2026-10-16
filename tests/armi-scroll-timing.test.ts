import test from "node:test";
import assert from "node:assert/strict";
import { armiScrollProgress, armiProgressToScroll, armiOverviewFocus, selectionExtraScroll, coreExtraScroll, overviewExtraScroll, ARMI_OVERVIEW_P } from "../src/features/world/adapters/armiScrollTiming";

test("selection retains the extended hold while later samples retain their authored times", () => {
  const ov = overviewExtraScroll, length = 1 + selectionExtraScroll + coreExtraScroll + ov;
  assert.ok(Math.abs(armiScrollProgress(.2 / length) - .2) < 1e-12);
  assert.ok(Math.abs(armiScrollProgress((ARMI_OVERVIEW_P + ov / 2) / length) - ARMI_OVERVIEW_P) < 1e-12);
  assert.ok(Math.abs(armiOverviewFocus((ARMI_OVERVIEW_P + ov / 2) / length) - .5) < 1e-9);
  assert.equal(armiOverviewFocus(.1), -1);
  assert.ok(Math.abs(armiScrollProgress((.31 + ov) / length) - .31) < 1e-12);
  assert.ok(Math.abs(armiScrollProgress((.345+coreExtraScroll + ov) / length) - .345) < 1e-12);
  assert.ok(Math.abs(armiScrollProgress((.402+coreExtraScroll + ov) / length) - .402) < 1e-12);
  assert.ok(Math.abs(armiScrollProgress((.472+coreExtraScroll + ov) / length) - .442) < 1e-12);
  for (const p of [.442, .507, .68, .89, .94, 1]) {
    assert.ok(Math.abs(armiScrollProgress((p + selectionExtraScroll + coreExtraScroll + ov) / length) - p) < 1e-12);
  }
  for (const p of [.05, .2, .3, .33, .38, .42, .6, .95]) assert.ok(Math.abs(armiScrollProgress(armiProgressToScroll(p)) - p) < 1e-9);
  let previous = 0;
  for (let i=0;i<=1000;i++) {
    const next = armiScrollProgress(i/1000);
    assert.ok(next >= previous && next-previous < .002);
    previous = next;
  }
});
