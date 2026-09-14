// Supertonic → LAM → M2.13 런타임의 순수 로직 단언.
//
// 브라우저도 GPU 도 없이 검증할 수 있는 부분만 여기서 고정한다. 실제 합성·추론·
// 재생은 호스트가 실행해 측정했고, 이 스위트가 그것을 대신하지 않는다.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import {
  JAW_MAX,
  REST_POSE,
  SEMANTIC_MOUTH_CAP,
  SEMANTIC_MOUTH_MORPHS,
  applySemanticMouthCalibration,
} from "../src/lib/docent/semanticMouth";
import {
  LAM_FRAME_STEP_SECONDS,
  durationDeltaWithinFrameStep,
  sameAudioSource,
  sampleTimeline,
  type VoiceTimelineFrame,
} from "../src/lib/docent/voiceTimeline";
import { semanticMouthPose } from "../src/lib/docent/legacyVisemeToSemanticMouth";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (...p: string[]) => readFileSync(path.join(root, ...p), "utf8");

/* ------------------------------------------------- 캘리브레이션은 하나뿐이다 */

test("두 경로가 같은 곡선을 쓴다", () => {
  // viseme 폴백이 내놓는 값은 그 원시 앵커를 캘리브레이션에 직접 넣은 것과 같아야
  // 한다. 다르면 구현이 둘로 갈라진 것이다.
  const anchorU = { jaw: 0.01108227, round: 0.20036241, stretch: 0.0188772, upperLift: 0.12384698 };
  assert.deepEqual(semanticMouthPose("u"), applySemanticMouthCalibration(anchorU));
});

test("어댑터 표가 골든 값과 자릿수까지 일치한다", () => {
  const GOLDEN: Record<string, [number, number, number, number, number]> = {
    // jawOpen, mouthRound, mouthStretch, jawOpenCorrective, mouthShrugUpper
    a: [0.179039, 0.171667, 0.63315, 0.447597, 1.6],
    i: [0.143623, 0.038881, 0.518216, 0.359058, 1.369268],
    u: [0.04488, 0.295263, 0.158195, 0.1122, 0.0],
    e: [0.190386, 0.049244, 0.893543, 0.475965, 1.545758],
    o: [0.088424, 0.666697, 0.26573, 0.221061, 0.234389],
    m: [0.0, 0.0, 0.018942, 0.0, 0.0],
  };
  for (const [v, expected] of Object.entries(GOLDEN)) {
    const pose = semanticMouthPose(v as never);
    SEMANTIC_MOUTH_MORPHS.forEach((n, i) => {
      assert.ok(Math.abs(pose[n] - expected[i]) < 5e-6, `${v}.${n} = ${pose[n]}`);
    });
  }
});

test("jawOpenCorrective 는 언제나 jawOpen 에서 파생된다", () => {
  for (const jaw of [0, 0.001, 0.05, 0.1, 0.2, 0.5, 1]) {
    const pose = applySemanticMouthCalibration({ jaw, round: 0.3, stretch: 0.1, upperLift: 0.4 });
    assert.equal(pose.jawOpenCorrective, Math.min(pose.jawOpen / JAW_MAX, 1));
  }
});

test("LAM 범위의 어떤 입력도 캘리브레이션 상한을 넘지 않는다", () => {
  // LAM 출력은 0..1 근처지만 상한을 넘겨 넣어도 액추에이터가 튀면 안 된다
  for (const x of [0, 0.001, 0.25, 0.5, 0.9, 1, 2]) {
    const pose = applySemanticMouthCalibration({ jaw: x, round: x, stretch: x, upperLift: x });
    for (const n of SEMANTIC_MOUTH_MORPHS) {
      assert.ok(pose[n] >= 0 && pose[n] <= SEMANTIC_MOUTH_CAP[n], `${n} = ${pose[n]} at x=${x}`);
    }
  }
});

/* ------------------------------------------------------------ 오디오 동기화 */

const frames: VoiceTimelineFrame[] = [
  { t: 0, jaw: 0, round: 0, stretch: 0, upperLift: 0 },
  { t: 1 / 30, jaw: 0.1, round: 0.2, stretch: 0.3, upperLift: 0.4 },
  { t: 2 / 30, jaw: 0.2, round: 0.4, stretch: 0.6, upperLift: 0.8 },
];

test("타임라인은 재생 위치로 조회한다", () => {
  assert.deepEqual(sampleTimeline(frames, 30, 0), frames[0]);
  const mid = sampleTimeline(frames, 30, 1.5 / 30);
  assert.ok(mid);
  assert.ok(Math.abs(mid.jaw - 0.15) < 1e-9, "두 프레임 사이는 선형 보간이어야 한다");
  assert.ok(Math.abs(mid.upperLift - 0.6) < 1e-9);
});

test("타임라인 끝을 지나면 중립이다", () => {
  // 마지막 프레임에서 굳어 있으면 오디오가 끝나도 입이 열린 채 남는다
  assert.equal(sampleTimeline(frames, 30, 10), null);
  assert.equal(sampleTimeline([], 30, 0), null);
});

