// 음성 엔진 콜드 스타트 UX — 워커는 쉬면 내려간다(workersMin 0, 유휴 120초). 사이트 첫 방문 한 번만의
// 일이 아니다. 준비 중에도 텍스트는 그대로 쓰이고, 얼굴이 고장처럼 멈춰 보이지 않는다.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { VOICE_REWARM_AFTER_MS } from "@/features/docent/useVoice";
import { VOICE_ENGINE_WARMING_COPY } from "@/features/docent/docentStatus";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (...p: string[]) => readFileSync(path.join(root, ...p), "utf8").replace(/\r\n/g, "\n");

test("쉬고 난 뒤 질문하면 답변 텍스트와 나란히 워커를 다시 깨운다 — 텍스트는 기다리지 않는다", () => {
  // 운영 엔드포인트 유휴 제한은 120초(2026-09-30 RunPod API 조회). 그보다 먼저 다시 깨운다.
  assert.ok(VOICE_REWARM_AFTER_MS < 120_000);
  const voice = read("src", "features", "docent", "useVoice.ts");
  assert.match(voice, /if \(!voiceEnabledRef\.current \|\| lifecycleRef\.current\.status !== "VOICE_READY"\) return;/);
  assert.match(voice, /if \(Date\.now\(\) - lastVoiceActivityRef\.current < VOICE_REWARM_AFTER_MS\) return;/);
  const runtime = read("src", "features", "docent", "DocentRuntime.tsx");
  // 음성을 켠 방문자에게만, 그리고 chat.send 를 막지 않고
  assert.match(runtime, /if \(voiceEnabled\) rewarmIfIdle\(\);\s*if \(voiceEnabled\) ensureReady\(\);\s*chat\.send\(text\);/);
});

test("음성 엔진 준비 표시는 요청 상태와 따로 온다 — 텍스트가 흐르는 동안에도 보인다", () => {
  const exp = read("src", "features", "docent", "DocentExperience.tsx");
  assert.match(exp, /const voiceWarming = runtime\.voice\.voiceEnabled\s*&& \(runtime\.voice\.lifecycle === "VOICE_WARMING" \|\| runtime\.voice\.lifecycle === "VOICE_DELAYED"\);/);
  assert.match(exp, /voiceWarming=\{voiceWarming\}/);
  const canvas = read("src", "features", "docent", "AvatarCanvas.tsx");
  // 아바타 준비(WebGL 복구)와 음성 준비는 다른 신호 — 복구 중에는 복구 표시가 우선
  assert.match(canvas, /\{voiceWarming && gl\.status !== "recovering" \? \(/);
  assert.match(canvas, /voiceWarming=\{voiceWarming\} \/>/);
  assert.match(VOICE_ENGINE_WARMING_COPY, /음성 엔진 준비 중/);
  assert.match(VOICE_ENGINE_WARMING_COPY, /텍스트/);
});

test("준비 코어는 기존 챔버 안의 가벼운 기본 도형이고, 얼굴을 다시 마운트하지 않는다", () => {
  const core = read("src", "features", "docent", "hologram", "VoiceWarmingCore.tsx");
  assert.doesNotMatch(core, /useGLTF|\.glb|<DocentHead/);
  assert.match(core, /if \(group\.current\) group\.current\.visible = p > 0\.01;/); // 다 사라지면 그리지 않는다
  const chamber = read("src", "features", "docent", "hologram", "HologramChamber.tsx");
  assert.match(chamber, /<VoiceWarmingCore uniforms=\{uniforms\} active=\{voiceWarming\} reduced=\{reduced\} \/>/);
  // 얼굴은 준비 상태와 무관하게 같은 자리에 있다
  const canvas = read("src", "features", "docent", "AvatarCanvas.tsx");
  assert.match(canvas, /<DocentHead emotion=\{emotion\} viseme=\{viseme\} mouth=\{mouth\} speaking=\{speaking\} projection=\{shell\} \/>/);
});
