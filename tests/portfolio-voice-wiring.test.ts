// 실제 포트폴리오 경로가 Supertonic/LAM 을 쓰는지 파일로 따라간다.
//
// 진단 페이지나 스크립트가 아니라 사이트가 실제로 렌더하는 체인이어야 한다:
// /playground → DocentExperience → AvatarCanvas → DocentHead.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (...p: string[]) => readFileSync(path.join(root, ...p), "utf8");

const playground = read("src", "app", "playground", "page.tsx");
const experience = read("src", "features", "docent", "DocentExperience.tsx");
const canvas = read("src", "features", "docent", "AvatarCanvas.tsx");
const head = read("src", "features", "docent", "DocentHead.tsx");
const hook = read("src", "features", "docent", "useSupertonicVoice.ts");
const voice = read("src", "features", "docent", "useVoice.ts");

test("도슨트가 붙은 페이지가 DocentExperience 를 렌더한다", () => {
  assert.match(playground, /from "@\/features\/docent\/DocentExperience"/);
  assert.match(playground, /<DocentExperience\s*\/>/);
});

test("주 음성 경로가 프로덕션 컴포넌트 안에 있다", () => {
  assert.match(experience, /from "\.\/useSupertonicVoice"/);
  assert.match(experience, /const supertonic = useSupertonicVoice\(\)/);
  // LAM 자세가 아바타까지 내려가야 한다
  assert.match(experience, /<AvatarCanvas[^>]*mouth=\{supertonic\.mouth\}/);
  assert.match(canvas, /<DocentHead[^>]*mouth=\{mouth\}/);
});

test("LAM 자세가 viseme 라벨을 이긴다", () => {
  assert.match(head, /const pose = lamMouth \?\? semanticMouthPose\(viseme\)/);
});

