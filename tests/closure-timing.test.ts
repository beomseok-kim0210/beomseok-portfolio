// 양순음 게이트의 렌더 타이밍 보정 (Phase 3A → 4D 운영값 MOUTH_TIMING).
//
// 정렬 채널 선행과 닫힘 전용 빠른 응답(게이트 보정분만 따로 감쇠). 둘 다 정렬 채널이 있을
// 때만 효과가 있고, 정렬 없는 LAM 전용 경로는 λ=18 한 갈래와 같아야 한다.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { MathUtils } from "three";

import {
  BASE_MOUTH_LAMBDA,
  MOUTH_TIMING,
  createMouthDampState,
  dampMouth,
  fuseWithGateCorrection,
  type ClosureTimingPolicy,
} from "@/lib/docent/closureTiming";
import { fuseLamMouth, type LamMouthChannels } from "@/lib/docent/lamMouthFusion";
import { sampleTimeline, type VoiceTimelineFrame } from "@/lib/docent/voiceTimeline";
import { runSegmentQueue } from "@/features/docent/voiceQueue";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8");
const NAMES = ["jawOpen", "mouthRound", "mouthStretch", "jawOpenCorrective", "mouthShrugUpper", "mouthLowerDownLeft", "mouthLowerDownRight"] as const;

const lam = (t: number, gate?: number): VoiceTimelineFrame => ({
  t, jaw: 0.08, round: 0.05, stretch: 0.01, upperLift: 0.2,
  close: 0.05, press: 0.02, roll: 0.02, funnel: 0.01, lowerDownLeft: 0.5, lowerDownRight: 0.5,
  ...(gate === undefined ? {} : { bilabialGate: gate }),
});
/** 30 fps, 프레임 peak 에서만 게이트 1 */
const policy = (p: Partial<ClosureTimingPolicy>): ClosureTimingPolicy => ({ gateAdvanceSeconds: 0, closeLambda: BASE_MOUTH_LAMBDA, releaseLambda: BASE_MOUTH_LAMBDA, ...p });
const SINGLE_LAMBDA = policy({});
const timeline = (n: number, peak: number | null) => Array.from({ length: n }, (_, i) => lam(i / 30, peak === null ? undefined : i === peak ? 1 : 0));

/* ---------------------------------------------------------------- 선행 */

test("선행 0 은 Phase 2E 와 같은 값을 읽는다", () => {
  const f = timeline(20, 8);
  for (const t of [0, 0.1, 0.25, 0.27, 0.5]) assert.deepEqual(sampleTimeline(f, 30, t, 0), sampleTimeline(f, 30, t));
});

test("선행은 게이트만 t + advance 에서 읽고, LAM 채널은 t 에서 읽는다", () => {
  const f = timeline(20, 8); // 게이트 봉우리 = 8/30 s
  const t = 8 / 30 - 0.03;
  const s = sampleTimeline(f, 30, t, 0.03)!;
  assert.ok(Math.abs(s.bilabialGate! - 1) < 1e-9);
  const plain = sampleTimeline(f, 30, t)!;
  for (const k of ["jaw", "round", "stretch", "upperLift", "close", "press", "roll", "funnel", "lowerDownLeft", "lowerDownRight"] as const) {
    assert.equal(s[k], plain[k], k);
  }
  assert.ok(plain.bilabialGate! < 1);
});

test("선행이 타임라인 끝을 넘으면 게이트는 0 — 밖을 읽지 않는다", () => {
  const f = timeline(10, 9);
  const s = sampleTimeline(f, 30, 8.5 / 30, 0.05)!;
  assert.equal(s.bilabialGate, 0);
  assert.equal(sampleTimeline(f, 30, 20 / 30, 0.05), null); // 타임라인 밖은 여전히 null
});

test("게이트 없는 타임라인은 선행이 있어도 이전과 같다", () => {
  const f = timeline(10, null);
  for (const t of [0, 0.1, 0.2]) {
    const s = sampleTimeline(f, 30, t, 0.04)!;
    assert.equal(s.bilabialGate, undefined);
    assert.deepEqual(fuseWithGateCorrection(s), fuseLamMouth(sampleTimeline(f, 30, t)!));
  }
});

/* ---------------------------------------------------------- 감쇠 두 갈래 */

