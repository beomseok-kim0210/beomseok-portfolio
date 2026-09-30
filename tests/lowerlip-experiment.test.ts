// Phase 2C — 아랫입술 독립 액추에이터.
//
// 융합은 아랫입술 두 값을 더 내보내지만, 그 모프가 없는 운영 자산(M2.13 runtime-compat)에서는
// 버려질 뿐이다. 운영 자산은 바뀌지 않는다.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  LAM_FUSION,
  LOWER_LIP_MORPHS,
  fuseLamMouth,
  lamClosure,
  type LamMouthChannels,
} from "@/lib/docent/lamMouthFusion";
import { SEMANTIC_MOUTH_MORPHS } from "@/lib/docent/semanticMouth";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (...p: string[]) => readFileSync(path.join(root, ...p), "utf8").replace(/\r\n/g, "\n");
const PROD = path.join(root, "public", "models", "docent-qka2-m213-runtime-compat.glb");

/** 문장 D "려웠던" 구간처럼 턱은 거의 닫혔고 아랫입술만 내려간 프레임 (실측 형태) */
const LOW_JAW_LOWER_DOWN: LamMouthChannels = { jaw: 0.008, round: 0.05, stretch: 0.06, upperLift: 0.3, close: 0.01, press: 0.02, roll: 0.003, funnel: 0.01, lowerDownLeft: 0.55, lowerDownRight: 0.55 };
/** 문장 C 고|배 의 ㅂ (Phase 2 테스트와 같은 실측 프레임) + 실측 아랫입술 내림 */
const BILABIAL: LamMouthChannels = { jaw: 0.1179, round: 0.0941, stretch: 0.0473, upperLift: 0.0277, close: 0.1002, press: 0.0084, roll: 0.0226, funnel: 0.0138, lowerDownLeft: 0.348, lowerDownRight: 0.348 };

const others = (pose: Record<string, number>) => Object.fromEntries(SEMANTIC_MOUTH_MORPHS.map((m) => [m, pose[m]]));

test("왼쪽 아랫입술 채널은 왼쪽 모프만 움직인다", () => {
  const base = fuseLamMouth({ ...LOW_JAW_LOWER_DOWN, lowerDownLeft: 0, lowerDownRight: 0 });
  const left = fuseLamMouth({ ...LOW_JAW_LOWER_DOWN, lowerDownRight: 0 });
  assert.ok(left.mouthLowerDownLeft > 0.5);
  assert.equal(left.mouthLowerDownRight, 0);
  assert.deepEqual(others(left), others(base), "다른 다섯 액추에이터는 그대로여야 한다");
});

test("오른쪽 아랫입술 채널은 오른쪽 모프만 움직인다", () => {
  const base = fuseLamMouth({ ...LOW_JAW_LOWER_DOWN, lowerDownLeft: 0, lowerDownRight: 0 });
  const right = fuseLamMouth({ ...LOW_JAW_LOWER_DOWN, lowerDownLeft: 0 });
  assert.ok(right.mouthLowerDownRight > 0.5);
  assert.equal(right.mouthLowerDownLeft, 0);
  assert.deepEqual(others(right), others(base));
});

test("양순음에서는 닫힘이 아랫입술 내림을 누를 수 있다", () => {
  assert.ok(lamClosure(BILABIAL) > 0.9);
  const pose = fuseLamMouth(BILABIAL);
  assert.equal(LAM_FUSION.lowerDownClosureSuppression, 1.0, "사전 등록 규칙으로 고른 값");
  assert.ok(pose.mouthLowerDownLeft < 0.05 && pose.mouthLowerDownRight < 0.05, `${pose.mouthLowerDownLeft}`);
  const unsuppressed = fuseLamMouth(BILABIAL, { ...LAM_FUSION, lowerDownClosureSuppression: 0 });
  assert.ok(unsuppressed.mouthLowerDownLeft > 0.2, "억제를 끄면 열린다 — 억제가 실제로 작동한다는 증거");
});

test("턱이 거의 닫혀 있어도 아랫입술은 내려갈 수 있고, 윗입술 들림이 필요 없다", () => {
  const pose = fuseLamMouth({ ...LOW_JAW_LOWER_DOWN, upperLift: 0 });
  assert.ok(pose.jawOpen < 0.03, `jaw ${pose.jawOpen}`);
  assert.equal(pose.mouthShrugUpper, 0);
  assert.ok(pose.mouthLowerDownLeft > 0.5 && pose.mouthLowerDownRight > 0.5);
});

test("아랫입술 채널이 없거나 이상해도 유한하고 0~상한이다", () => {
  for (const v of [undefined, NaN, Infinity, -1, 0, 0.3, 1, 1e6]) {
    const pose = fuseLamMouth({ ...LOW_JAW_LOWER_DOWN, lowerDownLeft: v, lowerDownRight: v });
    for (const m of LOWER_LIP_MORPHS) {
      assert.ok(Number.isFinite(pose[m]) && pose[m] >= 0 && pose[m] <= LAM_FUSION.lowerDownMax, `${m}=${pose[m]} for ${v}`);
    }
  }
});

test("Phase 2 의 다섯 액추에이터는 아랫입술 채널이 있든 없든 같다 (기본값)", () => {
  assert.equal(LAM_FUSION.closureLowerDownWeight, 0);
  for (const raw of [LOW_JAW_LOWER_DOWN, BILABIAL]) {
    const without = fuseLamMouth({ ...raw, lowerDownLeft: undefined, lowerDownRight: undefined });
    assert.deepEqual(others(fuseLamMouth(raw)), others(without));
  }
});

/* ------------------------------------------------------------ 자산 */

