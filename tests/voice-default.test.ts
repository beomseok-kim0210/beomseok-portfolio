// 음성 기본 켜짐 (2026-10-01, Human 결정).
//
// 첫 진입 → voiceEnabled = true → 스피커 UI 켜짐 → RunPod 예열만 시작 → 텍스트 채팅은 그대로 →
// 실제 오디오는 재생하지 않는다. 자동재생 정책을 우회하는 무음 재생 같은 꼼수는 없다. 방문자는 끌 수 있고,
// 끄면 예열 폴링이 취소되며, 그 선택은 이 브라우저에 기억된다. 다시 켤 수 있다.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { VOICE_PREFERENCE_KEY, persistVoicePreference, readVoicePreference } from "@/features/docent/useVoice";

const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const voice = read("src/features/docent/useVoice.ts");
const runtime = read("src/features/docent/DocentRuntime.tsx");

test("처음 들어오면 음성이 켜진 상태다", () => {
  assert.match(voice, /const \[voiceEnabled, setVoiceEnabled\] = useState\(true\);/);
  assert.match(voice, /const voiceEnabledRef = useRef\(true\);/);
});

test("첫 진입 때 예열만 건다 — ENABLE 뒤 ensureReady, 재생은 하지 않는다", () => {
  const mount = voice.slice(voice.indexOf("// 첫 진입:"), voice.indexOf("return () => {", voice.indexOf("// 첫 진입:")));
  assert.match(mount, /readVoicePreference\(browserStorage\(\)\)/);
  assert.match(mount, /dispatchLifecycle\(\{ type: "ENABLE", now: Date\.now\(\) \}\);\s*queueMicrotask\(ensureReady\);/);
  // 이 훅은 소리를 내지 않는다 — 무음 재생·AudioContext 해제 같은 자동재생 우회가 없다
  assert.doesNotMatch(voice, /new Audio\(|\.play\(|AudioContext|autoplay|muted\s*=/);
});

test("예열은 기존 경로(/health 확인 → /warm 한 번)를 그대로 쓴다 — RunPod 정책은 바뀌지 않는다", () => {
  assert.match(voice, /fetch\("\/api\/docent\/voice\/health\?probe=1"/);
  assert.match(voice, /requestVoiceWarm\(controller\.signal\)/);
  assert.match(voice, /if \(!voiceEnabledRef\.current \|\| warmCycleRef\.current\) return/);
});

test("끄면 예열 폴링이 취소되고, 그 선택이 저장되며, 다시 켤 수 있다", () => {
  const toggle = voice.slice(voice.indexOf("const toggleVoice = useCallback"), voice.indexOf("const disableVoice = useCallback"));
  assert.match(toggle, /persistVoicePreference\(browserStorage\(\), next\)/);
  assert.match(toggle, /cancelWarmCycle\(\);\s*dispatchLifecycle\(\{ type: "DISABLE" \}\)/);
  assert.match(toggle, /if \(next\) \{[\s\S]*dispatchLifecycle\(\{ type: "ENABLE", now: Date\.now\(\) \}\);[\s\S]*queueMicrotask\(ensureReady\)/);
  // 끄면 재생·대기 중인 발화도 멈춘다(기존 계약)
  assert.match(runtime, /if \(!voiceEnabled\) \{\s*pendingIndexRef\.current = null;\s*streamRef\.current = null;\s*stopSupertonic\(\);/);
});

test("\"텍스트로만 계속\"(음성 실패 복구)은 다음 방문의 기본값으로 저장하지 않는다", () => {
  const disable = voice.slice(voice.indexOf("const disableVoice = useCallback"), voice.indexOf("const beginSynthesis"));
  assert.doesNotMatch(disable, /persistVoicePreference/);
  assert.match(disable, /cancelWarmCycle\(\)/);
});

test("저장된 선택 읽기: 기본은 켜짐, '0' 이면 꺼짐, 저장소가 없거나 던지면 켜짐", () => {
  const store = new Map<string, string>();
  const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
  assert.equal(readVoicePreference(storage), true);
  persistVoicePreference(storage, false);
  assert.equal(store.get(VOICE_PREFERENCE_KEY), "0");
  assert.equal(readVoicePreference(storage), false);
  persistVoicePreference(storage, true);
  assert.equal(readVoicePreference(storage), true);
  assert.equal(readVoicePreference(null), true);
  const throwing = { getItem: () => { throw new Error("SecurityError"); }, setItem: () => { throw new Error("QuotaExceeded"); } };
  assert.equal(readVoicePreference(throwing), true);
  assert.doesNotThrow(() => persistVoicePreference(throwing, false));
});
