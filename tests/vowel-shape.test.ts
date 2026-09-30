// Phase 4A — 모음 모양 보조층(실험). 같은 합성의 모음 자모 시각으로 가로 벌림·원순을 LAM 위에
// 얹고, 모음 한가운데서 LAM 의 가짜 닫힘을 푼다(양순음 게이트 구간은 제외). 채널이 없으면 이전과 같다.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { LAM_FUSION, fuseLamMouth, lamClosure, type LamMouthChannels } from "@/lib/docent/lamMouthFusion";
import { VOWEL_CHANNEL_WEIGHTS, attachVowelChannels, buildVowelChannels, vowelEnvelope, vowelSupport, type VowelToken } from "@/lib/docent/vowelShape";
import { sampleTimeline, type VoiceTimelineFrame } from "@/lib/docent/voiceTimeline";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8");
const OFF = { ...LAM_FUSION, vowelStretchTarget: 0, vowelRoundTarget: 0, vowelUnroundSuppression: 0, vowelClosureRelease: 0 };
// ㅣ 처럼 턱이 거의 0 이고 입술 채널이 조금 있는 프레임 — 닫힘 비율이 치솟는다
const hiVowel: LamMouthChannels = { jaw: 0.01, round: 0.1, stretch: 0.02, upperLift: 0.1, close: 0.04, press: 0.03, roll: 0.03, funnel: 0.01, lowerDownLeft: 0.5, lowerDownRight: 0.5 };

test("모음 채널이 없으면 결과는 모음층 이전과 같다", () => {
  for (const raw of [hiVowel, { ...hiVowel, bilabialGate: 1 }, { ...hiVowel, bilabialGate: 0 }, { jaw: 0.2, round: 0.3, stretch: 0.05, upperLift: 0.3 }]) {
    assert.deepEqual(fuseLamMouth(raw), fuseLamMouth(raw, OFF));
  }
});

test("분류별 채널 가중치: ㅣ ㅡ 가로 1, ㅐ ㅔ 0.6, ㅗ ㅜ 원순 1, 이중모음 0.6, 평순은 오므림 누름", () => {
  assert.deepEqual(VOWEL_CHANNEL_WEIGHTS.spread, { spread: 1, round: 0, unround: 1 });
  assert.deepEqual(VOWEL_CHANNEL_WEIGHTS.spreadMid, { spread: 0.6, round: 0, unround: 1 });
  assert.deepEqual(VOWEL_CHANNEL_WEIGHTS.open, { spread: 0, round: 0, unround: 1 });
  assert.deepEqual(VOWEL_CHANNEL_WEIGHTS.round, { spread: 0, round: 1, unround: 0 });
  assert.deepEqual(VOWEL_CHANNEL_WEIGHTS.roundGlide, { spread: 0, round: 0.6, unround: 0 });
  const w = read("voice/supertonic_align.py");
  assert.match(w, /\*\*\{chr\(c\): "spread" for c in \(0x1175, 0x1173, 0x1174\)\}/);
  assert.match(w, /\*\*\{chr\(c\): "round" for c in \(0x1169, 0x116D, 0x116E, 0x1172\)\}/);
  assert.match(w, /"vowels": vowel_tokens\(tokens, times\)/);
});

test("지지 구간은 앞/뒤 자모와의 중점, 없거나 이상하면 ±60 ms, 양끝 40 ms 램프로 0~1 연속", () => {
  const v: VowelToken = { t: 0.5, cls: "spread", prev: 0.44, next: 0.6 };
  assert.deepEqual(vowelSupport(v).map((x) => +x.toFixed(6)), [0.47, 0.55]);
  assert.deepEqual(vowelSupport({ t: 0.5, cls: "spread", prev: null, next: Number.NaN }).map((x) => +x.toFixed(6)), [0.44, 0.56]);
  assert.deepEqual(vowelSupport({ t: 0.5, cls: "spread", prev: 0.6, next: 0.4 }).map((x) => +x.toFixed(6)), [0.44, 0.56]);
  let prev = vowelEnvelope(v, 0.3);
  for (let t = 0.3; t <= 0.7; t += 0.001) { const e = vowelEnvelope(v, t); assert.ok(e >= 0 && e <= 1); assert.ok(Math.abs(e - prev) < 0.06, `jump at ${t}`); prev = e; }
  assert.equal(vowelEnvelope(v, 0.5), 1);
  assert.equal(vowelEnvelope(v, 0.3), 0);
});