function runDamp(targets: (ReturnType<typeof fuseWithGateCorrection> | null)[], pol: ClosureTimingPolicy = SINGLE_LAMBDA, dt = 1 / 120) {
  const st = createMouthDampState();
  return targets.map((tg) => dampMouth(st, NAMES, tg, dt, pol));
}

test("닫힘·풀림 λ 가 같으면 두 갈래 감쇠는 예전 한 갈래 λ=18 감쇠와 같다", () => {
  const seq = [...Array.from({ length: 30 }, (_, i) => fuseWithGateCorrection({ ...lam(0), bilabialGate: i > 10 && i < 20 ? 1 : 0 })), null, null];
  const got = runDamp(seq);
  const old: Record<string, number> = Object.fromEntries(NAMES.map((n) => [n, 0]));
  seq.forEach((tg, i) => {
    for (const n of NAMES) {
      old[n] = MathUtils.damp(old[n], (tg as Record<string, number> | null)?.[n] ?? 0, BASE_MOUTH_LAMBDA, 1 / 120);
      assert.ok(Math.abs(got[i][n] - Math.max(old[n], 0)) < 1e-12, `${i} ${n}`);
    }
  });
});

test("운영 정책(닫힘 36)은 게이트 보정분에만 작용한다 — 게이트가 없는 LAM 전용 경로는 λ=18 한 갈래와 같다", () => {
  assert.deepEqual(MOUTH_TIMING, { gateAdvanceSeconds: 0.03, closeLambda: 36, releaseLambda: 18 });
  const seq = Array.from({ length: 40 }, (_, i) => fuseWithGateCorrection(lam(i / 30)));
  const fast = runDamp(seq, MOUTH_TIMING);
  const base = runDamp(seq);
  assert.deepEqual(fast, base);
});

test("빠른 닫힘은 게이트 구간에서 입술을 더 빨리 닫고, 풀림은 release λ 를 따른다", () => {
  const on = fuseWithGateCorrection({ ...lam(0), bilabialGate: 1 });
  const off = fuseWithGateCorrection({ ...lam(0), bilabialGate: 0 });
  // 게이트 0 으로 충분히 열린 뒤 → 게이트 1 여섯 틱 → 게이트 0 여섯 틱
  const seq = [...Array.from({ length: 60 }, () => off), ...Array.from({ length: 6 }, () => on), ...Array.from({ length: 6 }, () => off)];
  const base = runDamp(seq);
  const asym = runDamp(seq, policy({ closeLambda: 60, releaseLambda: 18 }));
  const sym = runDamp(seq, policy({ closeLambda: 60, releaseLambda: 60 }));
  assert.deepEqual(asym[59], base[59]); // 게이트가 없던 동안은 같다
  // 닫히는 동안: 빠른 쪽이 아랫입술을 더 많이 눌렀다
  assert.ok(asym[65].mouthLowerDownLeft < base[65].mouthLowerDownLeft);
  // 풀리는 동안: 비대칭은 풀림 λ 가 기본과 같아 대칭보다 천천히 열린다
  assert.ok(sym[71].mouthLowerDownLeft > asym[71].mouthLowerDownLeft);
});

test("게이트 보정분은 턱·원순·벌림 가운데 게이트가 바꾸는 것만 담는다 — 원순은 바뀌지 않는다", () => {
  const t = fuseWithGateCorrection({ ...lam(0), bilabialGate: 1 });
  assert.ok(t.gateCorrection);
  assert.equal(t.gateCorrection!.mouthRound, undefined);
  for (const v of Object.values(t.gateCorrection!)) assert.ok(v! <= 0); // 보정은 닫는 쪽뿐
  // 합은 게이트 경로의 융합과 같다
  const pose = fuseLamMouth({ ...lam(0), bilabialGate: 1 });
  for (const n of NAMES) assert.equal(t[n], pose[n]);
});

