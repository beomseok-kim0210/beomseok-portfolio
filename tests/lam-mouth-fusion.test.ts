// Phase 2 — LAM 52채널 → 기존 5개 입 액추에이터 의미 융합.
//
// 프레임 값은 2026-09-29 실측(정본 Supertonic M1 WAV → LAM, 문장 A·B·C)에서 가져왔다.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  LAM_FUSION,
  fuseLamMouth,
  lamClosure,
  lamRoundness,
  type LamMouthChannels,
} from "@/lib/docent/lamMouthFusion";
import { JAW_MAX, SEMANTIC_MOUTH_CAP, SEMANTIC_MOUTH_MORPHS } from "@/lib/docent/semanticMouth";
import { sampleTimeline, type VoiceTimelineFrame } from "@/lib/docent/voiceTimeline";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (...p: string[]) => readFileSync(path.join(root, ...p), "utf8").replace(/\r\n/g, "\n");

/** 문장 C, 고|배 의 ㅂ — 턱은 열려 있고 mouthClose 가 그만큼 입술을 붙인다 */
const BILABIAL_CLOSE: LamMouthChannels = { jaw: 0.1179, round: 0.0941, stretch: 0.0473, upperLift: 0.0277, close: 0.1002, press: 0.0084, roll: 0.0226, funnel: 0.0138 };
/** 문장 C, 가|부 의 ㅂ — 누르기가 큰 닫힘 */
const BILABIAL_PRESS: LamMouthChannels = { jaw: 0.0075, round: 0.125, stretch: 0.0394, upperLift: 0.3465, close: 0.1013, press: 0.1188, roll: 0.0034, funnel: 0.0766 };
/** 문장 C, 릅|니 의 ㅁ — mouthClose 는 거의 없고 누르기로 닫는다. 윗입술이 높다 */
const BILABIAL_NASAL: LamMouthChannels = { jaw: 0.0134, round: 0.0148, stretch: 0.1094, upperLift: 0.6316, close: 0.0081, press: 0.0806, roll: 0.0078, funnel: 0.0099 };
/** 문장 A, "아아" 의 턱 최대 프레임 */
const OPEN_VOWEL: LamMouthChannels = { jaw: 0.2461, round: 0.0246, stretch: 0.1348, upperLift: 0.6558, close: 0.008, press: 0.0076, roll: 0.004, funnel: 0.0027 };
/** 문장 B, "오" */
const ROUNDED_O: LamMouthChannels = { jaw: 0.2641, round: 0.5502, stretch: 0.0129, upperLift: 0.1744, close: 0.2305, press: 0.0034, roll: 0.004, funnel: 0.0396 };

const open = (raw: LamMouthChannels) => fuseLamMouth({ ...raw, close: 0, press: 0, roll: 0 });

test("mouthClose 가 턱을 줄인다", () => {
  const withClose = fuseLamMouth(BILABIAL_CLOSE);
  const withoutClose = open(BILABIAL_CLOSE);
  assert.ok(lamClosure(BILABIAL_CLOSE) > 0.9);
  assert.ok(withClose.jawOpen < withoutClose.jawOpen * 0.2, `${withClose.jawOpen} vs ${withoutClose.jawOpen}`);
});

test("누르기(press)가 닫힘을 키운다", () => {
  const partial = { ...BILABIAL_NASAL, press: 0.02 };
  assert.ok(lamClosure(BILABIAL_NASAL) > lamClosure(partial));
  assert.ok(lamClosure(BILABIAL_NASAL) > 0.5, "mouthClose 가 없는 ㅁ 도 누르기로 닫혀야 한다");
});

test("말아 넣기(roll)도 닫힘에 기여한다", () => {
  const base: LamMouthChannels = { jaw: 0.06, round: 0, stretch: 0, upperLift: 0, close: 0.05, press: 0.01, roll: 0 };
  assert.ok(lamClosure({ ...base, roll: 0.03 }) > lamClosure(base));
});

test("닫힘은 턱에 대한 비율이다 — 원순 모음의 큰 mouthClose 가 모음을 다물지 않는다", () => {
  // 문장 B 의 "오" 는 mouthClose 가 0.23 으로 양순음(0.07~0.17)보다 크지만 턱도 크다
  const o = fuseLamMouth(ROUNDED_O);
  assert.ok(lamClosure(ROUNDED_O) < 0.9);
  assert.ok(o.jawOpen > 0.05, `오 의 턱이 다물렸다: ${o.jawOpen}`);
});

test("아주 작은 신호만으로는 닫히지 않는다 — 절대량 게이트", () => {
  const tiny: LamMouthChannels = { jaw: 0.01, round: 0, stretch: 0, upperLift: 0, close: 0.02, press: 0.01, roll: 0 };
  assert.ok(lamClosure(tiny) < 0.05);
});