test("채널 배열: 길이 ceil(길이×30)+1, 겹치면 최댓값, 이상한 토큰은 버림, NaN 없음", () => {
  const ch = buildVowelChannels([{ t: 0.2, cls: "spread" }, { t: 0.5, cls: "round" }, { t: Number.NaN, cls: "spread" }, { t: 0.7, cls: "bogus" }], 1);
  for (const a of Object.values(ch)) { assert.equal(a.length, 31); for (const x of a) assert.ok(Number.isFinite(x) && x >= 0 && x <= 1); }
  assert.equal(ch.vowelSpread[6], 1); // t = 0.2
  assert.equal(ch.vowelRound[15], 1); // t = 0.5
  assert.equal(ch.vowelSpread[21], 0); // bogus 는 버린다
  assert.deepEqual(buildVowelChannels([{ t: 0.2, cls: "spread" }], Number.NaN), { vowelSpread: [], vowelRound: [], vowelUnround: [], vowelOpen: [] });
});

test("가로 벌림·원순: max(LAM, 목표×채널), 평순 모음은 LAM 오므림을 누른다", () => {
  const spread = fuseLamMouth({ ...hiVowel, vowelSpread: 1, vowelUnround: 1, vowelRound: 0 });
  const none = fuseLamMouth(hiVowel);
  assert.ok(spread.mouthStretch > none.mouthStretch);
  assert.ok(spread.mouthRound < none.mouthRound);
  const round = fuseLamMouth({ ...hiVowel, vowelRound: 1, vowelSpread: 0, vowelUnround: 0 });
  assert.ok(round.mouthRound >= LAM_FUSION.vowelRoundTarget - 1e-12);
});

test("모음 한가운데서는 LAM 가짜 닫힘을 풀지만, 양순음 게이트가 켜진 곳에서는 풀지 않는다", () => {
  assert.ok(lamClosure(hiVowel) > 0.5);
  const inVowel = fuseLamMouth({ ...hiVowel, vowelUnround: 1, vowelSpread: 1, vowelRound: 0, bilabialGate: 0 });
  const noVowel = fuseLamMouth({ ...hiVowel, bilabialGate: 0 });
  assert.ok(inVowel.jawOpen > noVowel.jawOpen);
  // 게이트 1: 모음 채널이 있어도 닫힘은 모음층 이전과 같다(턱이 똑같이 눌린다)
  const gated = fuseLamMouth({ ...hiVowel, vowelUnround: 1, vowelSpread: 0, vowelRound: 0, bilabialGate: 1 });
  const gatedNoVowel = fuseLamMouth({ ...hiVowel, bilabialGate: 1 });
  assert.equal(gated.jawOpen, gatedNoVowel.jawOpen);
  assert.equal(gated.mouthLowerDownLeft, gatedNoVowel.mouthLowerDownLeft);
});

test("모음층은 아랫입술 내림 목표를 바꾸지 않는다(여는 양은 LAM·다음 단계 몫)", () => {
  const a = fuseLamMouth({ ...hiVowel, vowelUnround: 1, vowelSpread: 1, vowelRound: 0, bilabialGate: 0 });
  const b = fuseLamMouth({ ...hiVowel, bilabialGate: 0 });
  assert.equal(a.mouthLowerDownLeft, b.mouthLowerDownLeft);
  assert.equal(a.mouthShrugUpper >= 0, true);
});

