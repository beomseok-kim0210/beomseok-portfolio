import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { sanitizeForTts } from "@/lib/docent/ttsText";
import {
  initialVoiceLifecycleState,
  isVoiceHealthReady,
  voiceLifecycleReducer,
  voicePollDelay,
  voiceStatusMessage,
} from "@/features/docent/voiceLifecycle";
import {
  requestVoiceWarm,
  resetVoiceWarmClientForTests,
} from "@/features/docent/voiceWarmClient";

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");

test("A. OFF → ON 은 즉시 WARMING 이고 실제 준비 신호에서 READY 가 된다", () => {
  const warming = voiceLifecycleReducer(initialVoiceLifecycleState, { type: "ENABLE", now: 1_000 });
  assert.deepEqual(warming, { status: "VOICE_WARMING", warmingSince: 1_000, failureStage: null });
  assert.equal(isVoiceHealthReady({ status: "reachable", runpod: { workers: { ready: 1 } } }), true);
  assert.equal(isVoiceHealthReady({ status: "reachable", runpod: { workers: { idle: 1 } } }), true);
  assert.equal(isVoiceHealthReady({ status: "reachable", runpod: { workers: { initializing: 1 } } }), false);
  assert.equal(voiceLifecycleReducer(warming, { type: "HEALTH_READY" }).status, "VOICE_READY");

  const hook = read("src/features/docent/useVoice.ts");
  assert.match(hook, /queueMicrotask\(ensureReady\)/, "토글은 준비 완료를 await 하지 않아야 한다");
});

test("B. 이미 준비된 헬스는 warm POST 보다 먼저 빠져나간다", () => {
  const hook = read("src/features/docent/useVoice.ts");
  const readyAt = hook.indexOf("isVoiceHealthReady(payload)");
  const warmAt = hook.indexOf("requestVoiceWarm(controller.signal)");
  assert.ok(readyAt >= 0 && warmAt > readyAt);
  assert.match(hook.slice(readyAt, warmAt), /dispatchLifecycle\(\{ type: "HEALTH_READY" \}\);\s*return;/);
});

test("C. 콜드 준비는 질문 전송을 막지 않고 텍스트 스트림과 분리돼 있다", () => {
  const runtime = read("src/features/docent/DocentRuntime.tsx");
  const sendStart = runtime.indexOf("const send = useCallback");
  const sendBody = runtime.slice(sendStart, runtime.indexOf("useEffect", sendStart));
  assert.match(sendBody, /if \(voiceEnabled\) ensureReady\(\);[\s\S]*chat\.send\(text\)/);
  assert.equal(sendBody.includes("await ensureReady"), false);
});

test("D. 텍스트 답변을 먼저 보존하고 READY 뒤에 합성을 시작한다", () => {
  const runtime = read("src/features/docent/DocentRuntime.tsx");
  assert.match(runtime, /pendingSpeechRef\.current = last\.content/);
  assert.match(runtime, /lifecycle !== "VOICE_READY"[\s\S]*pendingSpeechRef\.current[\s\S]*speakOnce\(pending\)/);
});

test("E. 답변 합성은 SYNTHESIZING → SPEAKING 으로 전이한다", () => {
  let state = voiceLifecycleReducer(
    voiceLifecycleReducer(initialVoiceLifecycleState, { type: "ENABLE", now: 0 }),
    { type: "HEALTH_READY" },
  );
  state = voiceLifecycleReducer(state, { type: "SYNTHESIS_STARTED" });
  assert.equal(state.status, "VOICE_SYNTHESIZING");
  state = voiceLifecycleReducer(state, { type: "PLAYBACK_STARTED" });
  assert.equal(state.status, "VOICE_SPEAKING");
});

