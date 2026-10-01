// Phase 1 — 음성 라우팅 신뢰성 / Supertonic 목소리 보존.
//
// 긴 답변이 413 → 브라우저 TTS(다른 사람 목소리)로 새던 회귀를 막는다:
//   · 세그먼트 분할과 원문 보존
//   · 거부 문자 정화
//   · 순서 있는 큐 — 선행 합성 1, 실패 시 정지, 취소
//   · 엔드포인트별 레이트리밋 버킷
//   · 자동 브라우저 TTS 폴백이 코드에 없음
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  MAX_SEGMENT_TEXT_LENGTH,
  MAX_SPOKEN_ANSWER_CHARS,
  MAX_TTS_SEGMENT_CHARS,
  planSpokenSegments,
  prepareSpokenText,
  segmentForTts,
  stripMarkdownForSpeech,
} from "@/lib/docent/ttsSegments";
import { sanitizeForTts } from "@/lib/docent/ttsText";
import { isSupertonicUnsupported } from "@/lib/docent/supertonicUnsupported";
import { MAX_PREFETCH_AHEAD, runSegmentQueue } from "@/features/docent/voiceQueue";
import { createRateLimiter } from "@/lib/docent/rateLimit";
import { docentConfig } from "@/data/docent";
import { DD_VOICE_ANSWERS } from "./fixtures/dd-voice-answers";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (...p: string[]) => readFileSync(path.join(root, ...p), "utf8").replace(/\r\n/g, "\n");

const compact = (s: string) => s.replace(/\s+/g, "");
const len = (s: string) => Array.from(s).length;

/** 보존 판정: 공백을 뺀 글자열이 같고, 어절마다 등장 횟수가 같다. */
function accountFor(normalized: string, segments: string[]) {
  const words = (s: string) => s.split(/\s+/).filter(Boolean);
  const count = (list: string[]) => list.reduce((m, w) => m.set(w, (m.get(w) ?? 0) + 1), new Map<string, number>());
  const source = count(words(normalized));
  const spoken = count(segments.flatMap(words));
  let dropped = 0;
  let duplicated = 0;
  for (const [word, n] of source) {
    const m = spoken.get(word) ?? 0;
    if (m < n) dropped += n - m;
    if (m > n) duplicated += m - n;
  }
  for (const [word, m] of spoken) if (!source.has(word)) duplicated += m;
  return { dropped, duplicated, sameText: compact(segments.join("")) === compact(normalized) };
}

/* ------------------------------------------------------------ 분할과 보존 */

for (const [name, answer] of Object.entries(DD_VOICE_ANSWERS)) {
  test(`세그먼트는 원문을 한 번씩 정확히 담는다 — ${name}`, () => {
    const normalized = prepareSpokenText(answer);
    const segments = segmentForTts(normalized);
    const { dropped, duplicated, sameText } = accountFor(normalized, segments);
    assert.equal(dropped, 0, "TEXT_DROP_COUNT");
    assert.equal(duplicated, 0, "TEXT_DUPLICATION_COUNT");
    assert.ok(sameText, "이어 붙이면 정규화 원문과 같아야 한다");
    for (const segment of segments) {
      assert.ok(len(segment) <= MAX_TTS_SEGMENT_CHARS, `${len(segment)} > ${MAX_TTS_SEGMENT_CHARS}`);
      assert.ok(len(segment) <= MAX_SEGMENT_TEXT_LENGTH);
      assert.equal(segment, segment.trim());
      assert.match(segment, /[\p{L}\p{N}]/u, "말할 글자가 없는 세그먼트는 합성이 거부한다");
    }
  });
}

test("회귀 B(267자)는 한 요청이 아니라 여러 세그먼트로 나간다", () => {
  const plan = planSpokenSegments(DD_VOICE_ANSWERS.B_regression267);
  assert.ok(plan);
  assert.ok(plan.segments.length >= 2);
});

test("600자를 넘는 답변도 음성으로 나간다 — 전체 길이와 세그먼트 길이는 다른 상한이다", () => {
  assert.ok(len(DD_VOICE_ANSWERS.E_over600) > 600);
  const plan = planSpokenSegments(DD_VOICE_ANSWERS.E_over600);
  assert.ok(plan, "600자 초과 답변이 거절되면 안 된다");
  assert.ok(plan.segments.every((s) => len(s) <= MAX_SEGMENT_TEXT_LENGTH));
});

test("답변 전체의 상한은 여전히 있다", () => {
  const huge = "가나다라마바사 아자차카. ".repeat(Math.ceil(MAX_SPOKEN_ANSWER_CHARS / 10));
  assert.equal(planSpokenSegments(huge), null);
});