test("모음 채널도 게이트처럼 30 ms 앞에서 읽고, LAM 채널은 t 에서 읽는다", () => {
  const ch = buildVowelChannels([{ t: 0.5, cls: "spread", prev: 0.45, next: 0.55 }], 1);
  const frames: VoiceTimelineFrame[] = ch.vowelSpread.map((_, i) => ({ t: i / 30, jaw: i / 100, round: 0, stretch: 0, upperLift: 0, vowelSpread: ch.vowelSpread[i], vowelRound: ch.vowelRound[i], vowelUnround: ch.vowelUnround[i] }));
  for (const t of [0.4, 0.45, 0.52]) {
    const a = sampleTimeline(frames, 30, t, 0.03)!, b = sampleTimeline(frames, 30, t + 0.03)!, c = sampleTimeline(frames, 30, t)!;
    assert.equal(a.vowelSpread, b.vowelSpread);
    assert.equal(a.jaw, c.jaw);
  }
});

test("서버: 모음 토큰이 없거나 이상하면 프레임을 그대로 둔다", () => {
  const f = Array.from({ length: 10 }, (_, i) => ({ t: i / 30 }));
  for (const bad of [undefined, null, [], "x", [{ t: "a", cls: "spread" }], [{ t: 0.1 }]]) assert.equal(attachVowelChannels(f, bad, 0.3, 30).frames, f);
  assert.equal(attachVowelChannels(f, [{ t: 0.1, cls: "spread" }], 0.3, 25).attached, false);
  const ok = attachVowelChannels(f, [{ t: 0.1, cls: "spread" }], 0.3, 30);
  assert.equal(ok.attached, true);
  assert.equal(ok.frames.length, f.length);
  assert.match(read("src/lib/docent/voiceProvider.ts"), /return attachVowelChannels\(gated, alignment\.vowels, durationSeconds, lamFps\)\.frames;/);
});

test("훅·런타임은 모음 상태를 따로 쥐지 않는다 — 취소·마이크 정리는 기존 그대로", () => {
  const hook = read("src/features/docent/useSupertonicVoice.ts");
  assert.doesNotMatch(hook, /vowel/i);
  assert.match(hook, /abortRef\.current\?\.abort\(\);/);
  assert.match(read("src/features/docent/DocentRuntime.tsx"), /if \(!listening\) return;[\s\S]{0,120}stopSupertonic\(\);/);
});

// Phase 4C — 모음별 열림
import { VOWEL_OPENNESS, vowelOpenSupport, vowelOpenness } from "@/lib/docent/vowelShape";
import { JAW_MAX } from "@/lib/docent/semanticMouth";