test("F. 5초/20초 지연 문구와 백오프에 숫자 ETA가 없다", () => {
  const warming = voiceLifecycleReducer(initialVoiceLifecycleState, { type: "ENABLE", now: 0 });
  assert.equal(voiceStatusMessage(warming, 4_999), "음성 기능을 준비하고 있어요…");
  const delayed = voiceLifecycleReducer(warming, { type: "HEALTH_WAITING", now: 5_000 });
  assert.equal(voiceStatusMessage(delayed, 5_000), "텍스트 답변은 먼저 확인하실 수 있어요.");
  assert.equal(voiceStatusMessage(delayed, 20_000), "텍스트 답변은 먼저 확인하실 수 있어요.");
  assert.deepEqual([0, 1, 2, 3, 4].map(voicePollDelay), [2_000, 4_000, 8_000, 10_000, 10_000]);
  for (const at of [4_999, 5_000, 20_000]) {
    assert.doesNotMatch(voiceStatusMessage(at < 5_000 ? warming : delayed, at) ?? "", /\d+\s*(초|%)/);
  }
});

test("G. 오류 문구는 제품 문구로 고정되고 원시 진단을 포함하지 않는다", () => {
  const enabled = voiceLifecycleReducer(initialVoiceLifecycleState, { type: "ENABLE", now: 0 });
  const failed = voiceLifecycleReducer(enabled, { type: "FAILED" });
  const message = voiceStatusMessage(failed, 0);
  assert.equal(message, "음성 연결이 지연되고 있어요. 텍스트 답변은 계속 이용할 수 있습니다.");
  assert.doesNotMatch(message ?? "", /RunPod|GPU|worker|container|HTTP|stack|error/i);
  const hook = read("src/features/docent/useVoice.ts");
  assert.match(hook, /utterance\.onerror = \(\) => \{[\s\S]{0,200}type: "FAILED"/);
});

test("H. 동시·반복 예열은 진행 promise 와 최근 성공 결과를 재사용한다", async () => {
  resetVoiceWarmClientForTests();
  let calls = 0;
  let release!: (response: Response) => void;
  const pending = new Promise<Response>((resolve) => { release = resolve; });
  const fetcher = (async () => {
    calls += 1;
    return pending;
  }) as typeof fetch;
  const now = () => 10_000;

  const first = requestVoiceWarm(undefined, fetcher, now);
  const second = requestVoiceWarm(undefined, fetcher, now);
  assert.strictEqual(second, first);
  assert.equal(calls, 1);
  release(new Response("{}", { status: 202 }));
  assert.equal(await first, true);
  assert.equal(await requestVoiceWarm(undefined, fetcher, now), true);
  assert.equal(calls, 1);
});

test("H2. 한 번 켠 음성은 라우트·리렌더·답변 완료에도 prepare 를 한 번만 발행한다", () => {
  const hook = read("src/features/docent/useVoice.ts");
  assert.match(hook, /const prepareIssuedRef = useRef\(false\)/);
  assert.match(hook, /if \(!warmRequested && !prepareIssuedRef\.current\)/);
  assert.match(hook, /prepareIssuedRef\.current = true;\s*const requested = await requestVoiceWarm/);
  assert.match(hook, /if \(next\) \{\s*prepareIssuedRef\.current = false/);
});

test("I. OFF 는 폴링 타이머·요청을 정리하고 상태를 OFF 로 되돌린다", () => {
  const hook = read("src/features/docent/useVoice.ts");
  const cleanup = hook.slice(hook.indexOf("const cancelWarmCycle"), hook.indexOf("const ensureReady"));
  assert.match(cleanup, /warmAbortRef\.current\?\.abort\(\)/);
  assert.match(cleanup, /clearTimeout\(pollTimerRef\.current\)/);
  assert.match(hook, /cancelWarmCycle\(\);\s*dispatchLifecycle\(\{ type: "DISABLE" \}\)/);

  const enabled = voiceLifecycleReducer(initialVoiceLifecycleState, { type: "ENABLE", now: 0 });
  assert.deepEqual(voiceLifecycleReducer(enabled, { type: "DISABLE" }), initialVoiceLifecycleState);
});

test("J. TTS 정화기 회귀: 거부 기호는 발화 문자열에 남지 않는다", () => {
  const result = sanitizeForTts("정확도 ≥ 0.98 ▲");
  assert.equal(result.text.includes("≥"), false);
  assert.equal(result.text.includes("▲"), false);
  assert.match(result.text, /이상/);
});
