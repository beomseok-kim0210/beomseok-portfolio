import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { journeys, nextJourney, journeyHref } from "../src/data/journeys";
import { pageContextFromPathname } from "../src/lib/docent/rag/pageContext";

const read = (p: string) => readFileSync(p, "utf8");

test("each project journey is its own page, in order, the last leading to the gallery", () => {
  assert.deepEqual(journeys.map(j => j.id), ["armi", "hangarae", "wedding"]);
  assert.equal(journeyHref("hangarae"), "/journeys/hangarae");
  assert.equal(nextJourney("armi")?.id, "hangarae");
  assert.equal(nextJourney("hangarae")?.id, "wedding");
  assert.equal(nextJourney("wedding"), null);
  const flow = read("src/components/sections/ImmersiveProjectFlow/ImmersiveProjectFlow.tsx");
  for (const id of ["armi", "hangarae", "wedding"]) {
    assert.match(flow, new RegExp(`<JourneyCover id="${id}">`));
    assert.match(flow, new RegExp(`<JourneyNext id="${id}"/>`));
  }
  assert.match(read("src/components/sections/ImmersiveProjectFlow/JourneyFrame.tsx"), /href="\/#lab"/);
});

test("Home is Hero + index + gallery: no project journey, no 3D loader", () => {
  const home = read("src/app/page.tsx");
  assert.equal(home.includes("WorldLoader"), false);
  const index = read("src/components/sections/JourneyIndex/JourneyIndex.tsx");
  assert.match(index, /router\.push\(journeyHref\(id\)\)/);
  assert.match(read("src/data/navigation.ts"), /href: "\/#journeys"/);
});

test("the docent reads a journey page as that project's context", () => {
  const ctx = pageContextFromPathname("/journeys/hangarae");
  assert.equal(ctx.pageType, "project");
  assert.equal(ctx.projectSlug, "hangarae");
  assert.equal(pageContextFromPathname("/journeys/unknown").pageType, "other");
});