test("세그먼트 상한은 실측 응답 크기에서 정한 140 자다", () => {
  assert.equal(MAX_TTS_SEGMENT_CHARS, 140);
  assert.ok(MAX_TTS_SEGMENT_CHARS < MAX_SEGMENT_TEXT_LENGTH, "라우트 상한이 클라이언트 상한보다 넉넉해야 한다");
  // 가장 느린 실측 발화율(숫자 위주 0.178 초/자)로도 라우트 상한이 응답 한도(약 34.9 초) 안쪽이다
  assert.ok(MAX_SEGMENT_TEXT_LENGTH * 0.178 < 34.9);
});

test("문장 경계를 먼저 쓴다", () => {
  const text = `${"가".repeat(100)}. ${"나".repeat(100)}. ${"다".repeat(50)}.`;
  assert.deepEqual(segmentForTts(text, 180), [`${"가".repeat(100)}.`, `${"나".repeat(100)}. ${"다".repeat(50)}.`]);
});

test("한국어·전각 문장부호와 줄바꿈도 문장 경계다", () => {
  const text = `${"가".repeat(120)}? ${"나".repeat(120)}！ ${"다".repeat(120)}\n${"라".repeat(30)}`;
  const segments = segmentForTts(text, 180);
  assert.equal(segments[0], `${"가".repeat(120)}?`);
  assert.equal(segments[1], `${"나".repeat(120)}！`);
  assert.equal(segments[2], `${"다".repeat(120)}\n${"라".repeat(30)}`);
});

test("소수점과 시각은 경계가 아니다", () => {
  const text = `mAP50 0.872 에서 0.988 로, 회의는 10:30 에 시작했어요. ${"가".repeat(170)}.`;
  const segments = segmentForTts(text);
  assert.equal(segments[0], "mAP50 0.872 에서 0.988 로, 회의는 10:30 에 시작했어요.");
});

test("긴 문장은 절 구두점에서, 없으면 공백에서 자르고 어절을 자르지 않는다", () => {
  const clauses = Array.from({ length: 6 }, (_, i) => `${i}번째 절은 조금 길게 이어지는 설명입니다 ${"라".repeat(30)}`).join(", ");
  for (const segment of segmentForTts(clauses)) assert.ok(len(segment) <= MAX_TTS_SEGMENT_CHARS);
  assert.match(segmentForTts(clauses)[0], /,$/, "절 경계에서 끊어야 한다");

  const noPunct = DD_VOICE_ANSWERS.F_longSentence;
  const words = new Set(noPunct.split(/\s+/));
  for (const segment of segmentForTts(noPunct)) {
    for (const word of segment.split(/\s+/)) assert.ok(words.has(word), `어절이 잘렸다: ${word}`);
  }
});

test("경계가 전혀 없는 덩어리만 글자 수로 자른다", () => {
  const blob = "가".repeat(400);
  const segments = segmentForTts(blob);
  assert.deepEqual(segments.map(len), [140, 140, 120]);
  assert.equal(segments.join(""), blob);
});

test("영문·숫자·괄호가 섞여도 보존된다", () => {
  const text = prepareSpokenText(
    "ARMI(Avatar Remote Medical Interface)는 2024년 3월에 시작했고, React 18과 Three.js r160, STOMP over WebSocket을 썼어요. 응답 시간은 p95 기준 120ms (목표 150ms) 였어요.",
  );
  const segments = segmentForTts(text, 60);
  const { dropped, duplicated, sameText } = accountFor(text, segments);
  assert.deepEqual({ dropped, duplicated, sameText }, { dropped: 0, duplicated: 0, sameText: true });
  assert.ok(text.includes("(Avatar Remote Medical Interface)"));
  assert.ok(text.includes("120ms (목표 150ms)"));
});

test("구두점만 남은 조각은 앞 세그먼트에 붙는다", () => {
  const segments = segmentForTts(`${"가".repeat(138)}. ……`, 140);
  assert.equal(segments.length, 1);
  assert.ok(segments[0].endsWith("……"));
});

test("마크다운 문법은 벗기고 글은 남긴다", () => {
  const md = "## 제목\n\n**굵게** 쓴 말과 `코드`, [링크 글](https://example.com) 입니다.\n- 첫째 항목\n1. 번호 항목\n> 인용문\n---\n| 열1 | 열2 |\n|---|---|\n| 값1 | 값2 |";
  const text = prepareSpokenText(md);
  for (const mark of ["#", "*", "`", "](", "https://", "> ", "---", "|"]) {
    assert.equal(text.includes(mark), false, `${mark} 가 남았다`);
  }
  for (const word of ["제목", "굵게", "코드", "링크 글", "첫째 항목", "번호 항목", "인용문", "열1", "값2"]) {
    assert.ok(text.includes(word), `${word} 가 사라졌다`);
  }
  // snake_case 는 단어 안의 밑줄이라 건드리지 않는다
  assert.equal(stripMarkdownForSpeech("snake_case 와 _강조_"), "snake_case 와 강조");
});