test("열린 모음은 무너지지 않는다", () => {
  assert.equal(lamClosure(OPEN_VOWEL), 0);
  const pose = fuseLamMouth(OPEN_VOWEL);
  assert.ok(pose.jawOpen > 0.3, `아 의 턱: ${pose.jawOpen}`);
  assert.deepEqual(pose, open(OPEN_VOWEL), "닫힘 채널이 열린 모음의 자세를 바꾸면 안 된다");
});

test("닫힘은 윗입술을 누른다", () => {
  const closed = fuseLamMouth(BILABIAL_NASAL);
  const unclosed = open(BILABIAL_NASAL);
  assert.ok(unclosed.mouthShrugUpper > 0.5);
  assert.ok(closed.mouthShrugUpper < unclosed.mouthShrugUpper * 0.5, `${closed.mouthShrugUpper} vs ${unclosed.mouthShrugUpper}`);
});

test("닫힘은 입꼬리 당김(stretch)도 누른다", () => {
  const closed = fuseLamMouth(BILABIAL_NASAL);
  const unclosed = open(BILABIAL_NASAL);
  assert.ok(closed.mouthStretch < unclosed.mouthStretch * 0.6);
  assert.ok(LAM_FUSION.stretchClosureSuppression > 0);
});

test("보정 형상은 억제된 턱을 따른다", () => {
  for (const raw of [BILABIAL_CLOSE, BILABIAL_PRESS, BILABIAL_NASAL, OPEN_VOWEL, ROUNDED_O]) {
    const pose = fuseLamMouth(raw);
    assert.equal(pose.jawOpenCorrective, Math.min(pose.jawOpen / JAW_MAX, 1));
  }
  // 닫힌 입에서 보정 형상이 열린 채로 남으면 안 된다
  assert.ok(fuseLamMouth(BILABIAL_CLOSE).jawOpenCorrective < open(BILABIAL_CLOSE).jawOpenCorrective * 0.2);
});

test("깔때기(funnel)가 원순에 기여한다", () => {
  const noFunnel: LamMouthChannels = { jaw: 0.05, round: 0.1, stretch: 0, upperLift: 0, funnel: 0 };
  const withFunnel = { ...noFunnel, funnel: 0.07 };
  assert.ok(lamRoundness(withFunnel) > lamRoundness(noFunnel));
  assert.ok(fuseLamMouth(withFunnel).mouthRound > fuseLamMouth(noFunnel).mouthRound);
});

test("원순 모음의 round 가 열린 모음보다 확실히 크다", () => {
  assert.ok(fuseLamMouth(ROUNDED_O).mouthRound > 0.8);
  assert.ok(fuseLamMouth(OPEN_VOWEL).mouthRound < 0.05);
});

test("구버전 워커(새 채널 없음)에서도 동작한다 — 닫힘 0", () => {
  const legacy = { jaw: BILABIAL_CLOSE.jaw, round: BILABIAL_CLOSE.round, stretch: BILABIAL_CLOSE.stretch, upperLift: BILABIAL_CLOSE.upperLift };
  assert.equal(lamClosure(legacy), 0);
  assert.deepEqual(fuseLamMouth(legacy), open(legacy));
});

test("어떤 입력에도 유한하고 모프 안전 범위 안이다", () => {
  const weird = [NaN, Infinity, -Infinity, -1, 0, 1e-9, 0.5, 1, 5, 1e6];
  let n = 0;
  for (const jaw of weird) for (const close of weird) for (const upperLift of [0, 0.7, 2, NaN]) for (const press of [0, 0.2, NaN]) {
    const pose = fuseLamMouth({ jaw, round: jaw, stretch: close, upperLift, close, press, roll: close, funnel: jaw });
    for (const name of SEMANTIC_MOUTH_MORPHS) {
      assert.ok(Number.isFinite(pose[name]), `${name} not finite for jaw=${jaw} close=${close}`);
      assert.ok(pose[name] >= 0 && pose[name] <= SEMANTIC_MOUTH_CAP[name] + 1e-12, `${name}=${pose[name]}`);
    }
    n += 1;
  }
  assert.ok(n > 1000);
});

test("윗입술 기준은 넓어졌지만 0 으로 누르지 않았다", () => {
  // 문장 A 의 열린 모음(윗입술 원시 0.66)에서 상한 근처의 유의미한 들림이 남는다
  const up = fuseLamMouth(OPEN_VOWEL).mouthShrugUpper;
  assert.ok(up > 1.0 && up <= SEMANTIC_MOUTH_CAP.mouthShrugUpper, `${up}`);
  assert.ok(LAM_FUSION.upperXref > 0.42, "0.42 는 발화 대부분에서 상한을 쳤다");
});

