// Phase 4D 운영 경로 — RunPod 응답이 로컬과 같은 의미의 정렬(양순음 게이트·모음 자모 시각)을
// 싣고 오면, 서버가 같은 입 채널을 만들어 프레임에 싣는다. 정렬이 없거나 이상하면 LAM 전용
// 경로 그대로다. 입 선행 80 ms 는 모음 채널이 실린 세그먼트에만 걸린다.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import {
  attachAlignedChannels,
  getVoiceProvider,
  type AlignedTimingDTO,
  type VoiceTimelineFrameDTO,
} from "../src/lib/docent/voiceProvider";
import { MOUTH_TIMING } from "../src/lib/docent/closureTiming";
import {
  MOUTH_AUDIO_LEAD_SECONDS,
  mouthLeadSeconds,
  sampleTimeline,
  type VoiceTimelineFrame,
} from "../src/lib/docent/voiceTimeline";
import { VOWEL_OPEN_LEAD } from "../src/lib/docent/vowelShape";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (...p: string[]) => readFileSync(path.join(root, ...p), "utf8").replace(/\r\n/g, "\n");

const FPS = 30;
const lamFrames = (n = 31): VoiceTimelineFrameDTO[] =>
  Array.from({ length: n }, (_, i) => ({ t: i / FPS, jaw: 0.02, round: 0.03, stretch: 0.02, upperLift: 0.1, close: 0.01, press: 0.01, roll: 0.01, funnel: 0.01 }));
const gate = (n = 31) => Array.from({ length: n }, (_, i) => (i === 12 ? 1 : 0));
/** ㅙ(0.3 s) — w-이중모음, ㅣ(0.7 s) — 가로 */
const VOWELS = [
  { t: 0.3, cls: "roundGlide", j: "ᅫ", prev: 0.2, next: 0.5 },
  { t: 0.7, cls: "spread", j: "ᅵ", prev: 0.6, next: 0.8 },
];
const ALIGNMENT: AlignedTimingDTO = { gateFps: FPS, bilabialGate: gate(), vowels: VOWELS };

/* ------------------------------------------------------------- RunPod 전송 */