test("허용 오차는 모델의 프레임 간격에서 나온다", () => {
  assert.ok(Math.abs(LAM_FRAME_STEP_SECONDS - 1 / 30) < 1e-12);
  // 실측: 오디오 3.2044 s / 타임라인 3.2333 s, 그리고 10.3793 s / 10.4 s
  assert.equal(durationDeltaWithinFrameStep(3.2044, 3.2333), true);
  assert.equal(durationDeltaWithinFrameStep(10.3793, 10.4), true);
  // 한 프레임을 넘는 어긋남은 전처리나 청크 분할이 틀어졌다는 뜻이다
  assert.equal(durationDeltaWithinFrameStep(3.2044, 3.5), false);
});

/* --------------------------------------------------------- 오디오 동일성 */

test("같은 생성물일 때만 동일성이 성립한다", () => {
  const a = "a".repeat(64);
  const b = "b".repeat(64);
  assert.equal(sameAudioSource(a, a, a), true);
  assert.equal(sameAudioSource(a, b, a), false, "LAM 이 다른 오디오를 읽었다");
  assert.equal(sameAudioSource(a, a, b), false, "응답에 다른 바이트가 실렸다");
  assert.equal(sameAudioSource("", "", ""), false, "빈 해시는 증거가 아니다");
});

