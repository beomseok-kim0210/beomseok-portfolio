// 답변 스트리밍 → 음성 파이프라인. 답변 전체를 기다리지 않고, 완결된 문장부터 합성한다.
//
// 지키는 것: 아직 바뀔 수 있는 글은 읽지 않는다 · 너무 짧은 조각을 따로 합성하지 않는다 ·
// 순서가 바뀌지 않는다 · 같은 세그먼트를 두 번 합성하지 않는다 · 하나만 앞서 합성한다 ·
// 새 질문·마이크·음성 끄기에 끊긴다 · 브라우저 목소리로 내려가지 않는다.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { MIN_FIRST_SEGMENT_CHARS, StreamingSegmenter, stablePrefixLength } from "@/lib/docent/streamingSegments";
import { MAX_TTS_SEGMENT_CHARS, prepareSpokenText } from "@/lib/docent/ttsSegments";
import { runSegmentQueue } from "@/features/docent/voiceQueue";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (...p: string[]) => readFileSync(path.join(root, ...p), "utf8").replace(/\r\n/g, "\n");
const squash = (s: string) => s.replace(/\s+/g, "");

const ANSWER = "ARMI는 환자의 음성 요청을 AI Agent가 해석하는 병상 보조 로봇입니다. 사용자가 호출하면 로봇 미션과 간호사 호출로 이어집니다. 저는 LangGraph 기반 라우팅과 음성 입력 흐름을 맡았고, 역할별 화면도 설계했습니다. 실시간 알림은 WebSocket과 STOMP로 연결했습니다.";

/** 답변을 몇 글자씩 흘려보내며 확정되는 세그먼트를 모은다. */
function stream(answer: string, step: number) {
  const seg = new StreamingSegmenter();
  const out: Array<{ at: number; text: string }> = [];
  for (let i = step; i < answer.length; i += step) for (const t of seg.push(answer.slice(0, i))) out.push({ at: i, text: t });
  for (const t of seg.finish(answer)) out.push({ at: answer.length, text: t });
  return out;
}

test("아직 끝나지 않은 문장은 읽지 않는다 — 문장 끝 뒤 공백이 온 곳까지만 확정한다", () => {
  const seg = new StreamingSegmenter();
  assert.deepEqual(seg.push("ARMI는 환자의 음성 요청을"), []);
  assert.deepEqual(seg.push("ARMI는 환자의 음성 요청을 해석합니다."), []); // 마침표 뒤 공백이 아직 없다
  assert.equal(stablePrefixLength("정확도는 0.87"), 0); // 소수점은 문장 끝이 아니다
  const first = seg.push("ARMI는 환자의 음성 요청을 해석합니다. 사용");
  assert.deepEqual(first, ["ARMI는 환자의 음성 요청을 해석합니다."]);
  // 같은 글을 다시 내보내지 않는다
  assert.deepEqual(seg.push("ARMI는 환자의 음성 요청을 해석합니다. 사용자가"), []);
});

test("첫 완결 문장이 충분히 길면 바로 첫 세그먼트가 된다 — 답변 전체를 기다리지 않는다", () => {
  const out = stream(ANSWER, 4);
  const firstSentenceEnd = ANSWER.indexOf(". ") + 2;
  assert.ok(out[0].at <= firstSentenceEnd + 4, `첫 세그먼트가 ${out[0].at} 자에서야 나왔다 (첫 문장 끝 ${firstSentenceEnd})`);
  assert.ok(out[0].at < ANSWER.length);
  assert.ok(out.length >= 2);
});

test("너무 짧은 첫 문장은 혼자 합성하지 않고 다음 문장과 묶는다", () => {
  const out = stream("네. ARMI는 환자의 음성 요청을 해석하는 병상 보조 로봇입니다. 끝.", 3);
  assert.ok(Array.from("네.").length < MIN_FIRST_SEGMENT_CHARS);
  assert.notEqual(out[0].text, "네.");
  assert.ok(out[0].text.startsWith("네."));
});

test("확정된 세그먼트를 이어 붙이면 답변 전체와 같다 — 버리거나 두 번 읽는 글이 없다", () => {
  for (const step of [1, 3, 7, 50, 1000]) {
    const out = stream(ANSWER, step);
    assert.equal(squash(out.map((o) => o.text).join("")), squash(prepareSpokenText(ANSWER)), `step ${step}`);
    for (const o of out) assert.ok(Array.from(o.text).length <= MAX_TTS_SEGMENT_CHARS, `${o.text.length} 자`);
    assert.equal(new Set(out.map((o) => o.text)).size, out.length, `step ${step}: 중복 세그먼트`);
  }
  // 마크다운 강조는 음성에 실리지 않는다
  for (const o of stream("**ARMI**는 병상 보조 로봇입니다. **행가래**는 재활 게임입니다.", 2)) assert.doesNotMatch(o.text, /\*/);
});