test("폴백은 주 경로가 실패했을 때만 쓰인다", () => {
  // 조용히 내려가면 안 된다 — 실패한 뒤에만, 그리고 어느 엔진인지 남기면서
  assert.match(experience, /const outcome = await supertonic\.speak\(content\)/);
  assert.match(experience, /if \(outcome === "ok"\) \{\s*setLastEngine\("supertonic"\);\s*return;/);
  assert.match(experience, /setLastEngine\("browser_tts"\);\s*voice\.speak\(content\)/);
});

test("교체된 발화는 폴백을 켜지 않는다", () => {
  // A 가 B 로 교체됐을 때 A 의 호출부가 폴백을 켜면 두 목소리가 겹친다.
  // 실패와 교체가 같은 값으로 돌아오면 그 구분 자체가 불가능해진다.
  assert.match(hook, /export type SpeakOutcome = "ok" \| "failed" \| "superseded"/);
  assert.match(experience, /if \(outcome === "superseded"\) \{[\s\S]*?return;\s*\}/);
  // 교체 판정은 세대 비교에서만 나와야 한다
  const supersededReturns = (hook.match(/return "superseded"/g) ?? []).length;
  assert.ok(supersededReturns >= 4, `expected every generation check to return superseded, got ${supersededReturns}`);
  for (const m of hook.matchAll(/if \(gen !== genRef\.current\) return ([^;]+);/g)) {
    assert.match(m[1], /"superseded"|$/, "generation mismatch must never report failure");
    assert.equal(m[1].includes('"failed"'), false);
  }
});

test("음성 라우트에 레이트리밋이 걸려 있다", () => {
  // 이 엔드포인트 뒤에는 직렬화된 CPU 합성과 단일 GPU 추론이 있다
  const route = read("src", "app", "api", "docent", "voice", "route.ts");
  assert.match(route, /checkRateLimit\(voiceClientKey\(request\.headers\)\)/);
  // 클라이언트가 마음대로 쓰는 x-forwarded-for 를 무조건 믿지 않는다
  assert.match(route, /x-vercel-forwarded-for/);
  assert.match(route, /status: 429/);
  assert.match(route, /"Retry-After"/);
});

test("서버 오류 문자열이 브라우저로 새지 않는다", () => {
  const route = read("src", "app", "api", "docent", "voice", "route.ts");
  // 워커 예외에는 모델 경로와 파이썬 트레이스가 섞여 있다
  assert.equal(/reason: message/.test(route), false);
  assert.equal(/reason: err\.message/.test(route), false);
  assert.match(route, /console\.error\("\[voice\]"/);
  assert.match(route, /stage, fallback: "browser_tts"/);
  // 상세 문자열은 서버 로그에만, 응답 본문에는 stage 만
  assert.equal(/detail,?\s*\}\s*,\s*\{ status: 502/.test(route), false);
});

test("용량 초과는 고장이 아니라 503 으로 답한다", () => {
  const route = read("src", "app", "api", "docent", "voice", "route.ts");
  assert.match(route, /voiceErrorCode\(err\) === "VOICE_CAPACITY"/);
  // instanceof 는 globalThis 캐시가 hot reload 를 넘길 때 조용히 false 가 된다
  assert.equal(/instanceof Voice(CapacityExceeded|BackendUnavailable)/.test(route), false);
  assert.match(route, /status: 503, headers: \{ "Retry-After": "5" \}/);
  const workers = read("src", "lib", "docent", "voiceWorkers.ts");
  // 대기열은 유한해야 한다
  assert.match(workers, /MAX_PENDING_PER_WORKER = \d+/);
  assert.match(workers, /this\.inFlight >= this\.maxPending/);
});

test("전체 요청 상한이 선언만 되어 있지 않고 실제로 걸린다", () => {
  const route = read("src", "app", "api", "docent", "voice", "route.ts");
  // 상수만 두고 쓰지 않으면 있지도 않은 보장을 광고하는 셈이다
  assert.match(route, /VOICE_REQUEST_TIMEOUT_MS/);
  assert.match(route, /Promise\.race\(\[/);
  assert.match(route, /clearTimeout\(overallTimer\)/);
});

test("응답 크기를 플랫폼 한도에 대해 먼저 막는다", () => {
  const route = read("src", "app", "api", "docent", "voice", "route.ts");
  assert.match(route, /MAX_RESPONSE_BYTES = 4_500_000/);
  assert.match(route, /status: 413/);
  assert.match(route, /encodedBytes \+ RESPONSE_HEADROOM_BYTES > MAX_RESPONSE_BYTES/);
});

test("실패 로그의 상세 문자열은 경로를 지운 뒤 남긴다", () => {
  const route = read("src", "app", "api", "docent", "voice", "route.ts");
  assert.match(route, /detail: redact\(detail\)/);
  assert.match(route, /function redact\(/);
  // 다듬지 않은 detail 이 그대로 로그에 들어가면 안 된다
  assert.equal(/fallbackUsed: true, detail,/.test(route), false);
});

test("옛 자식의 죽음이 교체 워커를 죽이지 않는다", () => {
  const workers = read("src", "lib", "docent", "voiceWorkers.ts");
  assert.match(workers, /if \(dead\) return;/);
  assert.match(workers, /if \(this\.child !== child\)/);
  // 죽음 처리에서 집계를 0으로 밀면 살아 있는 대기열이 계수에서 사라진다
  assert.equal(/this\.inFlight = 0;/.test(workers), false);
});

test("기동과 무응답 워커에 상한이 있다", () => {
  // 이 단언은 상한이 *선언되어* 있는지만 본다. 실제로 그 시간 안에 끊기는지,
  // 매달린 자식이 버려지는지, 다음 요청이 살아나는지는 소스 텍스트로 알 수 없다 —
  // 그것은 worker-lifecycle.test.ts 가 진짜 프로세스를 몰아서 확인한다.
  const workers = read("src", "lib", "docent", "voiceWorkers.ts");
  assert.match(workers, /STARTUP_TIMEOUT_MS = [\d_]+/);
  assert.match(workers, /die\("startup timed out"/);
  // 타임아웃난 워커는 즉시 버려져야 한다 — exit 통지를 기다리면 그 사이에 들어온
  // 요청이 죽어 가는 자식에게 쓰고 또 한 번 상한을 문다.
  assert.match(workers, /this\.abandon\("timeout"\)/);
  assert.match(workers, /private abandon\(stage: string\): void/);
});

test("노드가 끝나면 자식 파이썬도 끝난다", () => {
  const workers = read("src", "lib", "docent", "voiceWorkers.ts");
  assert.match(workers, /dispose\(\): void/);
  assert.match(workers, /process\.once\("exit", stop\)/);
  assert.match(workers, /SIGINT/);
});

test("워커는 상태기계와 유한한 재시작 정책을 갖는다", () => {
  const workers = read("src", "lib", "docent", "voiceWorkers.ts");
  for (const st of ["STOPPED", "STARTING", "READY", "BUSY", "FAILED"]) {
    assert.match(workers, new RegExp(`"${st}"`));
  }
  assert.match(workers, /MAX_RESTARTS_PER_WINDOW = \d+/);
  assert.match(workers, /RESTART_WINDOW_MS = [\d_]+/);
  // 죽으면 진행 중이던 요청을 전부 실패시키고 다시 띄울 수 있어야 한다
  assert.match(workers, /for \(const \[, p\] of this\.pending\) p\.reject\(err\)/);
  assert.match(workers, /this\.ready = null;/);
});

test("타임아웃은 요청을 버리되 매니저를 BUSY 로 남기지 않는다", () => {
  const workers = read("src", "lib", "docent", "voiceWorkers.ts");
  assert.match(workers, /timed out after \$\{timeoutMs\} ms/);
  assert.match(workers, /if \(this\.state === "BUSY"\) this\.state = this\.child \? "READY" : "FAILED"/);
  // 상한값은 실측에 근거가 있어야 한다
  assert.match(workers, /SUPERTONIC_TIMEOUT_MS = [\d_]+/);
  assert.match(workers, /LAM_TIMEOUT_MS = [\d_]+/);
});

test("헬스체크는 워커를 깨우지 않고 비밀을 흘리지 않는다", () => {
  const health = read("src", "app", "api", "docent", "voice", "health", "route.ts");
  assert.match(health, /voiceBackendHealth\(\)/);
  assert.match(health, /status: "idle"/);
  // 경로·환경변수 값·스택트레이스가 응답에 없어야 한다
  assert.equal(/process\.env\[/.test(health), false);
  assert.equal(/[A-Z]:\//.test(health), false);
  assert.equal(health.includes("stack"), false);
  const workers = read("src", "lib", "docent", "voiceWorkers.ts");
  assert.match(workers, /export function voiceBackendHealth/);
  // 상태 조회가 start\(\) 를 부르면 헬스체크가 모델 로드를 유발한다
  assert.equal(/voiceBackendHealth[\s\S]{0,400}\.start\(\)/.test(workers), false);
});

test("텔레메트리에 사용자 발화 내용이 들어가지 않는다", () => {
  const route = read("src", "app", "api", "docent", "voice", "route.ts");
  const logs = [...route.matchAll(/console\.(info|warn|error)\("\[voice\]",? ?JSON\.stringify\(\{([\s\S]*?)\}\)\)/g)];
  assert.ok(logs.length >= 2, "expected structured logs on success and failure");
  for (const m of logs) {
    assert.equal(/text(?!Length)/.test(m[2]), false, "raw text must not be logged");
    assert.equal(m[2].includes("base64"), false);
    assert.equal(m[2].includes("wavPath"), false);
  }
  // 길이는 남겨도 된다 — 내용이 아니다
  assert.match(route, /textLength: text\.length/);
});

test("개발 진단 전역은 effect 에서 걸고 언마운트에서 사라진다", () => {
  // 렌더에서 걸면 StrictMode 의 이중 호출이 cleanup 을 먼저 돌려 값을 지운다
  assert.match(experience, /delete \(window as unknown as \{ __ddVoice\?: unknown \}\)\.__ddVoice/);
  assert.match(head, /delete w\.__ddHeadProbe/);
  assert.match(head, /delete w\.__ddHeadAudit/);
  assert.match(head, /w\.__ddHeadAudit = audit/);
  // 프로덕션 빌드에는 아예 존재하지 않아야 한다
  assert.match(head, /const DEV = process\.env\.NODE_ENV !== "production"/);
  assert.match(experience, /const DEV = process\.env\.NODE_ENV !== "production"/);
});

test("브라우저 speechSynthesis 는 주 엔진이 아니다", () => {
  // 주 경로 훅은 speechSynthesis 를 아예 건드리지 않는다
  assert.equal(hook.includes("speechSynthesis"), false);
  // 폴백 쪽에는 그대로 남아 있어야 한다
  assert.match(voice, /speechSynthesis/);
});

test("얼굴 시계는 오디오 재생 시계다", () => {
  assert.match(hook, /sampleTimeline\(frames, fps, a\.currentTime\)/);
  // 글자 수 추정이 주 경로로 새어 들어오면 안 된다
  assert.equal(hook.includes("estimateCharsPerSecond"), false);
  assert.equal(hook.includes("charsPerSecond"), false);
});

test("발화가 끝나거나 취소되면 입이 중립으로 돌아간다", () => {
  assert.match(hook, /setMouth\(null\); \/\/ 끝나면 중립/);
  assert.match(hook, /setMouth\(null\); \/\/ 입은 중립으로 돌아간다/);
});

test("발화 세대로 이전 발화를 무효화한다", () => {
  assert.match(hook, /const gen = \+\+genRef\.current/);
  assert.match(hook, /if \(gen !== genRef\.current\) return/);
  // 언마운트 정리
  assert.match(hook, /useEffect\(\(\) => \(\) => \{\s*genRef\.current \+= 1;\s*teardown\(\);/);
});

test("Blob URL 과 오디오 엘리먼트를 놓아준다", () => {
  assert.match(hook, /URL\.revokeObjectURL/);
  assert.match(hook, /audioRef\.current = null/);
  assert.match(hook, /cancelAnimationFrame/);
  assert.match(hook, /abortRef\.current\?\.abort\(\)/);
});

test("모델 경로는 환경변수로만 들어온다", () => {
  const workers = read("src", "lib", "docent", "voiceWorkers.ts");
  for (const name of ["DD_SUPERTONIC_PYTHON", "DD_SUPERTONIC_MODEL_DIR",
                      "DD_LAM_PYTHON", "DD_LAM_SRC", "DD_LAM_CKPT"]) {
    assert.match(workers, new RegExp(name));
  }
  // 로컬 절대경로가 소스에 박히면 배포에서 새고 이식성도 없다
  assert.equal(/[A-Z]:\//.test(workers), false, "absolute local path hard-coded");
  const route = read("src", "app", "api", "docent", "voice", "route.ts");
  assert.equal(/[A-Z]:\//.test(route), false, "absolute local path hard-coded");
});

test("본체는 이 게이트에서도 붙지 않는다", () => {
  for (const [name, src] of [["DocentHead", head], ["AvatarCanvas", canvas],
                             ["DocentExperience", experience]] as const) {
    assert.equal(/docent-body|sf3d|SF3D/.test(src), false, `${name} references a body asset`);
  }
});