test("폭 없는 문자·이모지·NBSP 를 정리한다", () => {
  const text = prepareSpokenText("안녕​하세요﻿ 반가워요 😀 오늘　도⁠ 좋아요‍.");
  assert.equal(text, "안녕하세요 반가워요 오늘 도 좋아요.");
});

/* ------------------------------------------------------------ 정화 */

test("새로 확인한 거부 문자는 정화 뒤 남지 않는다", () => {
  // 2026-09-29 인덱서 실측: 표에 없던 거부 문자들
  const input = "〔주의〕 □ 확인 ▶ 다음 ► 끝 ­ 소프트‌하이픈‍ ⟨괄호⟩ „따옴표‟";
  const { text } = sanitizeForTts(input);
  for (const ch of Array.from(text)) {
    assert.equal(isSupertonicUnsupported(ch.codePointAt(0)!), false, `U+${ch.codePointAt(0)!.toString(16)} 가 남았다`);
  }
  assert.ok(text.includes("(주의)"), "괄호 안의 말은 남아야 한다");
  assert.ok(text.includes("(괄호)"));
  assert.ok(text.includes("확인") && text.includes("다음") && text.includes("끝"));
});

test("범위표는 오름차순이고 겹치지 않는다", async () => {
  const { SUPERTONIC_UNSUPPORTED_RANGES: ranges } = await import("@/lib/docent/supertonicUnsupported");
  for (let i = 0; i < ranges.length; i += 1) {
    assert.ok(ranges[i][0] <= ranges[i][1]);
    if (i > 0) assert.ok(ranges[i - 1][1] < ranges[i][0]);
  }
  // 한글·영문·숫자·줄바꿈은 절대 거부 대상이 아니다
  for (const ch of "가힣AZaz09\n .,?!") assert.equal(isSupertonicUnsupported(ch.codePointAt(0)!), false);
});

/* ------------------------------------------------------------ 큐 */

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

test("큐는 순서대로 재생하고, 동시에 합성하는 요청은 하나뿐이다", async () => {
  const log: string[] = [];
  let inFlight = 0;
  let maxInFlight = 0;
  let playing = 0;
  const outcome = await runSegmentQueue({
    count: 4,
    signal: new AbortController().signal,
    fetchSegment: async (i) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      log.push(`fetch:${i}`);
      await tick();
      inFlight -= 1;
      return i;
    },
    playSegment: async (p, i, _signal, started) => {
      assert.equal(p, i);
      playing += 1;
      assert.equal(playing, 1, "재생이 겹치면 안 된다");
      log.push(`play:${i}`);
      started();
      await tick();
      await tick();
      playing -= 1;
      log.push(`end:${i}`);
    },
  });
  assert.deepEqual(outcome, { status: "completed", segments: 4 });
  assert.equal(MAX_PREFETCH_AHEAD, 1);
  assert.equal(maxInFlight, 1);
  // 재생 순서
  assert.deepEqual(log.filter((l) => l.startsWith("play")), ["play:0", "play:1", "play:2", "play:3"]);
  // N 재생 중에 N+1 을 미리 합성한다 — N+2 는 N 이 끝나기 전에 시작하지 않는다
  assert.ok(log.indexOf("fetch:1") < log.indexOf("end:0"));
  assert.ok(log.indexOf("fetch:2") > log.indexOf("end:0"));
});

test("다음 세그먼트 합성은 지금 세그먼트가 소리를 내기 시작한 뒤에야 나간다", async () => {
  // 재생 시작 전에 합성을 던지면 로컬 백엔드에서 CPU 를 다퉈 play() → 소리가 5~6 초로 늘어났다
  const fetched: number[] = [];
  const startGate = deferred<void>();
  const run = runSegmentQueue({
    count: 2,
    signal: new AbortController().signal,
    fetchSegment: async (i) => { fetched.push(i); return i; },
    playSegment: async (_p, i, _signal, started) => {
      if (i === 0) {
        await startGate.promise; // 아직 소리가 나지 않았다
        started();
      }
    },
  });
  await tick();
  assert.deepEqual(fetched, [0], "재생 시작 전에는 다음 세그먼트를 요청하지 않는다");
  startGate.resolve();
  await run;
  assert.deepEqual(fetched, [0, 1]);
});