test("세그먼트 수를 모르는 큐: 확정되는 대로 순서대로, 한 번씩, 하나만 앞서 합성한다", async () => {
  const segments: string[] = [];
  let ended = false;
  const waiters: Array<() => void> = [];
  const waitForSegment = (i: number) => new Promise<boolean>((resolve) => {
    const check = () => (i < segments.length ? resolve(true) : ended ? resolve(false) : waiters.push(check));
    check();
  });
  const release = () => { while (waiters.length) waiters.shift()!(); };

  const fetched: number[] = [];
  const played: string[] = [];
  let inflight = 0;
  let maxInflight = 0;
  const run = runSegmentQueue<string>({
    waitForSegment,
    signal: new AbortController().signal,
    fetchSegment: async (i) => {
      fetched.push(i);
      inflight += 1; maxInflight = Math.max(maxInflight, inflight);
      await new Promise((r) => setTimeout(r, 5));
      inflight -= 1;
      return segments[i];
    },
    playSegment: async (payload, _i, _s, started) => {
      started();
      await new Promise((r) => setTimeout(r, 15));
      played.push(payload);
    },
  });
  // LLM 이 세그먼트를 늦게 내놓는다
  segments.push("첫 문장입니다."); release();
  await new Promise((r) => setTimeout(r, 30));
  segments.push("둘째 문장입니다."); release();
  await new Promise((r) => setTimeout(r, 30));
  segments.push("셋째 문장입니다."); ended = true; release();
  const outcome = await run;
  assert.deepEqual(outcome, { status: "completed", segments: 3 });
  assert.deepEqual(played, ["첫 문장입니다.", "둘째 문장입니다.", "셋째 문장입니다."]);
  assert.deepEqual(fetched, [0, 1, 2]); // 같은 세그먼트를 두 번 합성하지 않는다
  assert.equal(maxInflight, 1); // 합성 요청은 동시에 하나
});

test("세그먼트를 기다리는 중에 끊기면 조용히 끝나고 더 합성하지 않는다", async () => {
  const controller = new AbortController();
  const fetched: number[] = [];
  const run = runSegmentQueue<string>({
    waitForSegment: (_i, signal) => new Promise<boolean>((resolve) => signal.addEventListener("abort", () => resolve(false), { once: true })),
    signal: controller.signal,
    fetchSegment: async (i) => { fetched.push(i); return "x"; },
    playSegment: async () => undefined,
  });
  controller.abort();
  assert.deepEqual(await run, { status: "cancelled" });
  assert.deepEqual(fetched, []);
});

test("읽을 글 없이 끝난 스트림은 아무 요청도 하지 않는다", async () => {
  const fetched: number[] = [];
  const outcome = await runSegmentQueue<string>({
    waitForSegment: async () => false,
    signal: new AbortController().signal,
    fetchSegment: async (i) => { fetched.push(i); return "x"; },
    playSegment: async () => undefined,
  });
  assert.deepEqual(outcome, { status: "completed", segments: 0 });
  assert.deepEqual(fetched, []);
});

test("런타임: 답변이 스트리밍되는 동안 스트림에 넘기고, 끝나면 닫는다 — 합성은 Supertonic 라우트뿐", () => {
  const runtime = read("src", "features", "docent", "DocentRuntime.tsx");
  assert.match(runtime, /if \(chat\.isStreaming\) \{\s*current\.stream\.update\(last\.content\);\s*\} else \{\s*current\.ended = true;\s*current\.stream\.end\(last\.content\);/);
  assert.doesNotMatch(runtime, /speechSynthesis|SpeechSynthesisUtterance/);
  const hook = read("src", "features", "docent", "useSupertonicVoice.ts");
  assert.match(hook, /const startStream = useCallback\(\(\): SpeechStream => \{/);
  assert.match(hook, /fetch\("\/api\/docent\/voice"/);
  assert.doesNotMatch(hook, /speechSynthesis/);
  // 스트리밍 중에는 세그먼트 수를 모른다 — 라우트는 index 만 온 요청도 받는다(텔레메트리)
  const route = read("src", "app", "api", "docent", "voice", "route.ts");
  assert.match(route, /const countOk = s\.count === undefined/);
});
