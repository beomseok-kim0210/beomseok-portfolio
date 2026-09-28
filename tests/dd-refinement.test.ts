import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  DOCENT_RENDERED_SILHOUETTE,
  frameAvatarPortrait,
} from "@/features/docent/avatarFraming";
import {
  failureFromResponse,
  failureFromStreamError,
  preserveAssistantFailure,
} from "@/features/docent/chatFailure";
import {
  docentRequestReducer,
  initialDocentRequestState,
  resolveDocentSurfaceStatus,
} from "@/features/docent/docentStatus";

const BOUNDS = {
  min: { x: -0.1052, y: -0.1305, z: -0.1546 },
  max: { x: 0.1052, y: 0.2185, z: 0.1546 },
};

test("portrait framing uses the rendered silhouette and protects the motion envelope", () => {
  const frame = frameAvatarPortrait(BOUNDS, 354 / 272, 30);
  const frameWithDifferentBoxY = frameAvatarPortrait({
    ...BOUNDS,
    min: { ...BOUNDS.min, y: -4 },
    max: { ...BOUNDS.max, y: 7 },
  }, 354 / 272, 30);
  const silhouetteHeight =
    DOCENT_RENDERED_SILHOUETTE.maxY - DOCENT_RENDERED_SILHOUETTE.minY;
  assert.ok(Math.abs(frame.subjectHeightOccupancy - 0.74) < 1e-9);
  assert.ok(Math.abs(frame.visibleHeight - silhouetteHeight / 0.74) < 1e-9);
  assert.ok(frame.subjectWidthOccupancy > 0.44 && frame.subjectWidthOccupancy < 0.45);
  assert.ok(Math.abs(frame.headroom - 0.1) < 1e-9);
  assert.ok(frame.worstCaseIdleHeadroom > 0.06);
  assert.ok(frame.worstCaseInteractiveHeadroom > 0.02);
  assert.ok(frame.eyeLine > 0.32 && frame.eyeLine < 0.33);
  assert.ok(frame.idleEnvelope.width < frame.visibleWidth);
  assert.ok(frame.distance > 0.68 && frame.distance < 0.69);
  assert.equal(frameWithDifferentBoxY.visibleHeight, frame.visibleHeight);
  assert.equal(frameWithDifferentBoxY.target.y, frame.target.y);
  const interactiveShift = frame.headroom - frame.worstCaseInteractiveHeadroom;
  assert.ok(frame.headroom - interactiveShift > 0);
  assert.ok(frame.headroom + frame.subjectHeightOccupancy + interactiveShift < 1);
});

// 목 종단은 DOM 가림막이 아니라 3D 디졸브가 맡는다 — tests/hologram-chamber.test.ts.

test("mid-stream failure preserves the partial assistant answer and attaches its stage", () => {
  const messages = [
    { role: "user" as const, content: "질문" },
    { role: "assistant" as const, content: "여기까지 생성된 답변" },
  ];
  const next = preserveAssistantFailure(messages, {
    message: "답변 생성 중 문제가 생겼어요.",
    stage: "llm",
  });
  assert.equal(next[1].content, "여기까지 생성된 답변");
  assert.equal(next[1].failure?.message, "답변 생성 중 문제가 생겼어요.");
  assert.equal(next[1].failure?.stage, "llm");
});

test("stream error message passes through without exposing unsafe backend detail", () => {
  const failure = failureFromStreamError({
    type: "error",
    message: "지금 질문이 많아요. 잠시 후 다시 시도해 주세요.",
    failureStage: "llm",
  });
  assert.equal(failure.message, "지금 질문이 많아요. 잠시 후 다시 시도해 주세요.");
  const redacted = failureFromStreamError({
    type: "error",
    message: "C:\\Users\\private\\src\\secret.ts stack trace",
    failureStage: "llm",
  });
  assert.equal(redacted.message, "답변을 불러오지 못했어요.");
});

test("non-OK body passes through its message, stage, and Retry-After", async () => {
  const now = 10_000;
  const failure = await failureFromResponse(new Response(JSON.stringify({
    error: "요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.",
    failure_stage: "network",
  }), {
    status: 429,
    headers: { "Content-Type": "application/json", "Retry-After": "30" },
  }), now);
  assert.deepEqual(failure, {
    message: "요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.",
    stage: "network",
    retryAfterSeconds: 30,
    retryAt: 40_000,
  });
});

test("request and voice state machine distinguish all six surface states", () => {
  const searching = docentRequestReducer(initialDocentRequestState, { type: "SEND", now: 1 });
  const answering = docentRequestReducer(searching, { type: "STAGE", stage: "llm" });
  const delayed = docentRequestReducer(answering, { type: "DELAYED" });
  const failed = docentRequestReducer(delayed, { type: "FAILED", stage: "llm" });
  const ready = docentRequestReducer(answering, { type: "DONE" });
  assert.equal(resolveDocentSurfaceStatus(searching.status, "VOICE_OFF"), "searching");
  assert.equal(resolveDocentSurfaceStatus(answering.status, "VOICE_OFF"), "answering");
  assert.equal(resolveDocentSurfaceStatus(ready.status, "VOICE_WARMING"), "warming_voice");
  assert.equal(resolveDocentSurfaceStatus(ready.status, "VOICE_READY"), "ready");
  assert.equal(resolveDocentSurfaceStatus(delayed.status, "VOICE_OFF"), "delayed");
  assert.equal(resolveDocentSurfaceStatus(failed.status, "VOICE_OFF"), "failed");
});

test("navigation, hints, opening, and text chat still cannot warm voice", () => {
  const files = [
    "src/features/docent/GlobalDocent.tsx",
    "src/features/docent/useContextualHint.ts",
    "src/features/docent/useDocentChat.ts",
    "src/features/docent/ChatPanel.tsx",
  ];
  for (const file of files) {
    assert.equal(readFileSync(file, "utf8").includes("/api/docent/voice/warm"), false, file);
  }
  const runtime = readFileSync("src/features/docent/DocentRuntime.tsx", "utf8");
  assert.match(runtime, /if \(voiceEnabled\) ensureReady\(\)/);
});
