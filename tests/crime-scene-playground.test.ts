import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import * as story from "@/data/crimeScenePlayground";
import { getProjectDetail } from "@/data/projectDetails";

const read = (file: string) => readFileSync(file, "utf8");
const publicCopy = JSON.stringify([
  story.crimeSceneOrigin,
  story.crimeSceneTimeline,
  story.crimeSceneTroubles,
  story.crimeSceneNumbers,
  story.crimeSceneNext,
]);

test("Playground copy is spoiler-free: no clue codes, no suspect names", () => {
  // 게임을 여기서 바로 시작한다 — 단서 코드(A3, C8, B1 …)와 인물 이름을 싣지 않는다.
  assert.equal(/\b[A-Z]\d{1,2}[a-z]?\b/.test(publicCopy), false, "clue code in public copy");
  for (const name of ["하늘", "지안", "세라", "진혁", "도윤", "지수"]) {
    assert.equal(publicCopy.includes(name), false, `suspect/character name "${name}" in public copy`);
  }
  assert.equal(/범인은|범인이 [가-힣]+(이다|였다)/.test(publicCopy), false);
});

test("Playground tells how it started, what broke, and what comes next", () => {
  assert.ok(story.crimeSceneOrigin.paragraphs.length >= 2);
  assert.ok(story.crimeSceneTimeline.length >= 6);
  assert.ok(story.crimeSceneTimeline.some((m) => m.upcoming), "upcoming milestones are marked");
  assert.ok(story.crimeSceneTroubles.length >= 6);
  for (const t of story.crimeSceneTroubles) {
    for (const field of ["problem", "investigation", "solution", "result"] as const) {
      assert.ok(t[field].length > 20, `${t.title}.${field}`);
    }
  }
  assert.ok(story.crimeSceneNext.some((n) => n.status === "진행 중"));
  const page = read("src/app/playground/page.tsx");
  assert.match(page, /<CrimeSceneDevlog \/>/);
  const devlog = read("src/features/playground/CrimeSceneDevlog.tsx");
  // 목록의 직계 자식은 li — MotionBlock(div)을 ol/ul 바로 아래 두지 않는다.
  assert.doesNotMatch(devlog, /<(ol|ul)[^>]*>\s*\{[^}]*=>\s*\(\s*<MotionBlock/);
});

test("the case study shares the same troubleshooting records", () => {
  assert.equal(getProjectDetail("crime-scene")?.troubleshooting, story.crimeSceneTroubles);
});