test("세그먼트 경계·취소·마이크: 타이밍 상태는 값뿐이고 null 목표에서 기본 감쇠로 돌아간다", () => {
  const on = fuseWithGateCorrection({ ...lam(0), bilabialGate: 1 });
  const st = createMouthDampState();
  const pol = MOUTH_TIMING;
  for (let i = 0; i < 10; i++) dampMouth(st, NAMES, on, 1 / 120, pol);
  // 취소/마이크 → setMouth(null) → 목표 없음. 보정분은 release λ(18) 로만 풀린다(튀지 않는다)
  const before = { ...st.corr };
  dampMouth(st, NAMES, null, 1 / 120, pol);
  for (const n of NAMES) {
    const expected = MathUtils.damp(before[n] ?? 0, 0, 18, 1 / 120);
    assert.ok(Math.abs((st.corr[n] ?? 0) - expected) < 1e-12, n);
  }
  // 새 세그먼트의 게이트 없는 목표는 이전 세그먼트의 게이트를 다시 적용하지 않는다
  const plain = fuseWithGateCorrection(lam(0));
  assert.equal(plain.gateCorrection, undefined);
  // 훅과 런타임은 타이밍 상태를 따로 쥐지 않는다 — 정책은 불변, 상태는 DocentHead 의 감쇠 값뿐
  const hook = read("src/features/docent/useSupertonicVoice.ts");
  assert.doesNotMatch(hook, /useState\(\(\) => resolve|ddClosureTiming|location\.search/);
  assert.match(hook, /abortRef\.current\?\.abort\(\);/);
  assert.match(hook, /setMouth\(null\); \/\/ 입은 중립으로 돌아간다/);
  assert.match(read("src/features/docent/DocentRuntime.tsx"), /if \(!listening\) return;[\s\S]{0,120}stopSupertonic\(\);/);
});

test("세그먼트마다 자기 타임라인의 게이트만 선행해서 읽는다 — 다음 세그먼트를 읽지 않는다", async () => {
  const seg0 = timeline(10, 9); // 끝 프레임에 게이트
  const seg1 = timeline(10, 0); // 첫 프레임에 게이트
  const seen: number[][] = [];
  await runSegmentQueue<VoiceTimelineFrame[]>({
    count: 2, signal: new AbortController().signal,
    fetchSegment: async (i) => (i === 0 ? seg0 : seg1),
    playSegment: async (frames, _i, _s, started) => {
      started();
      seen.push([8.8, 9.2].map((x) => sampleTimeline(frames, 30, x / 30, 0.06)?.bilabialGate ?? -1));
    },
  });
  // 세그먼트 0 의 끝에서 선행이 세그먼트 1 의 첫 게이트를 읽지 않는다(끝 너머는 0)
  assert.ok(seen[0].every((g) => g === 0 || g === -1));
});

test("타이밍은 상수 하나다 — URL 쿼리나 개발 스위치로 바뀌지 않는다", () => {
  for (const f of ["src/features/docent/useSupertonicVoice.ts", "src/features/docent/DocentHead.tsx", "src/lib/docent/closureTiming.ts"]) {
    assert.doesNotMatch(read(f), /ddClosureTiming|resolveClosureTiming|ddAvatar=|get\("ddAvatar"\)/, f);
  }
  assert.match(read("src/features/docent/DocentHead.tsx"), /dampMouth\(dampState\.current, MOUTH_ACTUATORS, pose as MouthTarget, delta, MOUTH_TIMING\)/);
  assert.ok(Object.isFrozen(MOUTH_TIMING));
});

test("NaN·Infinity 가 섞여도 렌더 가중치는 유한하다", () => {
  const raw: LamMouthChannels = { ...lam(0), bilabialGate: Number.NaN, jaw: Number.POSITIVE_INFINITY };
  const out = runDamp([fuseWithGateCorrection(raw), fuseWithGateCorrection({ ...lam(0), bilabialGate: 1 })], policy({ closeLambda: 48 }));
  for (const o of out) for (const v of Object.values(o)) assert.ok(Number.isFinite(v));
});

test("정본 오디오 동일성: 타이밍 보정은 오디오·프레임·합성 경로를 건드리지 않는다", () => {
  const hook = read("src/features/docent/useSupertonicVoice.ts");
  assert.match(hook, /sampleTimeline\(frames, fps, a\.currentTime \+ lead, MOUTH_TIMING\.gateAdvanceSeconds\)/); // 시계는 여전히 오디오
  assert.doesNotMatch(read("src/lib/docent/closureTiming.ts"), /fetch\(|playbackRate|currentTime =/);
  assert.match(read("src/lib/docent/voiceProvider.ts"), /if \(tts\.synthesis_count !== 1\)/);
});
