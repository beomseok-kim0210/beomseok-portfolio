import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  AVATAR_RECOVERY,
  avatarGlReducer,
  initialAvatarGlState,
  type AvatarGlState,
} from "@/features/docent/avatarRecovery";
import {
  ACTIVATION_PENDING_COPY,
  DOCENT_STATUS_COPY,
} from "@/features/docent/docentStatus";
import { VOICE_STATUS_COPY } from "@/features/docent/voiceLifecycle";

const read = (file: string) => readFileSync(file, "utf8");
const ready = avatarGlReducer(initialAvatarGlState, { type: "PROBED", available: true });

test("a lost WebGL context recovers to the 3D face instead of a permanent emoji", () => {
  const lost = avatarGlReducer(ready, { type: "LOST", now: 0 });
  assert.equal(lost.status, "recovering");
  // 브라우저가 복원해 주면 그대로 얼굴
  assert.equal(avatarGlReducer(lost, { type: "RESTORED" }).status, "ready");
  // 복원이 안 오면 새 캔버스(새 컨텍스트)로 다시 마운트하고, 만들어지면 얼굴
  const remounted = avatarGlReducer(lost, { type: "REMOUNT" });
  assert.equal(remounted.canvasKey, lost.canvasKey + 1);
  assert.equal(avatarGlReducer(remounted, { type: "CREATED" }).status, "ready");
});

test("only rapid repeated losses give up; losses spread over time never do", () => {
  let state: AvatarGlState = ready;
  // 2분마다 한 번씩 잃는 긴 세션 — 항상 되살아난다
  for (let i = 0; i < 20; i += 1) {
    state = avatarGlReducer(state, { type: "LOST", now: i * 120_000 });
    state = avatarGlReducer(state, { type: "REMOUNT" });
    state = avatarGlReducer(state, { type: "CREATED" });
    assert.equal(state.status, "ready", `loss ${i}`);
  }
  // 1분 안에 maxLosses 를 넘게 잃을 때만 포기
  let burst: AvatarGlState = ready;
  for (let i = 0; i <= AVATAR_RECOVERY.maxLosses; i += 1) {
    burst = avatarGlReducer(burst, { type: "LOST", now: i * 1_000 });
    if (burst.status === "recovering") burst = avatarGlReducer(burst, { type: "CREATED" });
  }
  assert.equal(burst.status, "unavailable");
});

test("render errors retry on a fresh canvas within the same budget", () => {
  const errored = avatarGlReducer(ready, { type: "RENDER_ERROR", now: 0 });
  assert.equal(errored.status, "recovering");
  assert.equal(errored.canvasKey, ready.canvasKey + 1);
});

test("no emoji face anywhere; the canvas listens for loss and restore", () => {
  const fallback = read("src/features/docent/AvatarFallback.tsx");
  assert.equal(/\p{Extended_Pictographic}/u.test(fallback), false);
  const canvas = read("src/features/docent/AvatarCanvas.tsx");
  assert.match(canvas, /event\.preventDefault\(\)/);
  assert.match(canvas, /webglcontextrestored/);
  assert.match(canvas, /key=\{gl\.canvasKey\}/);
  assert.match(canvas, /visibilitychange/);
});

test("waking copy is the user's line on every surface", () => {
  assert.equal(ACTIVATION_PENDING_COPY, "잠시만 기다려 주세요. 곧 활성화될 예정입니다.");
  assert.equal(DOCENT_STATUS_COPY.warming_voice, ACTIVATION_PENDING_COPY);
  assert.equal(VOICE_STATUS_COPY.VOICE_WARMING, ACTIVATION_PENDING_COPY);
  const canvas = read("src/features/docent/AvatarCanvas.tsx");
  assert.match(canvas, /questionPending \? \(/);
  const chat = read("src/features/docent/ChatPanel.tsx");
  assert.match(chat, /avatarRecovering && surfaceStatus !== "ready"/);
});

test("home no longer carries the fake docent teaser", () => {
  const home = read("src/app/page.tsx");
  assert.equal(home.includes("HomeDocentShowcase"), false);
  assert.equal(read("src/app/globals.css").includes("docentBlink"), false);
});
