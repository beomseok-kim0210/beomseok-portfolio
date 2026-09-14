import { randomUUID } from "node:crypto";

import {
  VOICE_REQUEST_TIMEOUT_MS,
  redactSecretValues,
  voiceErrorCode,
} from "@/lib/docent/voiceWorkers";
import {
  VoiceProviderError,
  getVoiceProvider,
  type VoiceProvider,
  type VoiceResult,
} from "@/lib/docent/voiceProvider";
import { checkRateLimit } from "@/lib/docent/rateLimit";

// 로컬 백엔드가 child_process 와 파일시스템을 쓰므로 Node 런타임이 필수다.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/**
 * Vercel 함수 상한. 이 라우트는 스스로 VOICE_REQUEST_TIMEOUT_MS(130 s)에서 끊으므로
 * 플랫폼 상한은 그보다 넉넉하면 된다. Hobby + Fluid compute 의 기본·최대는 300 s
 * (vercel.com/docs/functions/configuring-functions/duration, 2026-09-14 열람).
 * 명시하는 이유는 플랫폼 기본값이 바뀌어도 이 라우트가 조용히 잘리지 않게 하기 위해서다.
 */
export const maxDuration = 150;

const MAX_TEXT_LENGTH = 600;

/**
 * 응답 본문 상한.
 *
 * Vercel Functions 의 응답 본문 한도는 4.5 MB 다 (공식 문서, 2026-09-10 열람).
 * 오디오를 base64 로 실어 보내므로 바이트가 약 4/3 로 부푼다. 실측에서 20.9 초
 * 발화가 1,847,012 B → base64 약 2.46 MB 였으니 대략 38 초쯤에서 한도를 넘는다.
 *
 * 플랫폼 경계에서 잘려 나가면 값비싼 합성과 추론을 다 끝낸 뒤에 실패한다. 그러느니
 * 여기서 먼저 알아채고 분명한 이유를 돌려준다.
 */
const MAX_RESPONSE_BYTES = 4_500_000;
const BASE64_OVERHEAD = 4 / 3;
/** JSON 의 타임라인·메타데이터 몫으로 남겨 두는 여유 */
const RESPONSE_HEADROOM_BYTES = 400_000;

/**
 * 레이트리밋의 식별자.
 *
 * `x-forwarded-for` 는 클라이언트가 마음대로 쓸 수 있는 헤더다. Vercel 은 자기가
 * 관측한 주소를 `x-vercel-forwarded-for` 로 따로 붙이므로 그쪽을 먼저 본다.
 *
 * 그래도 이것은 완전한 방어가 아니다. 상태가 인스턴스 메모리에 있어 인스턴스마다
 * 따로 세고 재시작하면 사라지며, IP 를 돌리면 우회된다. GPU 앞의 진짜 방어선은
 * 선택된 아키텍처의 서버-대-서버 경계(공유 비밀)이지 이 카운터가 아니다.
 */