/* ------------------------------------------------------------ 배선 */

test("타임라인은 새 채널을 두 프레임 모두에 있을 때만 보간한다", () => {
  const frames: VoiceTimelineFrame[] = [
    { t: 0, jaw: 0, round: 0, stretch: 0, upperLift: 0, close: 0, press: 0.2, roll: 0, funnel: 0 },
    { t: 1 / 30, jaw: 0.2, round: 0, stretch: 0, upperLift: 0, close: 0.1, press: 0, roll: 0.02, funnel: 0.04 },
  ];
  const mid = sampleTimeline(frames, 30, 0.5 / 30)!;
  assert.ok(Math.abs(mid.close! - 0.05) < 1e-9);
  assert.ok(Math.abs(mid.press! - 0.1) < 1e-9);
  const legacy = sampleTimeline(frames.map(({ t, jaw, round, stretch, upperLift }) => ({ t, jaw, round, stretch, upperLift })), 30, 0.5 / 30)!;
  assert.equal(legacy.close, undefined);
});

test("LAM 워커가 닫힘·깔때기 채널을 원시값으로 내보낸다", () => {
  const worker = read("voice", "lam_worker.py");
  for (const [name, idx] of [["close", 26], ["funnel", 31], ["pressL", 35], ["pressR", 36], ["rollL", 39], ["rollU", 40]] as const) {
    assert.match(worker, new RegExp(`"${name}": ${idx}`));
  }
  for (const key of ["close", "press", "roll", "funnel"]) assert.match(worker, new RegExp(`"${key}": round\\(float\\(`));
});

test("주 경로가 융합 매핑을 쓴다 — 레거시 라벨 경로의 곡선은 그대로 둔다", () => {
  const hook = read("src", "features", "docent", "useSupertonicVoice.ts");
  assert.match(hook, /setMouth\(raw \? (fuseLamMouth|fuseWithGateCorrection)\(raw\) : REST_POSE\)/);
  assert.equal(hook.includes("applySemanticMouthCalibration"), false);
});

test("타이밍 파이프라인은 그대로다 (Phase 3 몫)", () => {
  const head = read("src", "features", "docent", "DocentHead.tsx");
  assert.match(head, /dampMouth\(dampState\.current, MOUTH_ACTUATORS, pose as MouthTarget, delta, MOUTH_TIMING\)/);
  // 입 감쇠의 기본 갈래는 λ=18 그대로다. 게이트 보정분만 닫힘 36 / 풀림 18(Phase 4D 운영값)
  const timingSrc = read("src/lib/docent/closureTiming.ts");
  assert.match(timingSrc, /export const BASE_MOUTH_LAMBDA = 18;/);
  assert.match(timingSrc, /gateAdvanceSeconds: 0\.03,\s*closeLambda: 36,\s*releaseLambda: BASE_MOUTH_LAMBDA,/);
  const hook = read("src", "features", "docent", "useSupertonicVoice.ts");
  assert.match(hook, /sampleTimeline\(frames, fps, a\.currentTime \+ lead, MOUTH_TIMING\.gateAdvanceSeconds\)/);
});

test("발화 중 감정 모프는 10% 로 줄고, 세그먼트 사이 공백에도 유지된다", () => {
  const head = read("src", "features", "docent", "DocentHead.tsx");
  assert.match(head, /export const EMOTION_SCALE_DURING_SPEECH = 0\.1;/);
  assert.match(head, /const speechActive = speaking \|\| lamMouth !== null \|\| viseme !== null;/);
  const experience = read("src", "features", "docent", "DocentExperience.tsx");
  assert.match(experience, /speaking=\{runtime\.supertonic\.speaking\}/);
  const canvas = read("src", "features", "docent", "AvatarCanvas.tsx");
  assert.match(canvas, /<DocentHead[^>]*speaking=\{speaking\}/);
});

test("마이크를 켜면 재생 중인 음성과 대기 중인 세그먼트가 멈춘다", () => {
  const runtime = read("src", "features", "docent", "DocentRuntime.tsx");
  const effect = /useEffect\(\(\) => \{\s*if \(!listening\) return;\s*pendingSpeechRef\.current = null;\s*stopSupertonic\(\);/.exec(runtime);
  assert.ok(effect, "listening 이 켜지면 pending 을 버리고 Supertonic 을 멈춰야 한다");
  // stop 은 세대를 올리고 합성 요청과 재생을 모두 끊는다 — 멈춘 답변이 다시 이어지지 않는다
  const hook = read("src", "features", "docent", "useSupertonicVoice.ts");
  assert.match(hook, /const stop = useCallback\(\(\) => \{\s*genRef\.current \+= 1;[^}]*teardown\(\);/);
  assert.match(hook, /abortRef\.current\?\.abort\(\);/);
});