test("다음 세그먼트가 늦으면 기다린다 — 건너뛰지 않는다", async () => {
  const slow = deferred<number>();
  const played: number[] = [];
  const run = runSegmentQueue({
    count: 2,
    signal: new AbortController().signal,
    fetchSegment: (i) => (i === 1 ? slow.promise : Promise.resolve(i)),
    playSegment: async (_p, i) => { played.push(i); },
  });
  await tick();
  assert.deepEqual(played, [0]);
  slow.resolve(1);
  assert.deepEqual(await run, { status: "completed", segments: 2 });
  assert.deepEqual(played, [0, 1]);
});

test("세그먼트 하나가 실패하면 나머지는 합성도 재생도 하지 않는다", async () => {
  const fetched: number[] = [];
  const played: number[] = [];
  const outcome = await runSegmentQueue({
    count: 5,
    signal: new AbortController().signal,
    fetchSegment: async (i) => {
      fetched.push(i);
      if (i === 2) throw new Error("HTTP 502");
      return i;
    },
    playSegment: async (_p, i) => { played.push(i); },
  });
  assert.equal(outcome.status, "failed");
  assert.equal(outcome.status === "failed" && outcome.index, 2);
  assert.deepEqual(played, [0, 1]);
  assert.deepEqual(fetched, [0, 1, 2]);
});

test("재생 실패도 큐를 멈춘다", async () => {
  const played: number[] = [];
  const outcome = await runSegmentQueue({
    count: 3,
    signal: new AbortController().signal,
    fetchSegment: async (i) => i,
    playSegment: async (_p, i) => {
      played.push(i);
      if (i === 0) throw new Error("audio playback failed");
    },
  });
  assert.equal(outcome.status, "failed");
  assert.deepEqual(played, [0]);
});

test("취소하면 대기 중인 합성을 끊고 옛 답변은 다시 재생되지 않는다", async () => {
  const controller = new AbortController();
  const signals: AbortSignal[] = [];
  const played: string[] = [];
  const gate = deferred<void>();
  const old = runSegmentQueue({
    count: 3,
    signal: controller.signal,
    fetchSegment: async (i, signal) => { signals.push(signal); return `old-${i}`; },
    playSegment: async (p, _i, signal) => {
      played.push(p);
      await new Promise<void>((resolve, reject) => {
        signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        void gate.promise.then(resolve);
      });
    },
  });
  await tick();
  assert.deepEqual(played, ["old-0"]);

  // 새 답변이 시작된다 → 옛 발화 취소
  controller.abort();
  assert.deepEqual(await old, { status: "cancelled" });
  assert.ok(signals.every((s) => s.aborted), "대기 중인 합성 요청의 신호가 끊겨야 한다");

  const fresh = await runSegmentQueue({
    count: 2,
    signal: new AbortController().signal,
    fetchSegment: async (i) => `new-${i}`,
    playSegment: async (p) => { played.push(p); },
  });
  gate.resolve(); // 옛 재생 약속이 뒤늦게 풀려도
  await tick();
  assert.deepEqual(fresh, { status: "completed", segments: 2 });
  assert.deepEqual(played, ["old-0", "new-0", "new-1"], "옛 답변의 세그먼트가 다시 나오면 안 된다");
});

test("시작 전에 이미 취소된 큐는 아무것도 요청하지 않는다", async () => {
  const controller = new AbortController();
  controller.abort();
  let fetched = 0;
  const outcome = await runSegmentQueue({
    count: 3,
    signal: controller.signal,
    fetchSegment: async (i) => { fetched += 1; return i; },
    playSegment: async () => undefined,
  });
  assert.deepEqual(outcome, { status: "cancelled" });
  assert.equal(fetched, 0);
});

/* ------------------------------------------------------------ 레이트리밋 */

test("채팅·음성·예열은 서로 다른 버킷이다", () => {
  const chat = createRateLimiter(docentConfig.rateLimit);
  const voice = createRateLimiter(docentConfig.voiceRateLimit);
  const warm = createRateLimiter(docentConfig.warmRateLimit);
  for (let i = 0; i < docentConfig.rateLimit.maxRequests; i += 1) assert.ok(chat("ip").ok);
  assert.equal(chat("ip").ok, false, "채팅 한도는 그대로여야 한다");
  assert.ok(voice("ip").ok, "채팅을 다 써도 음성은 막히지 않는다");
  assert.ok(warm("ip").ok);
});