type Glb = { json: { meshes: { extras: { targetNames: string[] }; primitives: { targets: unknown[]; attributes: Record<string, number> }[] }[]; accessors: { count: number }[] } };
function glbJson(file: string): Glb["json"] {
  const b = readFileSync(file); const jl = b.readUInt32LE(12);
  return JSON.parse(b.subarray(20, 20 + jl).toString());
}

test("운영 GLB 는 바뀌지 않았다", () => {
  const sha = createHash("sha256").update(readFileSync(PROD)).digest("hex");
  assert.equal(sha, "9631304cee0dedd2fb88e2639d21630e2174c050fa650463f9d5202a27b59e1b");
});

test("런타임: 자산은 운영 GLB 하나다 — 실험 자산 스위치가 없다", () => {
  const head = read("src", "features", "docent", "DocentHead.tsx");
  assert.match(head, /const MODEL_URL = "\/models\/docent-qka2-m213-runtime-compat\.glb";/);
  assert.doesNotMatch(head, /lowerlip-exp|get\("ddAvatar"\)/);
  // 운영 자산에는 아랫입술 모프가 없다 — 없는 모프는 계약 위반이 아니다(던지지 않는다)
  const names = glbJson(PROD).meshes[0].extras.targetNames;
  for (const m of LOWER_LIP_MORPHS) assert.ok(!names.includes(m), m);
  assert.match(head, /const OPTIONAL_MORPHS: readonly string\[\] = LOWER_LIP_MORPHS;/);
  assert.match(head, /for \(const name of LOWER_LIP_MORPHS\) ll\[name\] = rendered\[name\];/);
});

test("LAM 워커가 아랫입술 채널을 원시값으로 내보낸다", () => {
  const worker = read("voice", "lam_worker.py");
  assert.match(worker, /"lowerDownL": 33, "lowerDownR": 34/);
  assert.match(worker, /"lowerDownLeft": round\(float\(arr\[i, CH\["lowerDownL"\]\]\), 6\)/);
});

// Phase 2D — TTS 정렬 양순음 게이트 (실험). 게이트 채널이 없으면 Phase 2C 와 같다.
const bilabialLike: LamMouthChannels = {
  jaw: 0.08, round: 0.05, stretch: 0.01, upperLift: 0.2,
  close: 0.05, press: 0.02, roll: 0.02, funnel: 0.01, lowerDownLeft: 0.5, lowerDownRight: 0.5,
};

test("게이트 채널이 없으면 결과는 Phase 2C 와 비트 단위로 같다", () => {
  const withUndefined = fuseLamMouth({ ...bilabialLike, bilabialGate: undefined });
  assert.deepEqual(withUndefined, fuseLamMouth(bilabialLike));
  assert.deepEqual(fuseLamMouth({ ...bilabialLike, bilabialGate: Number.NaN }), fuseLamMouth(bilabialLike));
});

test("게이트 0 이면 LAM 닫힘이 아랫입술을 누르지 않는다 — 양순음이 아닌 곳이 열린다", () => {
  const off = fuseLamMouth({ ...bilabialLike, bilabialGate: 0 });
  const none = fuseLamMouth(bilabialLike);
  assert.ok(lamClosure(bilabialLike) > 0);
  assert.ok(off.mouthLowerDownLeft > none.mouthLowerDownLeft);
  assert.equal(off.jawOpen, none.jawOpen);
  assert.equal(off.mouthShrugUpper, none.mouthShrugUpper);
});

test("게이트 1 이면 아랫입술 내림이 0 이고 닫힘이 보강된다", () => {
  const on = fuseLamMouth({ ...bilabialLike, bilabialGate: 1 });
  const off = fuseLamMouth({ ...bilabialLike, bilabialGate: 0 });
  assert.equal(on.mouthLowerDownLeft, 0);
  assert.equal(on.mouthLowerDownRight, 0);
  assert.ok(on.jawOpen < off.jawOpen);
  assert.ok(on.mouthShrugUpper < off.mouthShrugUpper);
});

test("게이트는 0~1 로 자르고, 텍스트가 턱·원순·벌림을 직접 구동하지 않는다", () => {
  const big = fuseLamMouth({ ...bilabialLike, bilabialGate: 7 });
  assert.deepEqual(big, fuseLamMouth({ ...bilabialLike, bilabialGate: 1 }));
  const neg = fuseLamMouth({ ...bilabialLike, bilabialGate: -3 });
  assert.deepEqual(neg, fuseLamMouth({ ...bilabialLike, bilabialGate: 0 }));
  // 입이 이미 닫혀 있는 무음에서 게이트는 아무것도 열지 않는다
  const rest: LamMouthChannels = { jaw: 0, round: 0, stretch: 0, upperLift: 0 };
  const g = fuseLamMouth({ ...rest, bilabialGate: 1 });
  assert.equal(g.jawOpen, 0);
  assert.equal(g.mouthRound, fuseLamMouth(rest).mouthRound);
});

test("타임라인 보간이 게이트 채널을 싣고, 한쪽 프레임에 없으면 버린다", async () => {
  const { sampleTimeline } = await import("@/lib/docent/voiceTimeline");
  const f = (t: number, g?: number) => ({ t, jaw: 0, round: 0, stretch: 0, upperLift: 0, ...(g === undefined ? {} : { bilabialGate: g }) });
  assert.equal(sampleTimeline([f(0, 0), f(1 / 30, 1), f(2 / 30, 1)], 30, 0.5 / 30)?.bilabialGate, 0.5);
  assert.equal(sampleTimeline([f(0, 0), f(1 / 30), f(2 / 30)], 30, 0.5 / 30)?.bilabialGate, undefined);
});
