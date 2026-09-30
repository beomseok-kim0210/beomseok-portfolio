// Phase 2E — 같은 합성의 양순음 게이트 (실험).
//
// 워커는 파형을 만든 바로 그 추론의 cross-attention 에서 30 fps 게이트를 만들고,
// 서버는 그것을 LAM 프레임에 싣기만 한다. 게이트가 없거나 이상하면 싣지 않고,
// 그러면 융합은 게이트 이전과 같다.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { attachBilabialGate } from "@/lib/docent/bilabialGate";
import { LAM_FUSION, fuseLamMouth, lamClosure, type LamMouthChannels } from "@/lib/docent/lamMouthFusion";
import { sampleTimeline, type VoiceTimelineFrame } from "@/lib/docent/voiceTimeline";
import { runSegmentQueue } from "@/features/docent/voiceQueue";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8");

// 양순음처럼 LAM 이 닫힘과 아랫입술 내림을 동시에 내는 프레임
const lam = (t: number): VoiceTimelineFrame => ({
  t, jaw: 0.08, round: 0.05, stretch: 0.01, upperLift: 0.2,
  close: 0.05, press: 0.02, roll: 0.02, funnel: 0.01, lowerDownLeft: 0.5, lowerDownRight: 0.5,
});
const timeline = (n: number) => Array.from({ length: n }, (_, i) => lam(i / 30));
const gateWithPeakAt = (n: number, at: number) => Array.from({ length: n }, (_, i) => (i === at ? 1 : 0));

/* ---------------------------------------------------------------- attach */

test("게이트가 없으면 프레임을 그대로 돌려준다 — 융합은 이전과 같다", () => {
  const frames = timeline(10);
  const r = attachBilabialGate(frames, undefined, undefined, 30);
  assert.equal(r.attached, false);
  assert.equal(r.frames, frames);
  const s = sampleTimeline(r.frames, 30, 0.1)!;
  assert.equal(s.bilabialGate, undefined);
  assert.deepEqual(fuseLamMouth(s), fuseLamMouth(sampleTimeline(timeline(10), 30, 0.1)!));
});

test("게이트 길이가 타임라인과 맞으면 프레임마다 인덱스로 실린다", () => {
  const frames = timeline(12);
  const gate = gateWithPeakAt(12, 5);
  const r = attachBilabialGate(frames, gate, 30, 30);
  assert.equal(r.attached, true);
  assert.equal(r.frames.length, frames.length);
  assert.deepEqual(r.frames.map((f) => (f as { bilabialGate?: number }).bilabialGate), gate);
  // 원본 프레임은 건드리지 않는다(공유 상태 없음)
  assert.equal((frames[5] as { bilabialGate?: number }).bilabialGate, undefined);
});

test("게이트가 조금(≤2 프레임) 짧으면 끝을 0 으로 채우고, 많이 어긋나면 싣지 않는다", () => {
  const ok = attachBilabialGate(timeline(12), gateWithPeakAt(10, 3), 30, 30);
  assert.equal(ok.attached, true);
  assert.equal((ok.frames[11] as { bilabialGate?: number }).bilabialGate, 0);
  const bad = attachBilabialGate(timeline(12), gateWithPeakAt(9, 3), 30, 30);
  assert.equal(bad.attached, false);
});

test("이상한 게이트는 조용히 버린다 — NaN·Infinity·범위 밖·배열 아님·빈 배열·fps 불일치", () => {
  const f = timeline(4);
  for (const [g, fps] of [
    [[0, Number.NaN, 0, 0], 30], [[0, Number.POSITIVE_INFINITY, 0, 0], 30], [[0, 1.5, 0, 0], 30], [[0, -0.1, 0, 0], 30],
    ["0,1,0", 30], [[], 30], [{ 0: 1 }, 30], [[0, 1, 0, 0], 25], [[0, 1, 0, 0], undefined],
  ] as const) {
    const r = attachBilabialGate(f, g, fps, 30);
    assert.equal(r.attached, false, JSON.stringify(g));
    assert.equal(r.frames, f);
  }
});

/* ------------------------------------------------------------- fusion */

test("게이트는 자기 창에서만 아랫입술을 누르고, 창 밖에서는 아랫입술이 자유롭다", () => {
  const r = attachBilabialGate(timeline(30), gateWithPeakAt(30, 15), 30, 30);
  assert.equal(r.attached, true);
  const inside = fuseLamMouth(sampleTimeline(r.frames, 30, 15 / 30)!);
  const outside = fuseLamMouth(sampleTimeline(r.frames, 30, 5 / 30)!);
  const noGate = fuseLamMouth(sampleTimeline(timeline(30), 30, 5 / 30)!);
  assert.equal(inside.mouthLowerDownLeft, 0);
  assert.ok(outside.mouthLowerDownLeft > 0);
  // 게이트 밖에서는 LAM 닫힘이 아랫입술을 누르지 않는다 → 게이트 없는 경로보다 열린다
  assert.ok(lamClosure(lam(0)) > 0);
  assert.ok(outside.mouthLowerDownLeft > noGate.mouthLowerDownLeft);
  // 게이트 밖의 턱·윗입술·원순·벌림은 게이트 없는 경로와 같다
  for (const k of ["jawOpen", "mouthShrugUpper", "mouthRound", "mouthStretch", "jawOpenCorrective"] as const) {
    assert.equal(outside[k], noGate[k], k);
  }
});