test("채팅 한도는 약해지지 않았다", () => {
  assert.deepEqual(docentConfig.rateLimit, { windowMs: 60_000, maxRequests: 10 });
});

test("평범한 세 턴(300~500자 답변)은 429 에 걸리지 않는다", () => {
  const chat = createRateLimiter(docentConfig.rateLimit);
  const voice = createRateLimiter(docentConfig.voiceRateLimit);
  const warm = createRateLimiter(docentConfig.warmRateLimit);
  const answers = [DD_VOICE_ANSWERS.C_about300, DD_VOICE_ANSWERS.D_about500, DD_VOICE_ANSWERS.E_over600];
  let falseLimits = 0;
  for (const answer of answers) {
    if (!chat("ip").ok) falseLimits += 1;
    if (!warm("ip").ok) falseLimits += 1;
    for (let s = 0; s < planSpokenSegments(answer)!.segments.length; s += 1) {
      if (!voice("ip").ok) falseLimits += 1;
    }
  }
  assert.equal(falseLimits, 0, "FALSE_429_COUNT");
});

test("음성 라우트와 예열 라우트는 각자의 버킷을 쓴다", () => {
  const route = read("src", "app", "api", "docent", "voice", "route.ts");
  const warmRoute = read("src", "app", "api", "docent", "voice", "warm", "route.ts");
  const chatRoute = read("src", "app", "api", "docent", "chat", "route.ts");
  assert.match(route, /checkVoiceRateLimit\(voiceClientKey\(request\.headers\)\)/);
  assert.match(warmRoute, /checkWarmRateLimit\(clientKey\(request\.headers\)\)/);
  assert.match(chatRoute, /checkRateLimit\(clientIpFrom\(request\.headers\)\)/);
});

test("라우트는 답변 전체가 아니라 세그먼트 길이를 검사한다", () => {
  const route = read("src", "app", "api", "docent", "voice", "route.ts");
  assert.match(route, /text\.length > MAX_SEGMENT_TEXT_LENGTH/);
  assert.equal(/MAX_TEXT_LENGTH = 600/.test(route), false);
  // 응답 크기 방어선은 그대로 남아 있다
  assert.match(route, /encodedBytes \+ RESPONSE_HEADROOM_BYTES > MAX_RESPONSE_BYTES/);
});

/* ------------------------------------------------------------ 폴백 제거 */

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

test("프로덕션 소스 어디에도 브라우저 TTS 호출이 없다", () => {
  const offenders = walk(path.join(root, "src"))
    .filter((f) => /\.(ts|tsx)$/.test(f))
    .filter((f) => /speechSynthesis|SpeechSynthesisUtterance/.test(readFileSync(f, "utf8")));
  assert.deepEqual(offenders.map((f) => path.relative(root, f)), [], "BROWSER_TTS_AUTOMATIC_FALLBACK");
});

test("음성 응답은 브라우저 TTS 로 내려가라고 알리지 않는다", () => {
  for (const p of [
    ["src", "app", "api", "docent", "voice", "route.ts"],
    ["src", "app", "api", "docent", "voice", "health", "route.ts"],
  ]) {
    assert.equal(read(...p).includes("browser_tts"), false, p.join("/"));
  }
});

test("새 답변은 말하는 중인 앞 답변을 기다리지 않고 교체한다", () => {
  const runtime = read("src", "features", "docent", "DocentRuntime.tsx");
  assert.match(
    runtime,
    /lifecycle === "VOICE_READY"\s*\|\| lifecycle === "VOICE_SPEAKING"\s*\|\| lifecycle === "VOICE_SYNTHESIZING"\s*\)\s*\{\s*current = openStream\(index\)/,
  );
  // 교체 순간 READY 로 잘못 돌아가지 않는다
  assert.match(runtime, /if \(!supertonicPreparing\) finishSpeaking\(\)/);
  // 읽을 글자가 없는 답변이 합성 중 상태에 갇히지 않는다
  assert.match(runtime, /if \(outcome === "silent"\) voice\.finishSpeaking\(\)/);
});

test("Supertonic 실패는 다른 목소리로 이어지지 않는다", () => {
  const runtime = read("src", "features", "docent", "DocentRuntime.tsx");
  const open = runtime.slice(runtime.indexOf("const openStream"), runtime.indexOf("// 답변이 자랄 때마다"));
  assert.match(open, /const stream = startStream\(\);/);
  assert.match(runtime, /const \{ startStream \} = supertonic;/);
  assert.equal(/voice\.speak|browser/.test(open), false);
  assert.match(runtime, /lastEngine: "supertonic" \| "none"/);
});