function voiceClientKey(headers: Headers): string {
  const platform = headers.get("x-vercel-forwarded-for");
  if (platform) return platform.split(",")[0]!.trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/**
 * 로그에 경로·스택·비밀이 새지 않도록 다듬는다.
 *
 * 경로를 지우는 것만으로는 부족하다. 아래쪽 예외 문자열에는 자식 프로세스의
 * stderr 가 붙어 있고, 거기에 환경변수 값이 섞여 나올 수 있다. 이름 필터는
 * 자식에게 넘길 때 거르지만(voiceWorkers.childEnv), 값 자체도 한 번 더 지운다.
 */
function redact(detail: string): string {
  return redactSecretValues(detail)
    .replace(/[A-Za-z]:[\/][^\s"']*/g, "<path>")
    .replace(/(?:\/[\w.-]+){2,}/g, "<path>")
    .slice(0, 300);
}

/**
 * 하나의 발화를 준비한다.
 *
 *   text → Supertonic M1 → canonical WAV
 *                            ├→ 응답 본문 (브라우저가 재생할 바로 그 바이트)
 *                            └→ LAM-A2E (같은 파일)  → 프레임별 원시 채널
 *
 * 이 라우트의 존재 이유는 그 갈래가 한 지점에서 갈라진다는 것을 강제하는 데 있다.
 * 합성은 발화당 정확히 한 번이고, LAM 이 읽은 파일의 해시와 응답에 실린 바이트의
 * 해시가 다르면 200 을 주지 않는다.
 *
 * 그 연산이 이 프로세스 옆의 파이썬에서 도는지 RunPod GPU 에서 도는지는
 * `VoiceProvider` 뒤에 있다. 여기서 하는 일은 HTTP 쪽 몫이다 — 입력 검증,
 * 유량 제한, 플랫폼 크기 한도, 텔레메트리, 그리고 경계 있는 오류 변환.
 *
 * 취소에 대한 한계를 분명히 해 둔다: 브라우저가 요청을 끊어도 여기서 아래쪽 작업을
 * 멈추지 않는다. 로컬 워커 프로토콜에는 취소가 없고, RunPod `runsync` 도 연결을
 * 끊는다고 잡을 멈추지 않는다. 끊긴 요청은 GPU 를 놓아주지 않는다 — HTTP 연결만
 * 사라질 뿐이다.
 */
export async function POST(request: Request) {
  // 이 엔드포인트 뒤에는 직렬화된 합성과 단일 GPU 추론이 있다. 요청 하나가
  // 초 단위의 실제 연산을 잡아먹으므로, 채팅 라우트와 같은 완충 장치를 건다.
  const limit = checkRateLimit(voiceClientKey(request.headers));
  if (!limit.ok) {
    return Response.json(
      { error: "rate limited", retryAfterSec: limit.retryAfterSec, fallback: "browser_tts" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec ?? 60) } },
    );
  }

  let text: string;
  try {
    const body = (await request.json()) as { text?: unknown };
    if (typeof body.text !== "string") throw new Error("text must be a string");
    text = body.text.trim();
  } catch {
    return Response.json({ error: "invalid request body" }, { status: 400 });
  }
  if (!text) return Response.json({ error: "text is empty" }, { status: 400 });
  if (text.length > MAX_TEXT_LENGTH) {
    return Response.json({ error: `text exceeds ${MAX_TEXT_LENGTH} characters` }, { status: 413 });
  }

  let provider: VoiceProvider;
  try {
    provider = getVoiceProvider();
  } catch (err) {
    if (voiceErrorCode(err) === "VOICE_UNCONFIGURED") {
      // 설정이 없으면 클라이언트가 브라우저 TTS 폴백으로 내려갈 수 있어야 한다.
      return Response.json(
        { error: "voice backend not configured", fallback: "browser_tts" },
        { status: 503 },
      );
    }
    throw err;
  }

  const requestId = randomUUID().slice(0, 8);
  const utteranceId = randomUUID();
  const startedAt = Date.now();

  // 전체 상한. 아래 구현마다 자기 타이머가 있지만, 기동 대기와 큐 대기까지 합치면
  // 한 요청이 그 합보다 오래 매달릴 수 있다. 상수만 두고 쓰지 않으면 있지도 않은
  // 보장을 광고하는 셈이라, 여기서 실제로 건다.
  //
  // 준비 *전에* 시작한다. 워커 기동은 최대 90 초까지 걸릴 수 있고, 그것을 상한
  // 밖에 두면 130 초를 보장한다고 말하면서 실제로는 220 초를 붙들 수 있다.
  let overallTimer: ReturnType<typeof setTimeout> | undefined;
  const overall = new Promise<never>((_, rejectOverall) => {
    overallTimer = setTimeout(
      () => rejectOverall(new Error(`voice request exceeded ${VOICE_REQUEST_TIMEOUT_MS} ms`)),
      VOICE_REQUEST_TIMEOUT_MS,
    );
  });

  try {
    // 웜업 기회. 로컬은 두 워커를 겹쳐 올리고 (웜이면 공짜), RunPod 은 아무것도
    // 하지 않는다 — scale-to-zero 엔드포인트를 미리 깨우는 것은 웜업이 아니라
    // 과금이다. 이 호출도 try 안에 있어야 한다: 설정이 없을 때 던지는 것이 바로
    // 여기이고, 그 경우야말로 브라우저 TTS 폴백으로 내려가야 하는 경우다.
    await Promise.race([provider.prepare(), overall]);

    const result: VoiceResult = await Promise.race([
      provider.synthesize(text, utteranceId),
      overall,
    ]);

    const encodedBytes = Math.ceil(result.audio.byteLength * BASE64_OVERHEAD);
    if (encodedBytes + RESPONSE_HEADROOM_BYTES > MAX_RESPONSE_BYTES) {
      console.warn("[voice]", JSON.stringify({
        requestId, utteranceId, provider: provider.name, failureStage: "response_too_large",
        audioBytes: result.audio.byteLength, encodedBytes,
        audioDurationS: result.audioMeta.durationSeconds,
        totalMs: Date.now() - startedAt, fallbackUsed: true,
      }));
      return Response.json(
        { error: "generated audio exceeds the response size limit", stage: "response",
          audioDurationSeconds: result.audioMeta.durationSeconds, fallback: "browser_tts" },
        { status: 413 },
      );
    }

    // 구조화 로그. 사용자 발화 내용도, 오디오 바이트도, 경로도 담지 않는다.
    console.info("[voice]", JSON.stringify({
      requestId, utteranceId, engine: "supertonic+lam", provider: provider.name,
      coldStart: result.diagnostics.coldStart,
      ttsMs: result.diagnostics.synthesisMs, lamMs: result.diagnostics.inferenceMs,
      queueWaitMs: result.diagnostics.serverlessQueueMs,
      totalMs: Date.now() - startedAt,
      audioDurationS: result.audioMeta.durationSeconds, textLength: text.length,
      ttsRtf: result.diagnostics.ttsRtf, lamRtf: result.diagnostics.lamRtf,
      fallbackUsed: false, failureStage: null,
    }));

    return Response.json({
      utteranceId: result.utteranceId,
      engine: "supertonic+lam",
      provider: result.provider,
      voiceStyle: result.voiceStyle,
      audio: {
        base64: result.audio.toString("base64"),
        mimeType: "audio/wav",
        bytes: result.audioMeta.bytes,
        sampleRate: result.audioMeta.sampleRate,
        channels: result.audioMeta.channels,
        subtype: result.audioMeta.subtype,
        durationSeconds: result.audioMeta.durationSeconds,
        sha256: result.audioMeta.sha256,
      },
      timeline: result.timeline,
      identity: result.identity,
      diagnostics: { ...result.diagnostics, totalPrepMs: Date.now() - startedAt },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);

    // 대기열이 찬 것은 고장이 아니다. 잠시 뒤 다시 오라고 말해야 한다.
    if (voiceErrorCode(err) === "VOICE_CAPACITY") {
      console.warn("[voice]", JSON.stringify({
        requestId, utteranceId, provider: provider.name, failureStage: "capacity",
        totalMs: Date.now() - startedAt, fallbackUsed: true,
      }));
      return Response.json(
        { error: "voice backend is busy", stage: "voice", fallback: "browser_tts" },
        { status: 503, headers: { "Retry-After": "5" } },
      );
    }
    if (voiceErrorCode(err) === "VOICE_UNCONFIGURED") {
      return Response.json(
        { error: "voice backend not configured", fallback: "browser_tts" },
        { status: 503 },
      );
    }

    // 단계는 공급자가 말해 준다. 문자열 접두사로 알아맞히지 않는다.
    const stage = err instanceof VoiceProviderError
      ? err.stage
      : detail.startsWith("supertonic") ? "synthesis"
      : detail.startsWith("lam") ? "inference"
      : "voice";

    // 아래쪽 예외 문자열에는 모델 경로와 파이썬 트레이스가 섞여 있다. 진단은 서버
    // 로그에 남기고, 브라우저에는 어느 단계에서 멎었는지만 알려준다.
    console.error("[voice]", JSON.stringify({
      requestId, utteranceId, provider: provider.name, failureStage: stage,
      totalMs: Date.now() - startedAt, fallbackUsed: true, detail: redact(detail),
      ...(err instanceof VoiceProviderError && err.meta ? { meta: err.meta } : {}),
    }));

    // 불변식이 깨진 것은 폴백으로 덮을 일이 아니라 서버의 고장이다.
    if (stage === "identity") {
      return Response.json(
        { error: "audio identity invariant violated", stage }, { status: 500 },
      );
    }
    return Response.json(
      { error: "voice preparation failed", stage, fallback: "browser_tts" },
      { status: 502 },
    );
  } finally {
    clearTimeout(overallTimer);
    void overall.catch(() => undefined); // 경주에서 진 프로미스를 조용히 정리한다
  }
}