test("닫힘 보강은 min(1, LAM 닫힘 + 게이트 × gateClosureBoost) 만큼이다", () => {
  const raw: LamMouthChannels = lam(0);
  const base = lamClosure(raw);
  for (const g of [0, 0.25, 0.5, 1]) {
    const withGate = fuseLamMouth({ ...raw, bilabialGate: g });
    const expected = Math.min(1, base + g * LAM_FUSION.gateClosureBoost);
    // 턱: jaw × (1 − closure × jawClosureSuppression) 에서 closure 를 역산
    const noClosureJaw = fuseLamMouth({ ...raw, close: 0, press: 0, roll: 0, bilabialGate: 0 }).jawOpen;
    const implied = (1 - withGate.jawOpen / noClosureJaw) / LAM_FUSION.jawClosureSuppression;
    assert.ok(Math.abs(implied - expected) < 1e-9, `g=${g} implied ${implied} expected ${expected}`);
  }
});

test("게이트 값에 NaN 이 섞여 들어와도 융합 결과는 유한하다", () => {
  for (const g of [Number.NaN, Number.POSITIVE_INFINITY, -5, 9]) {
    const p = fuseLamMouth({ ...lam(0), bilabialGate: g });
    for (const v of Object.values(p)) assert.ok(Number.isFinite(v));
  }
});

/* ------------------------------------------------------------ segments */

type Seg = { id: number; frames: VoiceTimelineFrame[] };
const segPayload = (id: number, peak: number): Seg => ({
  id,
  frames: attachBilabialGate(timeline(20), gateWithPeakAt(20, peak), 30, 30).frames,
});
const gateOf = (p: Seg) => p.frames.map((f) => f.bilabialGate ?? -1);

test("세그먼트마다 자기 게이트만 재생된다 — 세그먼트 사이로 새지 않는다", async () => {
  const payloads = [segPayload(0, 3), segPayload(1, 11), segPayload(2, 17)];
  const played: { index: number; gate: number[] }[] = [];
  const outcome = await runSegmentQueue<Seg>({
    count: 3,
    signal: new AbortController().signal,
    fetchSegment: async (i) => payloads[i],
    playSegment: async (p, index, _s, started) => { started(); played.push({ index, gate: gateOf(p) }); },
  });
  assert.deepEqual(outcome, { status: "completed", segments: 3 });
  assert.deepEqual(played.map((p) => p.index), [0, 1, 2]);
  played.forEach((p, i) => assert.deepEqual(p.gate, gateOf(payloads[i])));
  assert.notDeepEqual(played[0].gate, played[1].gate);
});

test("새 답변(취소)이 오면 남은 세그먼트의 게이트는 재생되지 않는다", async () => {
  const controller = new AbortController();
  const played: number[] = [];
  const outcome = await runSegmentQueue<Seg>({
    count: 3,
    signal: controller.signal,
    fetchSegment: async (i) => segPayload(i, 5),
    playSegment: async (p, index, _s, started) => {
      started(); played.push(index);
      if (index === 0) controller.abort(); // 재생 중 취소
    },
  });
  assert.deepEqual(outcome, { status: "cancelled" });
  assert.deepEqual(played, [0]);
});

test("게이트는 페이로드 프레임에만 산다 — 훅·런타임에 따로 쥔 게이트 상태가 없다", () => {
  // 취소·마이크 끼어들기는 기존 stop() 이 페이로드와 rAF 를 버리는 것으로 끝난다.
  for (const f of ["src/features/docent/useSupertonicVoice.ts", "src/features/docent/DocentRuntime.tsx"]) {
    assert.doesNotMatch(read(f), /bilabialGate/, f);
  }
  const runtime = read("src/features/docent/DocentRuntime.tsx");
  assert.match(runtime, /if \(!listening\) return;[\s\S]{0,120}stopSupertonic\(\);/);
  const hook = read("src/features/docent/useSupertonicVoice.ts");
  assert.match(hook, /abortRef\.current\?\.abort\(\);/);
  assert.match(hook, /setMouth\(null\)/);
});

/* ------------------------------------------------------------- worker */

test("워커: 게이트 경로도 합성은 한 번, 정렬 실패는 음성을 실패시키지 않는다", () => {
  const w = read("voice/supertonic_worker.py");
  // 합성 호출은 둘 중 하나만 — 정렬이 켜져도 tts.synthesize 를 따로 부르지 않는다
  assert.match(w, /if aligner is not None:\s*\n\s*# ONE synthesis[^\n]*\n\s*wav, _dur, alignment, align_error = aligner\.synthesize\(text, \*\*kwargs\)\s*\n\s*else:\s*\n\s*wav, _dur = tts\.synthesize\(text, \*\*kwargs\)/);
  assert.match(w, /"synthesis_count": 1/);
  assert.match(w, /except Exception as exc:  # never block synthesis on the alignment/);
  const a = read("voice/supertonic_align.py");
  // 계측 세션이 실패하면 그 호출은 원본 세션으로 — 오디오는 잃지 않는다
  assert.match(a, /except Exception as exc:  # capture must never cost the audio[\s\S]{0,160}return self\._orig\.run/);
  // 원시 attention 은 워커 밖으로 나가지 않는다(서버 계약은 게이트와 양순 시각뿐)
  assert.match(w, /"bilabial_gate": alignment\["bilabial_gate"\]/);
  assert.doesNotMatch(w, /"_tokens"|"_token_times"|dump_raw/);
});

test("서버: 게이트는 LAM 프레임에 싣기만 한다 — 로컬과 RunPod 이 같은 함수 하나를 거친다", () => {
  const p = read("src/lib/docent/voiceProvider.ts");
  assert.match(p, /const gated = attachBilabialGate\(frames, alignment\.bilabialGate, alignment\.gateFps, lamFps\)\.frames;/);
  assert.equal(p.match(/attachBilabialGate\(/g)?.length, 1);
  assert.equal(p.match(/attachAlignedChannels\(/g)?.length, 2); // 로컬 1 + RunPod 1
  assert.match(p, /export function attachAlignedChannels<F extends object>\(/);
});
