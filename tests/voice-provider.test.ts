// VoiceProvider — 로컬 파이썬 워커와 RunPod Serverless 를 같은 계약 뒤에 두는 층.
//
// 여기서 검증하는 것은 실제 추론이 아니라 그 *경계*다: 어떤 구현이 선택되는가,
// 원격 응답 중 무엇을 믿고 무엇을 다시 확인하는가, 그리고 비밀이 새지 않는가.
// GPU 도 파이썬도 없이 돌아야 하므로 RunPod 왕복은 fetch 를 갈아끼워 대신한다.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import {
  VoiceProviderError,
  getVoiceProvider,
  type VoiceProvider,
} from "../src/lib/docent/voiceProvider";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (...p: string[]) => readFileSync(path.join(root, ...p), "utf8");

/** 이 테스트가 건드리는 환경변수. 매번 원래대로 되돌린다. */
const KEYS = [
  "DOCENT_VOICE_BACKEND",
  "RUNPOD_ENDPOINT_ID",
  "RUNPOD_API_KEY",
  "RUNPOD_TIMEOUT_MS",
] as const;

function withEnv<T>(patch: Partial<Record<(typeof KEYS)[number], string>>, fn: () => T): T {
  const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  try {
    for (const k of KEYS) delete process.env[k];
    for (const [k, v] of Object.entries(patch)) process.env[k] = v;
    return fn();
  } finally {
    for (const k of KEYS) {
      const v = saved[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

/** 실제 값이 아니라 형태만 맞는 자리표시자. 진짜 키는 이 저장소에 없다. */
const FAKE_ENDPOINT = "endpoint-placeholder";
const FAKE_KEY = "rp-placeholder-not-a-real-key";

/** assert.throws / assert.rejects 는 오류를 돌려주지 않는다. 잡아서 넘긴다. */
function caught(fn: () => unknown): { ddVoiceCode?: string } & Error {
  try {
    fn();
  } catch (err) {
    return err as never;
  }
  throw new assert.AssertionError({ message: "던지지 않았다" });
}

async function rejected(promise: Promise<unknown>): Promise<VoiceProviderError> {
  try {
    await promise;
  } catch (err) {
    assert.ok(err instanceof VoiceProviderError, `VoiceProviderError 가 아니다: ${err}`);
    return err;
  }
  throw new assert.AssertionError({ message: "거절되지 않았다" });
}

/* ------------------------------------------------------------------- 선택 */

test("기본 백엔드는 로컬이다", () => {
  withEnv({}, () => assert.equal(getVoiceProvider().name, "local"));
  withEnv({ DOCENT_VOICE_BACKEND: "local" }, () =>
    assert.equal(getVoiceProvider().name, "local"));
  // 대소문자와 앞뒤 공백으로 배포가 깨지지 않아야 한다
  withEnv({ DOCENT_VOICE_BACKEND: " RunPod " }, () => {
    process.env.RUNPOD_ENDPOINT_ID = FAKE_ENDPOINT;
    process.env.RUNPOD_API_KEY = FAKE_KEY;
    assert.equal(getVoiceProvider().name, "runpod");
  });
});

test("설정이 빠진 runpod 은 조용히 로컬로 내려가지 않는다", () => {
  // 프로덕션에서 키가 빠졌을 때 로컬 파이썬을 찾으러 가면, 있지도 않은 워커를
  // 띄우려다 엉뚱한 단계에서 죽는다. 설정 부재는 설정 부재로 말해야 한다.
  for (const patch of [
    { DOCENT_VOICE_BACKEND: "runpod" },
    { DOCENT_VOICE_BACKEND: "runpod", RUNPOD_ENDPOINT_ID: FAKE_ENDPOINT },
    { DOCENT_VOICE_BACKEND: "runpod", RUNPOD_API_KEY: FAKE_KEY },
  ]) {
    withEnv(patch, () => {
      assert.equal(caught(() => getVoiceProvider()).ddVoiceCode, "VOICE_UNCONFIGURED");
    });
  }
});

test("모르는 백엔드 이름은 거절한다", () => {
  withEnv({ DOCENT_VOICE_BACKEND: "modal" }, () => {
    assert.equal(caught(() => getVoiceProvider()).ddVoiceCode, "VOICE_UNCONFIGURED");
  });
});

/* --------------------------------------------------- RunPod 왕복 (fetch 대역) */

const SHA = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const AUDIO = Buffer.from("RIFF....fake wav bytes for the transport contract");
const AUDIO_SHA = SHA(AUDIO);

function runpodBody(over: Record<string, unknown> = {}) {
  const identity = {
    canonicalSha256: AUDIO_SHA,
    lamSourceSha256: AUDIO_SHA,
    responseSha256: AUDIO_SHA,
    sameSource: true,
    synthesisCount: 1,
    preprocessing: "librosa.load(sr=16000)",
    lamTargetSampleRate: 16000,
  };
  return {
    id: "job-1",
    status: "COMPLETED",
    executionTime: 1420,
    delayTime: 9130,
    output: {
      utteranceId: "u-1",
      voiceStyle: "M1",
      audio: {
        base64: AUDIO.toString("base64"),
        bytes: AUDIO.byteLength,
        sampleRate: 44100,
        channels: 1,
        subtype: "PCM_16",
        durationSeconds: 2,
        sha256: AUDIO_SHA,
      },
      timeline: { fps: 30, frameCount: 1, durationSeconds: 2, channels: {}, frames: [] },
      identity,
      diagnostics: { coldStart: true, synthesisMs: 900, inferenceMs: 260, workerInitMs: 13211 },
      ...over,
    },
  };
}

interface FetchCall { url: string; init: RequestInit }

async function withRunPod<T>(
  respond: (call: FetchCall) => unknown,
  fn: (provider: VoiceProvider, calls: FetchCall[]) => Promise<T>,
): Promise<T> {
  const calls: FetchCall[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init });
    const payload = respond({ url: String(url), init });
    if (payload instanceof Error) throw payload;
    return { ok: true, status: 200, json: async () => payload } as Response;
  }) as typeof fetch;
  try {
    const provider = withEnv(
      { DOCENT_VOICE_BACKEND: "runpod", RUNPOD_ENDPOINT_ID: FAKE_ENDPOINT,
        RUNPOD_API_KEY: FAKE_KEY },
      () => getVoiceProvider(),
    );
    return await fn(provider, calls);
  } finally {
    globalThis.fetch = realFetch;
  }
}

test("RunPod 웜업은 아무 요청도 보내지 않는다", async () => {
  // scale-to-zero 엔드포인트를 미리 깨우는 것은 웜업이 아니라 과금이다.
  await withRunPod(() => runpodBody(), async (provider, calls) => {
    await provider.prepare();
    assert.equal(calls.length, 0);
  });
});

test("정상 응답은 도착한 바이트로 다시 해싱해 통과시킨다", async () => {
  await withRunPod(() => runpodBody(), async (provider, calls) => {
    const r = await provider.synthesize("안녕하세요", "u-1");
    assert.equal(calls.length, 1);
    assert.match(calls[0]!.url, new RegExp(`/v2/${FAKE_ENDPOINT}/runsync$`));
    assert.equal(r.provider, "runpod");
    assert.equal(r.identity.responseSha256, AUDIO_SHA);
    assert.equal(r.identity.sameSource, true);
    assert.equal(r.identity.synthesisCount, 1);
    assert.deepEqual(r.audio, AUDIO);
    // RunPod 이 붙여 주는 시간은 진단에 그대로 실린다
    assert.equal(r.diagnostics.serverlessExecutionMs, 1420);
    assert.equal(r.diagnostics.serverlessQueueMs, 9130);
    assert.equal(r.diagnostics.coldStart, true);
    assert.equal(r.diagnostics.runpodJobId, "job-1");
    assert.equal(r.diagnostics.ttsRtf, 0.45); // 900 ms / 2 s
  });
});

test("전송 중에 바뀐 오디오는 200 이 되지 않는다", async () => {
  // 원격이 identity 를 뭐라고 신고하든, 실제로 도착한 바이트가 그 해시가 아니면
  // 사용자가 들을 소리와 LAM 이 본 소리가 같다는 보장이 사라진다.
  const tampered = Buffer.from("different bytes entirely");
  await withRunPod(
    () => runpodBody({
      audio: { base64: tampered.toString("base64"), bytes: tampered.byteLength,
               sampleRate: 44100, channels: 1, subtype: "PCM_16",
               durationSeconds: 2, sha256: AUDIO_SHA },
    }),
    async (provider) => {
      assert.equal((await rejected(provider.synthesize("안녕하세요", "u-1"))).stage, "identity");
    },
  );
});

test("핸들러 오류 코드가 단계로 옮겨진다", async () => {
  const cases: Array<[string, string]> = [
    ["TTS_FAILED", "synthesis"],
    ["LAM_FAILED", "inference"],
    ["NOT_READY", "voice"],
    ["INTERNAL_ERROR", "voice"],
  ];
  for (const [code, stage] of cases) {
    await withRunPod(
      () => ({ id: "job-x", status: "COMPLETED", output: { error: code, stage: "x" } }),
      async (provider) => {
        assert.equal((await rejected(provider.synthesize("t", "u"))).stage, stage, code);
      },
    );
  }
});

test("완료되지 않은 잡을 성공으로 읽지 않는다", async () => {
  for (const status of ["TIMED_OUT", "FAILED", "CANCELLED", "IN_QUEUE"]) {
    await withRunPod(() => ({ id: "job-x", status }), async (provider) => {
      assert.equal((await rejected(provider.synthesize("t", "u"))).stage, "transport");
    });
  }
});

test("필수 필드가 빠진 응답은 부분적으로 받아들이지 않는다", async () => {
  for (const missing of ["audio", "timeline", "identity"]) {
    await withRunPod(
      () => {
        const body = runpodBody();
        delete (body.output as Record<string, unknown>)[missing];
        return body;
      },
      async (provider) => {
        await rejected(provider.synthesize("t", "u"));
      },
    );
  }
});

/* ------------------------------------------------------------------ 비밀 */

test("API 키는 Authorization 헤더에만 있고 결과에는 없다", async () => {
  await withRunPod(() => runpodBody(), async (provider, calls) => {
    const r = await provider.synthesize("안녕하세요", "u-1");
    const headers = calls[0]!.init.headers as Record<string, string>;
    assert.equal(headers.Authorization, `Bearer ${FAKE_KEY}`);
    // 그 값이 응답 어디에도 섞여 나가면 안 된다
    const serialised = JSON.stringify({ ...r, audio: undefined });
    assert.equal(serialised.includes(FAKE_KEY), false);
  });
});

test("실패 경로의 오류에도 키가 실리지 않는다", async () => {
  await withRunPod(() => new Error(`connect ECONNREFUSED ${FAKE_KEY}`), async (provider) => {
    const err = await rejected(provider.synthesize("t", "u"));
    // 아래쪽 오류 문자열을 그대로 물고 오지 않는다 — 경계 있는 문구만 낸다
    assert.equal(err.message.includes(FAKE_KEY), false);
    assert.equal(JSON.stringify(err.meta ?? {}).includes(FAKE_KEY), false);
  });
});

/* ------------------------------------------------------------ 측정과 부재 */

test("측정되지 않은 진단값은 0 이 아니라 null 이다", async () => {
  await withRunPod(() => runpodBody({ diagnostics: {} }), async (provider) => {
    const d = (await provider.synthesize("t", "u")).diagnostics;
    for (const k of ["synthesisMs", "inferenceMs", "ttsRtf", "lamRtf", "jawOpenMax",
                     "jawOpenDistinct", "framesAboveThreshold", "activationThreshold",
                     "peakVramAllocated", "coldStart", "workerInitMs"] as const) {
      assert.equal(d[k], null, `${k} 는 없을 때 null 이어야 한다`);
    }
    assert.equal(d.outputShape, null);
  });
});

/* -------------------------------------------------------------- 환경 계약 */

test("환경 계약 파일에는 값이 아니라 이름만 있다", () => {
  const example = read(".env.example");
  for (const key of ["DOCENT_VOICE_BACKEND", "RUNPOD_ENDPOINT_ID", "RUNPOD_API_KEY",
                     "DD_SUPERTONIC_PYTHON", "DD_LAM_CKPT", "ANTHROPIC_API_KEY"]) {
    assert.match(example, new RegExp(`^${key}=`, "m"), `${key} 가 계약에 있어야 한다`);
  }
  // 비밀 자리는 반드시 비어 있어야 한다
  for (const secret of ["RUNPOD_API_KEY", "ANTHROPIC_API_KEY"]) {
    assert.match(example, new RegExp(`^${secret}=\\s*$`, "m"), `${secret} 에 값이 있다`);
  }
  // NEXT_PUBLIC_ 은 번들에 들어간다. 비밀에 붙으면 그 순간 공개된다.
  assert.equal(/^NEXT_PUBLIC_\w*(KEY|SECRET|TOKEN)/m.test(example), false);
});

test("코드에 엔드포인트 ID 나 키가 박혀 있지 않다", () => {
  const provider = read("src", "lib", "docent", "voiceProvider.ts");
  assert.match(provider, /process\.env\.RUNPOD_ENDPOINT_ID/);
  assert.match(provider, /process\.env\.RUNPOD_API_KEY/);
  // RunPod API 키의 실제 형식이 소스에 들어오면 걸린다
  assert.equal(/rpa_[A-Z0-9]{20,}/i.test(provider), false);
});

/* ------------------------------------------- §20 RunPod 왕복 타임아웃과 복구 */

/**
 * 응답하지 않는 엔드포인트를 흉내 낸다.
 *
 * 앞의 `withRunPod` 와 달리 abort 신호를 실제로 존중한다 — 타임아웃을 확인하려면
 * 대역 자체가 끊길 수 있어야 하기 때문이다.
 */
async function withSilentRunPod<T>(
  timeoutMs: number,
  fn: (provider: VoiceProvider) => Promise<T>,
): Promise<T> {
  const realFetch = globalThis.fetch;
  globalThis.fetch = ((_url: string, init: RequestInit) =>
    new Promise((_resolve, reject) => {
      const signal = init.signal!;
      signal.addEventListener("abort", () => {
        const err = new Error("The operation was aborted");
        err.name = "AbortError";
        reject(err);
      });
    })) as typeof fetch;
  try {
    const provider = withEnv(
      { DOCENT_VOICE_BACKEND: "runpod", RUNPOD_ENDPOINT_ID: FAKE_ENDPOINT,
        RUNPOD_API_KEY: FAKE_KEY, RUNPOD_TIMEOUT_MS: String(timeoutMs) },
      () => getVoiceProvider(),
    );
    return await fn(provider);
  } finally {
    globalThis.fetch = realFetch;
  }
}

test("응답하지 않는 RunPod 요청은 상한에서 끊긴다", async () => {
  // 상한이 없으면 잠든 엔드포인트 하나가 Vercel 함수를 그 한도까지 붙든다.
  const t0 = Date.now();
  const err = await withSilentRunPod(700, (p) => rejected(p.synthesize("t", "u")));
  const ms = Date.now() - t0;
  assert.equal(err.stage, "transport");
  assert.match(err.message, /exceeded 700 ms/);
  assert.ok(ms >= 600 && ms < 2_000, `끊기까지 ${ms} ms`);
  // 상한 값이 오류 문구에 있어야 운영에서 무엇을 조정할지 알 수 있다
  assert.equal(err.message.includes(FAKE_KEY), false);
});

test("타임아웃 뒤 다음 요청은 그대로 성공한다", async () => {
  // 로컬 워커와 달리 RunPod 공급자는 상태를 들고 있지 않다. 한 번의 타임아웃이
  // 그 다음 요청을 오염시키지 않는다는 것을 실제로 확인한다.
  await withSilentRunPod(400, (p) => rejected(p.synthesize("t", "u")));
  await withRunPod(() => runpodBody(), async (provider) => {
    const r = await provider.synthesize("안녕하세요", "u-2");
    assert.equal(r.identity.sameSource, true);
    assert.equal(r.identity.responseSha256, AUDIO_SHA);
  });
});

test("상한 환경변수가 잘못되면 안전한 기본값으로 돌아간다", () => {
  for (const bad of ["", "abc", "0", "-1"]) {
    withEnv(
      { DOCENT_VOICE_BACKEND: "runpod", RUNPOD_ENDPOINT_ID: FAKE_ENDPOINT,
        RUNPOD_API_KEY: FAKE_KEY, RUNPOD_TIMEOUT_MS: bad },
      () => {
        // 0 이나 음수를 그대로 쓰면 모든 요청이 즉시 취소된다
        const provider = getVoiceProvider() as unknown as { timeoutMs: number };
        assert.equal(provider.timeoutMs, 180_000, `RUNPOD_TIMEOUT_MS="${bad}"`);
      },
    );
  }
});

/* --------------------------------------------------- 합성 1회는 강제되어야 한다 */

test("synthesisCount 가 1 이 아니면 200 이 되지 않는다", async () => {
  // 해시 세 개가 같아도 합성이 두 번 일어났다면 불변식은 이미 깨져 있다.
  // Supertonic 은 시드 없는 flow-matching 이라 두 번째 합성은 다른 목소리다.
  // 이것을 보고만 받고 넘기면 전제가 아니라 주장이 된다.
  for (const count of [0, 2, undefined]) {
    await withRunPod(
      () => {
        const body = runpodBody();
        (body.output.identity as Record<string, unknown>).synthesisCount = count;
        return body;
      },
      async (provider) => {
        assert.equal((await rejected(provider.synthesize("t", "u"))).stage, "identity", `count=${count}`);
      },
    );
  }
});

/* ------------------------------------------- 원격이 말한 단계를 뭉개지 않는다 */

test("핸들러가 보낸 단계가 코드보다 우선한다", async () => {
  // 해시 불일치는 INTERNAL_ERROR + stage "identity" 로 온다. 코드만 읽으면 그것이
  // 일반 502 가 되어 라우트의 동일성 경계(500, 폴백 없음)를 그냥 지나간다.
  await withRunPod(
    () => ({ id: "j", status: "COMPLETED",
             output: { error: "INTERNAL_ERROR", stage: "identity" } }),
    async (provider) => {
      assert.equal((await rejected(provider.synthesize("t", "u"))).stage, "identity");
    },
  );
  // 모르는 단계 이름은 믿지 않는다 — 원격이 보낸 문자열이다
  await withRunPod(
    () => ({ id: "j", status: "COMPLETED",
             output: { error: "TTS_FAILED", stage: "../../etc/passwd" } }),
    async (provider) => {
      assert.equal((await rejected(provider.synthesize("t", "u"))).stage, "synthesis");
    },
  );
});

/* ---------------------------------------------- 자식은 비밀을 물려받지 않는다 */

test("워커 자식 환경에서 비밀 이름이 걸러지고 값도 로그에서 지워진다", async () => {
  const { redactSecretValues } = await import("../src/lib/docent/voiceWorkers");
  const saved = process.env.DD_TEST_FAKE_API_KEY;
  process.env.DD_TEST_FAKE_API_KEY = "not-a-real-key-0123456789";
  try {
    // 자식의 stderr 는 오류 메시지에 붙어 서버 로그로 나간다. 워커는 RunPod 키를
    // 알 필요가 전혀 없으므로 애초에 물려주지 않고, 값 자체도 한 번 더 지운다.
    const line = "worker exited: env dump not-a-real-key-0123456789 here";
    const red = redactSecretValues(line);
    assert.equal(red.includes("not-a-real-key-0123456789"), false);
    assert.match(red, /<redacted>/);
  } finally {
    if (saved === undefined) delete process.env.DD_TEST_FAKE_API_KEY;
    else process.env.DD_TEST_FAKE_API_KEY = saved;
  }

  const src = read("src", "lib", "docent", "voiceWorkers.ts");
  // spawn 이 process.env 를 통째로 물려주면 안 된다
  assert.equal(/env:\s*\{\s*\.\.\.process\.env/.test(src), false);
  assert.match(src, /\.\.\.childEnv\(\)/);
});

/* ------------------------------- 설정 부재는 폴백으로 내려가야 한다 (라우트) */

/** 매번 다른 주소로 보낸다 — 레이트리밋이 테스트 사이에 간섭하지 않도록. */
let clientSeq = 0;
function voiceRequest(text = "안녕하세요") {
  clientSeq += 1;
  return new Request("http://localhost/api/docent/voice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-vercel-forwarded-for": `203.0.113.${clientSeq % 250}`,
    },
    body: JSON.stringify({ text }),
  });
}