test("열림 표: ㅏ 1, ㅓ·ㅐ 중간, ㅗ > ㅜ, ㅣ·ㅡ 조금(이가 보일 만큼), 자모가 없으면 분류 기본값", () => {
  assert.equal(VOWEL_OPENNESS["ᅡ"], 1);
  assert.ok(VOWEL_OPENNESS["ᅥ"] < 1 && VOWEL_OPENNESS["ᅢ"] < 1);
  assert.ok(VOWEL_OPENNESS["ᅩ"] > VOWEL_OPENNESS["ᅮ"]);
  assert.ok(VOWEL_OPENNESS["ᅵ"] > 0 && VOWEL_OPENNESS["ᅵ"] <= 0.3);
  assert.equal(vowelOpenness({ t: 0, cls: "spread" }), 0.3);
  assert.equal(vowelOpenness({ t: 0, cls: "bogus" }), 0);
  assert.match(read("voice/supertonic_align.py"), /out\.append\(\{"t": round\(float\(t\), 4\), "cls": cls, "j": tokens\[i\],/);
});

test("열림 지지는 앞 자모 중심 ~ 뒤 자모 중심(둘러싼 자음 사이 전체)", () => {
  assert.deepEqual(vowelOpenSupport({ t: 0.5, cls: "open", prev: 0.44, next: 0.6 }), [0.44, 0.6]);
  assert.deepEqual(vowelOpenSupport({ t: 0.5, cls: "open", prev: null, next: 0.4 }).map((x) => +x.toFixed(6)), [0.44, 0.56]);
  const ch = buildVowelChannels([{ t: 0.5, cls: "open", j: "ᅡ", prev: 0.4, next: 0.62 }], 1);
  assert.equal(ch.vowelOpen[13], 1); // t 0.433 — 가로·원순 지지(중점 0.45) 밖이지만 열림은 켜져 있다
  assert.equal(ch.vowelUnround[13] < 1, true);
});

test("턱 = max(LAM 턱, JAW_MAX × 척도 × 열림) 뒤에 닫힘 억제; 열림 채널이 없으면 4A 와 같다", () => {
  const raw: LamMouthChannels = { jaw: 0.01, round: 0.02, stretch: 0.02, upperLift: 0.1, close: 0, press: 0, roll: 0, funnel: 0, lowerDownLeft: 0.4, lowerDownRight: 0.4, bilabialGate: 0 };
  const open = fuseLamMouth({ ...raw, vowelOpen: 1, vowelUnround: 1, vowelSpread: 0, vowelRound: 0 });
  assert.ok(Math.abs(open.jawOpen - JAW_MAX * LAM_FUSION.vowelOpenScale) < 1e-9);
  const noOpen = fuseLamMouth({ ...raw, vowelUnround: 1, vowelSpread: 0, vowelRound: 0 });
  const as4a = fuseLamMouth({ ...raw, vowelUnround: 1, vowelSpread: 0, vowelRound: 0 }, { ...LAM_FUSION, vowelOpenScale: 0, vowelOpenGateBoost: LAM_FUSION.gateClosureBoost });
  assert.deepEqual(noOpen, as4a);
});

test("열림이 있어도 양순음 게이트 정점에서는 턱이 닫힌다(보강 1.0)", () => {
  const raw: LamMouthChannels = { jaw: 0.01, round: 0.02, stretch: 0.02, upperLift: 0.1, close: 0, press: 0, roll: 0, funnel: 0, lowerDownLeft: 0.4, lowerDownRight: 0.4 };
  const gated = fuseLamMouth({ ...raw, vowelOpen: 1, vowelUnround: 1, vowelSpread: 0, vowelRound: 0, bilabialGate: 1 });
  assert.ok(gated.jawOpen <= JAW_MAX * LAM_FUSION.vowelOpenScale * (1 - LAM_FUSION.jawClosureSuppression) + 1e-9);
  assert.equal(gated.mouthLowerDownLeft, 0);
});

// Phase 4D — 열림 선행, w-이중모음 분할
import { VOWEL_OPEN_LEAD, W_DIPHTHONGS, GLIDE_ONSET_SHARE } from "@/lib/docent/vowelShape";

test("열림 채널만 VOWEL_OPEN_LEAD 만큼 앞당긴다(감쇠 지연 보상); 가로·원순은 그대로", () => {
  assert.ok(VOWEL_OPEN_LEAD > 0 && VOWEL_OPEN_LEAD <= 0.06);
  const v = [{ t: 1, cls: "open", j: "ᅡ", prev: 0.9, next: 1.1 }];
  const led = buildVowelChannels(v, 2, 30, { openLead: 0.06 }), flat = buildVowelChannels(v, 2, 30, { openLead: 0 });
  // t = 0.8667(26): 지지 시작 0.9 보다 33 ms 앞 — 선행이 있으면 이미 완전히 열림
  assert.equal(led.vowelOpen[26], 1);
  assert.ok(flat.vowelOpen[26] < 1);
  assert.deepEqual(led.vowelUnround, flat.vowelUnround);
  assert.deepEqual(buildVowelChannels(v, 2), buildVowelChannels(v, 2, 30, { openLead: VOWEL_OPEN_LEAD }));
});

test("ㅙ = ㅗ 로 시작해 ㅐ 로: 앞부분은 원순·덜 열림, 뒷부분은 가로·더 열림", () => {
  assert.deepEqual(W_DIPHTHONGS["ᅫ"], ["ᅩ", "ᅢ"]);
  assert.deepEqual(W_DIPHTHONGS["ᅰ"], ["ᅮ", "ᅦ"]);
  assert.equal(GLIDE_ONSET_SHARE, 0.4);
  const v = [{ t: 1, cls: "roundGlide", j: "ᅫ", prev: 0.8, next: 1.3 }]; // 모양 지지 0.9 ~ 1.15, 분할 1.0
  const ch = buildVowelChannels(v, 2, 30, { openLead: 0 });
  const early = 28, late = 33; // 0.933, 1.1
  assert.equal(ch.vowelRound[early], 1);
  assert.equal(ch.vowelSpread[early], 0);
  assert.equal(ch.vowelRound[late], 0);
  assert.equal(ch.vowelSpread[late], 0.6);
  assert.equal(ch.vowelOpen[early], VOWEL_OPENNESS["ᅩ"]);
  assert.equal(ch.vowelOpen[late], VOWEL_OPENNESS["ᅢ"]);
  // 분할을 끄면 4C 와 같다(분류 가중치 하나)
  const off = buildVowelChannels(v, 2, 30, { openLead: 0, glides: false });
  assert.equal(off.vowelRound[early], 0.6);
  assert.equal(off.vowelRound[late], 0.6);
});

// 2026-10-01 — 문장 사이 쉼에서 입이 벌어진 채로 남던 것
import { VOWEL_MAX_REACH } from "@/lib/docent/vowelShape";

test("쉼 너머의 자모는 이웃이 아니다 — 모음 지지는 중심에서 VOWEL_MAX_REACH 까지만", () => {
  assert.equal(VOWEL_MAX_REACH, 0.15);
  // 문장 끝 ㅏ(1.0 s) 다음 자모가 1.5 s 쉼 뒤(2.5 s)에 있다
  const end = { t: 1.0, cls: "open", j: "ᅡ", prev: 0.94, next: 2.5 };
  assert.deepEqual(vowelOpenSupport(end), [0.94, 1.15]);
  assert.deepEqual(vowelSupport(end).map((x) => +x.toFixed(6)), [0.97, 1.15]);
  // 다음 문장 첫 모음도 쉼 쪽으로 뻗지 않는다
  const start = { t: 2.56, cls: "open", j: "ᅡ", prev: 1.0, next: 2.62 };
  assert.deepEqual(vowelOpenSupport(start).map((x) => +x.toFixed(6)), [2.41, 2.62]);
  const ch = buildVowelChannels([end, start], 3, 30, { openLead: 0 });
  // 쉼 한가운데(1.75 s)는 모든 모음 채널이 0 — 턱은 LAM(무음이면 닫힘)을 따른다
  const mid = Math.round(1.75 * 30);
  for (const k of ["vowelOpen", "vowelSpread", "vowelRound", "vowelUnround"] as const) assert.equal(ch[k][mid], 0, k);
  // 쉼 전후 모음 자체는 그대로 열린다
  assert.equal(ch.vowelOpen[30], 1);
  assert.equal(ch.vowelOpen[Math.round(2.56 * 30)], 1);
});

test("말하는 구간(이웃이 가까울 때)은 제한이 걸리지 않는다", () => {
  const v = { t: 0.5, cls: "open", j: "ᅡ", prev: 0.43, next: 0.6 };
  assert.deepEqual(vowelOpenSupport(v), [0.43, 0.6]);
  assert.deepEqual(vowelSupport(v).map((x) => +x.toFixed(6)), [0.465, 0.55]);
});