test("두 공급자 모두 스스로 동일성을 확인한다", () => {
  // 불변식의 검사 지점은 공급자 안이다. 로컬은 디스크에서 읽은 바이트를, RunPod 은
  // 네트워크로 도착한 바이트를 직접 해싱한다 — 원격의 자기 신고를 믿지 않는다.
  const provider = read("src", "lib", "docent", "voiceProvider.ts");
  const checks = provider.match(/if \(\s*\n?\s*!sameAudioSource\(/g) ?? [];
  assert.equal(checks.length, 2, "local 과 runpod 이 각각 확인해야 한다");
  assert.match(provider, /audio identity invariant violated/);
  assert.match(provider, /audio identity invariant violated in transit/);
  // 두 구현 모두 자기가 만든 해시를 쓴다. 응답에 실린 것과 다른 값이면 의미가 없다.
  assert.equal(
    (provider.match(/createHash\("sha256"\)\.update\(audio\)\.digest\("hex"\)/g) ?? []).length,
    2,
  );
});

test("라우트는 동일성이 깨지면 200 을 주지 않는다", () => {
  const route = read("src", "app", "api", "docent", "voice", "route.ts");
  assert.match(route, /stage === "identity"/);
  assert.match(route, /audio identity invariant violated/);
  assert.match(route, /status: 500/);
  // 폴백으로 덮으면 깨진 불변식이 조용히 지나간다. 동일성 분기가 500 을 돌려줄
  // 때까지의 본문에 fallback 이 섞여 있으면 안 된다.
  const branch = /stage === "identity"\)[\s\S]*?status: 500/.exec(route);
  assert.ok(branch, "동일성 분기가 500 으로 끝나야 한다");
  assert.equal(
    branch[0].includes("fallback"), false,
    "동일성 실패는 브라우저 TTS 폴백으로 내려보내지 않는다",
  );
});

/* ------------------------------------------------------------ 합성 1회 계약 */

test("발화 하나에 합성은 한 번뿐이다", () => {
  const worker = read("voice", "supertonic_worker.py");
  // 요청 한 건이 synthesize 를 한 번만 부른다
  assert.equal((worker.match(/tts\.synthesize\(/g) ?? []).length, 1);
  assert.match(worker, /"synthesis_count": 1/);

  const lam = read("voice", "lam_worker.py");
  // LAM 은 합성하지 않는다 — 이미 만들어진 파일을 읽을 뿐이다
  assert.equal(lam.includes("synthesize"), false, "LAM worker must never synthesise");
  assert.match(lam, /lam_audio\.load\(wav_path, sr=cfg\.audio_sr\)/);
});

test("LAM 전처리 출처가 코드에 박혀 있다", () => {
  const lam = read("voice", "lam_worker.py");
  assert.match(lam, /engines\/infer\.py:121/);
  assert.match(lam, /preprocess-equivalence\.py/, "동등성 증거의 위치가 응답 문구에 있어야 한다");
  assert.match(lam, /sha256\(wav_path\)/, "분석한 파일의 해시를 되돌려줘야 한다");
});

/* ------------------------------------------------------------------ 휴지 */

test("휴지 자세는 완전한 0 이다", () => {
  for (const n of SEMANTIC_MOUTH_MORPHS) assert.equal(REST_POSE[n], 0);
  assert.deepEqual(semanticMouthPose(null), REST_POSE);
});

/* ------------------------------------------ LAM bootstrap 워밍업의 경계 */

test("LAM 워밍업은 합성이 아니고, 요청 경로와 같은 추론 루프를 쓴다", () => {
  const lam = read("voice", "lam_worker.py");
  // 워밍업은 Supertonic 을 부르지 않는다 — 합성 횟수는 사용자 발화당 1 그대로다
  assert.equal(lam.includes("synthesize"), false);
  assert.equal(lam.includes("supertonic"), false);
  // 합성 입력은 프로세스 안에서 만들고 지운다. 사용자 오디오 경로를 읽지 않는다.
  assert.match(lam, /tempfile\.mkstemp\(prefix="dd-lam-warmup-"/);
  assert.match(lam, /os\.remove\(path\)/);
  assert.match(lam, /np\.zeros\(int\(sample_rate \* seconds\), dtype=np\.int16\)/);
  // 워밍업과 요청 경로가 같은 함수를 돈다 — 워밍업이 딴 코드를 데우면 의미가 없다
  assert.equal((lam.match(/run_streaming\(/g) ?? []).length, 3, "정의 1 + 워밍업 1 + 요청 1");
  // READY 는 워밍업 성공 뒤에만, 실패하면 ready:false 로 알리고 종료한다
  assert.ok(lam.indexOf("warm = warm_up()") < lam.indexOf('"ready": True'));
  assert.match(lam, /"ready": False, "engine": "LAM-A2E", "stage": "warmup"/);
  assert.match(lam, /sys\.exit\(3\)/);
  // 워밍업 출력은 버려진다 — 프레임을 emit 하는 곳은 요청 경로 하나뿐
  assert.equal((lam.match(/"frames": frames/g) ?? []).length, 1);
});

test("LAM 워커의 프로덕션 경로에 librosa 가 없다", () => {
  // 2026-09-14: 콜드 워커 첫 LAM 호출 15.8 s 의 정체는 librosa lazy 서브모듈 import 시
  // numba ufunc 컴파일이었다 (load 뿐 아니라 엔진의 feature.rms 도 같은 세금을 낸다).
  // 워커는 librosa 를 import 하지 않고, 엔진 모듈의 librosa 바인딩을 soundfile+soxr+numpy
  // 재구현(shim)으로 바꾼다. 동등성: runpod/p3/preprocess-equivalence.py (11/11 비트 동일).
  const lam = read("voice", "lam_worker.py");
  const code = lam.replace(/^"""[\s\S]*?"""/m, "").split(/\r?\n/).filter((l) => !l.trim().startsWith("#")).join("\n");
  assert.equal(/^\s*import librosa/m.test(code), false, "lam_worker 가 librosa 를 import 한다");
  assert.equal(/librosa\.(load|feature|resample)\(/.test(code), false, "lam_worker 가 librosa 를 호출한다");
  assert.match(code, /_engine\.librosa = lam_audio\.LibrosaShim\(\)/);
  assert.match(code, /lam_audio\.load\(wav_path, sr=cfg\.audio_sr\)/);
  assert.match(code, /lam_audio\.load\(path, sr=cfg\.audio_sr\)/, "워밍업도 같은 디코더를 쓴다");

  const helper = read("voice", "lam_audio.py");
  const hcode = helper.replace(/^"""[\s\S]*?"""/m, "").split(/\r?\n/).filter((l) => !l.trim().startsWith("#")).join("\n");
  assert.equal(/^\s*(import|from)\s+(librosa|numba)/m.test(hcode), false, "helper 가 librosa/numba 를 끌어온다");
  assert.match(hcode, /^import soundfile as sf/m);
  assert.match(hcode, /^import soxr/m);
  // librosa 가 soxr 에 넘기는 품질 문자열 그대로 — 동등성 증거가 그 값으로 잡혔다
  assert.match(hcode, /RES_TYPE = "soxr_hq"/);
  // shim 에 없는 것을 부르면 조용히 librosa 로 떨어지지 않고 크게 실패한다
  assert.match(hcode, /def __getattr__\(self, name\):[\s\S]*?raise AttributeError/);
});

test("numba 캐시를 이미지에 굽는 단계는 없다 — 시도했고 효과가 없었다", () => {
  // 2026-09-14 컨테이너 CPU 실측: 캐시 46 파일을 구워 넣어도 librosa 첫 로드 28.5 s
  // (빈 캐시 18.7 s). cProfile: 25.3 s 중 20.2 s 가 @vectorize ufunc 의 import 시점
  // eager 컴파일이고, 그것은 numba 디스크 캐시를 타지 않았다. 효과 없는 단계와
  // 무의미한 ENV 를 다시 넣지 않도록 여기서 막는다. 증거: lam-worker-smoke-*.json,
  // numba_cache_warm.py.rejected (D:/dd-runpod-evidence/2026-09-11-p3-runpod-paid).
  const docker = read("runpod", "Dockerfile");
  assert.equal(docker.includes("NUMBA_CACHE_DIR"), false);
  assert.equal(docker.includes("NUMBA_CPU_NAME"), false);
  assert.equal(docker.includes("numba_cache_warm"), false);
});