test("설정이 없으면 라우트가 503 + browser_tts 폴백을 준다", async () => {
  // 이것이 폴백이 반드시 동작해야 하는 바로 그 경우다. 준비 호출이 오류 경계
  // *밖*에 있으면 여기서 처리되지 않은 예외가 나고, 클라이언트는 폴백 신호가 없는
  // 일반 500 을 받는다 — 도슨트가 입만 벙긋하고 아무 말도 못 하게 된다.
  const { POST } = await import("../src/app/api/docent/voice/route");

  const saved: Record<string, string | undefined> = {};
  for (const k of ["DOCENT_VOICE_BACKEND", "DD_SUPERTONIC_PYTHON", "DD_SUPERTONIC_MODEL_DIR",
                   "DD_LAM_PYTHON", "DD_LAM_SRC", "DD_LAM_CKPT"]) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  try {
    const res = await POST(voiceRequest());
    assert.equal(res.status, 503, "설정 부재가 500 이 되면 안 된다");
    const body = (await res.json()) as { fallback?: string };
    assert.equal(body.fallback, "browser_tts");
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});

test("입력 검증은 백엔드를 건드리기 전에 끝난다", async () => {
  const { POST } = await import("../src/app/api/docent/voice/route");
  const bad = new Request("http://localhost/api/docent/voice", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-vercel-forwarded-for": "203.0.113.251" },
    body: JSON.stringify({ text: "   " }),
  });
  const res = await POST(bad);
  assert.equal(res.status, 400);

  const tooLong = new Request("http://localhost/api/docent/voice", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-vercel-forwarded-for": "203.0.113.252" },
    body: JSON.stringify({ text: "가".repeat(601) }),
  });
  assert.equal((await POST(tooLong)).status, 413);
});