const AUDIO = Buffer.from("RIFF....fake wav bytes for the alignment transport");
const AUDIO_SHA = createHash("sha256").update(AUDIO).digest("hex");
function runpodBody(output: Record<string, unknown>) {
  return {
    id: "job-a", status: "COMPLETED", executionTime: 1000, delayTime: 10,
    output: {
      utteranceId: "u-a", voiceStyle: "M1",
      audio: { base64: AUDIO.toString("base64"), bytes: AUDIO.byteLength, sampleRate: 44100, channels: 1, subtype: "PCM_16", durationSeconds: 1, sha256: AUDIO_SHA },
      timeline: { fps: FPS, frameCount: 31, durationSeconds: 31 / FPS, channels: {}, frames: lamFrames() },
      identity: { canonicalSha256: AUDIO_SHA, lamSourceSha256: AUDIO_SHA, responseSha256: AUDIO_SHA, sameSource: true, synthesisCount: 1, preprocessing: "soundfile+soxr", lamTargetSampleRate: 16000 },
      diagnostics: {},
      ...output,
    },
  };
}
async function viaRunPod(output: Record<string, unknown>) {
  const env = { DOCENT_VOICE_BACKEND: process.env.DOCENT_VOICE_BACKEND, RUNPOD_ENDPOINT_ID: process.env.RUNPOD_ENDPOINT_ID, RUNPOD_API_KEY: process.env.RUNPOD_API_KEY };
  const realFetch = globalThis.fetch;
  process.env.DOCENT_VOICE_BACKEND = "runpod";
  process.env.RUNPOD_ENDPOINT_ID = "endpoint-placeholder";
  process.env.RUNPOD_API_KEY = "rp-placeholder-not-a-real-key";
  globalThis.fetch = (async () => ({ ok: true, status: 200, json: async () => runpodBody(output) })) as unknown as typeof fetch;
  try {
    return await getVoiceProvider().synthesize("왜 이래", "u-a");
  } finally {
    globalThis.fetch = realFetch;
    for (const [k, v] of Object.entries(env)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
}

test("RunPod 응답의 정렬로 게이트·모음 채널이 프레임에 실린다", async () => {
  const r = await viaRunPod({ alignment: ALIGNMENT });
  const f = r.timeline.frames;
  assert.equal(f.length, 31);
  assert.equal(f[12].bilabialGate, 1);
  for (const k of ["vowelSpread", "vowelRound", "vowelUnround", "vowelOpen"] as const) {
    assert.ok(f.every((x) => typeof x[k] === "number" && Number.isFinite(x[k])), k);
  }
  // ㅣ 에서 가로 벌림
  assert.equal(f[21].vowelSpread, 1);
  assert.equal(r.identity.synthesisCount, 1);
});

test("이중모음 전송: ㅙ 는 원순으로 시작해 ㅐ 의 가로·평순으로 넘어간다", async () => {
  const f = (await viaRunPod({ alignment: ALIGNMENT })).timeline.frames;
  // 모양 지지 0.25~0.4, 분할 0.31 — 7 프레임(0.233)은 원순 시작, 11 프레임(0.367)은 핵 모음
  assert.equal(f[8].vowelRound, 1);
  assert.equal(f[8].vowelSpread, 0);
  assert.equal(f[11].vowelRound, 0);
  assert.equal(f[11].vowelSpread, 0.6);
  assert.equal(f[11].vowelUnround, 1);
});

test("로컬과 RunPod 은 같은 정렬에서 같은 프레임을 만든다", async () => {
  const remote = (await viaRunPod({ alignment: ALIGNMENT })).timeline.frames;
  const local = attachAlignedChannels(lamFrames(), FPS, ALIGNMENT, 1);
  assert.deepEqual(remote, local);
  const src = read("src", "lib", "docent", "voiceProvider.ts");
  assert.match(src, /frames: attachAlignedChannels\(\s*lam\.frames,\s*lam\.fps,\s*\{ gateFps: tts\.gate_fps, bilabialGate: tts\.bilabial_gate, vowels: tts\.alignment\?\.vowels \},\s*tts\.duration_s,\s*\)/);
  assert.match(src, /frames: attachAlignedChannels\(out\.timeline\.frames, out\.timeline\.fps, out\.alignment, duration\)/);
});

test("정렬이 없으면(null·없음·구버전 이미지) LAM 전용 프레임 그대로다", async () => {
  for (const output of [{}, { alignment: null }]) {
    const f = (await viaRunPod(output)).timeline.frames;
    assert.deepEqual(f, lamFrames());
    assert.equal(mouthLeadSeconds(f), 0);
  }
});

test("이상한 정렬은 버리고 음성은 실패하지 않는다", async () => {
  // fps 가 어긋난 게이트는 게이트만 버린다 — 모음 채널은 그대로 실린다
  const gateBad = (await viaRunPod({ alignment: { gateFps: 25, bilabialGate: gate(), vowels: VOWELS } })).timeline.frames;
  assert.ok(gateBad.every((x) => x.bilabialGate === undefined && typeof x.vowelOpen === "number"));
  const bad: AlignedTimingDTO[] = [
    { gateFps: FPS, bilabialGate: [Number.NaN, 2], vowels: "x" },        // 값·형 이상
    { gateFps: FPS, bilabialGate: gate(), vowels: [{ t: "a", cls: 1 }] }, // 모음 형 이상
    "garbage" as unknown as AlignedTimingDTO,
  ];
  for (const a of bad) {
    const f = (await viaRunPod({ alignment: a })).timeline.frames;
    assert.equal(f.length, 31);
    for (const x of f) for (const v of Object.values(x)) if (typeof v === "number") assert.ok(Number.isFinite(v));
    assert.ok(f.every((x) => x.vowelOpen === undefined), JSON.stringify(a).slice(0, 40));
  }
});

test("원시 attention·토큰 목록은 브라우저로 가지 않는다 — 줄인 채널만", () => {
  const align = read("voice", "supertonic_align.py");
  assert.doesNotMatch(align, /dump_raw|keep_all|"_tokens"|"_token_times"|savez/);
  const worker = read("voice", "supertonic_worker.py");
  assert.match(worker, /\("granularity", "frame_duration_ms", "offset_ms", "chunks",\s*\n\s*"token_count", "vowels"\)/);
  const handler = read("runpod", "handler.py");
  assert.match(handler, /"bilabialGate": gate,\s*\n\s*"vowels": al\["vowels"\],/);
  assert.doesNotMatch(handler, /attention"|softmax|_tokens/i);
  // 라우트는 타임라인(프레임)만 내보낸다 — 정렬 객체는 서버에서 소비된다
  const route = read("src", "app", "api", "docent", "voice", "route.ts");
  assert.match(route, /timeline: result\.timeline,/);
  assert.doesNotMatch(route, /alignment/);
});

/* -------------------------------------------------------------- 입 선행 */

test("입 선행 80 ms 는 모음 채널이 실린 세그먼트에만 걸린다", () => {
  assert.equal(MOUTH_AUDIO_LEAD_SECONDS, 0.08);
  const aligned = attachAlignedChannels(lamFrames(), FPS, ALIGNMENT, 1) as VoiceTimelineFrame[];
  assert.equal(mouthLeadSeconds(aligned), 0.08);
  assert.equal(mouthLeadSeconds(lamFrames() as VoiceTimelineFrame[]), 0);
  assert.equal(mouthLeadSeconds([]), 0);
  // 게이트만 있고 모음이 없으면 선행하지 않는다(4D 조음이 켜지지 않은 상태)
  const gateOnly = attachAlignedChannels(lamFrames(), FPS, { gateFps: FPS, bilabialGate: gate() }, 1) as VoiceTimelineFrame[];
  assert.equal(mouthLeadSeconds(gateOnly), 0);
});

test("선행은 한 번만: 훅은 currentTime + lead 한 곳, 정렬 채널 30 ms·열림 60 ms 는 LAM 기준 상대 보정", () => {
  const hook = read("src", "features", "docent", "useSupertonicVoice.ts");
  assert.equal((hook.match(/\+ lead/g) ?? []).length, 1);
  assert.match(hook, /const lead = mouthLeadSeconds\(frames\);/);
  assert.match(hook, /sampleTimeline\(frames, fps, a\.currentTime \+ lead, MOUTH_TIMING\.gateAdvanceSeconds\)/);
  assert.doesNotMatch(hook, /playbackRate|\.currentTime = |\.currentTime \+= /);
  assert.equal(MOUTH_TIMING.gateAdvanceSeconds, 0.03);
  assert.equal(VOWEL_OPEN_LEAD, 0.06);
  // DocentHead·closureTiming 에는 선행이 없다(감쇠만)
  assert.doesNotMatch(read("src", "features", "docent", "DocentHead.tsx"), /MOUTH_AUDIO_LEAD|mouthLeadSeconds/);
  assert.doesNotMatch(read("src", "lib", "docent", "closureTiming.ts"), /MOUTH_AUDIO_LEAD|0\.08/);
});

test("선행 샘플링은 LAM 채널까지 t + 0.08 에서 읽는 것과 같다 — 오디오 시계는 그대로", () => {
  const aligned = attachAlignedChannels(lamFrames().map((f, i) => ({ ...f, jaw: i / 100 })), FPS, ALIGNMENT, 1) as VoiceTimelineFrame[];
  const lead = mouthLeadSeconds(aligned);
  for (const t of [0.1, 0.35, 0.6]) {
    const a = sampleTimeline(aligned, FPS, t + lead, MOUTH_TIMING.gateAdvanceSeconds)!;
    assert.ok(Math.abs(a.jaw - (t + 0.08) * FPS / 100) < 1e-9);
  }
  // LAM 전용 경로: 선행 0 → 읽는 시각은 currentTime 그대로
  const plain = lamFrames().map((f, i) => ({ ...f, jaw: i / 100 })) as VoiceTimelineFrame[];
  const b = sampleTimeline(plain, FPS, 0.35 + mouthLeadSeconds(plain), MOUTH_TIMING.gateAdvanceSeconds)!;
  assert.ok(Math.abs(b.jaw - 0.35 * FPS / 100) < 1e-9);
});

/* --------------------------------------------------------- 이미지 / 모델 */

test("RunPod 이미지: 정렬 모델은 계측 사본 경로 하나, 원본 모델·가중치는 그대로", () => {
  const df = read("runpod", "Dockerfile");
  assert.match(df, /COPY models\/supertonic-align \/models\/supertonic-align/);
  assert.match(df, /DD_SUPERTONIC_ALIGN_ONNX=\/models\/supertonic-align\/vector_estimator_attn\.onnx/);
  assert.match(df, /COPY models\/supertonic-3 \/models\/supertonic-3/);
  const inst = read("runpod", "instrument_vector_estimator.py");
  assert.match(inst, /SOURCE_SHA256 = "883ac868ea0275ef0e991524dc64f16b3c0376efd7c320af6b53f5b780d7c61c"/);
  assert.match(inst, /assert weights\(model\) == weights\(original\)/);
  assert.match(read("runpod", "MODEL-HASHES.md"), /883ac868ea0275ef0e991524dc64f16b3c0376efd7c320af6b53f5b780d7c61c/);
  // 코드에 로컬 윈도 경로가 남지 않는다
  for (const f of [["voice", "supertonic_worker.py"], ["voice", "supertonic_align.py"], ["runpod", "handler.py"], ["runpod", "Dockerfile"]]) {
    assert.doesNotMatch(read(...f), /[A-Z]:[\\/](dd-|Users)/, f.join("/"));
  }
});

test("한 번 합성: 정렬 경로도 워커의 synthesize 호출은 하나다", () => {
  const w = read("voice", "supertonic_worker.py");
  assert.equal((w.match(/\.synthesize\(text/g) ?? []).length, 2); // aligner 또는 tts, 둘 중 하나만 실행된다
  assert.match(w, /if aligner is not None:\s*\n\s*# ONE synthesis[^\n]*\n\s*wav, _dur, alignment, align_error = aligner\.synthesize\(text, \*\*kwargs\)\s*\n\s*else:\s*\n\s*wav, _dur = tts\.synthesize\(text, \*\*kwargs\)/);
  assert.match(w, /"synthesis_count": 1,/);
  assert.match(read("runpod", "handler.py"), /if tts\["synthesis_count"\] != 1:/);
});
