import path from "node:path";
import { createHash } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import {
  LAM_TIMEOUT_MS,
  SUPERTONIC_TIMEOUT_MS,
  getVoiceBackend,
  voiceBackendConfigured,
  warmupVoiceBackend,
  type LamResult,
  type SupertonicResult,
} from "./voiceWorkers";
import { sameAudioSource } from "./voiceTimeline";

/**
 * 음성 추론이 어디서 도는지를 라우트로부터 감춘다.
 *
 * 개발 기계에서는 파이썬 워커가 옆 프로세스로 상주하고, 프로덕션에서는 RunPod
 * Serverless 워커가 GPU 위에서 요청마다 깨어난다. 라우트가 신경 쓸 것은 둘의
 * 차이가 아니라 돌아온 결과가 같은 계약을 지키는지다.
 *
 * 두 구현 모두 같은 불변식을 지고 온다: 합성은 발화당 한 번, 그리고 재생될
 * 바이트와 LAM 이 읽은 바이트가 같은 생성물이어야 한다. 그 확인은 두 구현
 * *각각* 이 스스로 한다 — 원격이 "같습니다" 라고 말한 것을 믿지 않는다.
 *
 * 측정되지 않은 값은 null 로 남긴다. 0 은 "없음" 의 표현이 아니다.
 */

export interface VoiceTimelineFrameDTO {
  t: number;
  jaw: number;
  round: number;
  stretch: number;
  upperLift: number;
}

export interface VoiceDiagnostics {
  coldStart: boolean | null;
  synthesisMs: number | null;
  inferenceMs: number | null;
  ttsRtf: number | null;
  lamRtf: number | null;
  jawOpenMax: number | null;
  jawOpenDistinct: number | null;
  framesAboveThreshold: number | null;
  activationThreshold: number | null;
  peakVramAllocated: number | null;
  outputShape: number[] | null;
  /** RunPod 경로에서만 채워진다. 로컬에서는 null. */
  runpodJobId: string | null;
  serverlessExecutionMs: number | null;
  serverlessQueueMs: number | null;
  workerInitMs: number | null;
}

export interface VoiceResult {
  provider: "local" | "runpod";
  utteranceId: string;
  voiceStyle: string;
  audio: Buffer;
  audioMeta: {
    bytes: number;
    sampleRate: number;
    channels: number;
    subtype: string;
    durationSeconds: number;
    sha256: string;
  };
  timeline: {
    fps: number;
    frameCount: number;
    durationSeconds: number;
    channels: Record<string, string>;
    frames: VoiceTimelineFrameDTO[];
  };
  identity: {
    canonicalSha256: string;
    lamSourceSha256: string;
    responseSha256: string;
    sameSource: true;
    synthesisCount: number;
    preprocessing: string;
    lamTargetSampleRate: number;
  };
  diagnostics: VoiceDiagnostics;
}

/** 라우트가 HTTP 로 옮길 수 있는, 경계 있는 실패. */
export type VoiceFailureStage =
  | "synthesis"
  | "inference"
  | "identity"
  | "transport"
  | "unconfigured"
  | "voice";

export class VoiceProviderError extends Error {
  readonly stage: VoiceFailureStage;
  /** 서버 로그에만 남는다. 응답 본문에는 실리지 않는다. */
  readonly meta: Record<string, unknown> | undefined;

  constructor(stage: VoiceFailureStage, message: string, meta?: Record<string, unknown>) {
    super(message);
    this.name = "VoiceProviderError";
    this.stage = stage;
    this.meta = meta;
  }
}

/**
 * 설정이 없어 이 백엔드를 쓸 수 없다.
 *
 * `voiceWorkers` 와 같은 문자열 코드를 단다. `instanceof` 로 판별하지 않는 이유는
 * 거기 적어 둔 것과 같다 — 인스턴스가 `globalThis` 캐시를 타고 모듈 경계를 넘으면
 * 클래스 동일성이 조용히 깨진다.
 */
export class VoiceProviderUnavailable extends Error {
  readonly ddVoiceCode = "VOICE_UNCONFIGURED";
}

/** `warm()` 이 한 일. 비용이 드는 것은 `started` 뿐이다. */
export type WarmOutcome = "already-warm" | "started" | "unavailable";

export interface VoiceProvider {
  readonly name: "local" | "runpod";
  /** 웜업 기회. 로컬은 워커를 겹쳐 올리고, RunPod 은 아무것도 하지 않는다. */
  prepare(): Promise<void>;
  /**
   * 요청이 오기 전에 워커를 미리 깨운다.
   *
   * scale-to-zero 엔드포인트의 콜드 스타트는 대부분 우리 코드 밖(GPU 배정 + 컨테이너
   * 기동)이라 합성 시점에는 줄일 수 없다. 사용자가 음성을 켜는 순간처럼 **합성보다
   * 앞선 신호**에 이것을 걸어야 그 시간이 타이핑·답변 생성과 겹친다.
   */
  warm(): Promise<WarmOutcome>;
  synthesize(text: string, utteranceId: string): Promise<VoiceResult>;
}

const rtf = (ms: number | null | undefined, seconds: number): number | null =>
  typeof ms === "number" && seconds > 0 ? +(ms / 1000 / seconds).toFixed(4) : null;

/* -------------------------------------------------------------------- local */

class LocalVoiceProvider implements VoiceProvider {
  readonly name = "local" as const;

  private backend() {
    return getVoiceBackend(path.join(process.cwd(), "voice"));
  }

  async prepare(): Promise<void> {
    // 하나라도 준비에 실패하면 여기서 거절한다 (이유 포함). 라우트는 이것을 502 +
    // 브라우저 TTS 폴백으로 바꾼다. 삼키고 진행하면 첫 요청 안에서 재기동과
    // 워밍업을 다시 치르게 된다.
    // 설정 부재(VOICE_UNCONFIGURED)는 여기서 감싸지 않는다 — 라우트가 그 코드를 보고
    // 503 + 폴백으로 보내야 한다. 감싸는 것은 *준비 실패* 뿐이다.
    const backend = this.backend();
    try {
      await warmupVoiceBackend(backend);
    } catch (err) {
      throw new VoiceProviderError("voice", "voice workers failed to become ready", {
        reason: err instanceof Error ? err.message.slice(0, 300) : String(err),
      });
    }
  }

  /** 로컬은 prepare() 가 곧 웜업이다 — 따로 할 일이 없다. */
  async warm(): Promise<WarmOutcome> {
    await this.prepare();
    return "already-warm";
  }

  async synthesize(text: string, utteranceId: string): Promise<VoiceResult> {
    const backend = this.backend();
    const workDir = backend.config.workDir || path.join(tmpdir(), "dd-voice");
    const wavPath = path.join(workDir, `${utteranceId}.wav`);

    try {
      const tts = (await backend.supertonic.send(
        { text, out: wavPath },
        SUPERTONIC_TIMEOUT_MS,
      )) as unknown as SupertonicResult;

      const lam = (await backend.lam.send(
        { wav: wavPath },
        LAM_TIMEOUT_MS,
      )) as unknown as LamResult;

      const audio = await readFile(wavPath);
      const responseSha = createHash("sha256").update(audio).digest("hex");

      if (!sameAudioSource(tts.sha256, lam.lam_source_sha256, responseSha)) {
        throw new VoiceProviderError("identity", "audio identity invariant violated", {
          canonicalSha256: tts.sha256,
          lamSourceSha256: lam.lam_source_sha256,
          responseSha256: responseSha,
        });
      }
      // 합성이 발화당 한 번이라는 것은 이 시스템의 전제다. 그것을 *보고만* 받고
      // 넘기면 전제가 아니라 주장이 된다. Supertonic 은 시드 없는 flow-matching 이라
      // 두 번 합성하면 두 개의 다른 목소리가 나오고, 그러면 해시가 같아도 사용자가
      // 들은 소리와 LAM 이 본 소리가 같다는 보장이 무너진다.
      if (tts.synthesis_count !== 1) {
        throw new VoiceProviderError("identity", "synthesis did not happen exactly once", {
          synthesisCount: tts.synthesis_count,
        });
      }
      if (lam.nan_count > 0 || lam.inf_count > 0) {
        throw new VoiceProviderError("inference", "LAM produced a non-finite timeline", {
          nan: lam.nan_count,
          inf: lam.inf_count,
        });
      }

      return {
        provider: this.name,
        utteranceId,
        voiceStyle: tts.voice_style,
        audio,
        audioMeta: {
          bytes: tts.bytes,
          sampleRate: tts.sample_rate,
          channels: tts.channels,
          subtype: tts.subtype,
          durationSeconds: tts.duration_s,
          sha256: responseSha,
        },
        timeline: {
          fps: lam.fps,
          frameCount: lam.frame_count,
          durationSeconds: lam.timeline_duration_s,
          channels: lam.channels,
          frames: lam.frames,
        },
        identity: {
          canonicalSha256: tts.sha256,
          lamSourceSha256: lam.lam_source_sha256,
          responseSha256: responseSha,
          sameSource: true,
          synthesisCount: tts.synthesis_count,
          preprocessing: lam.preprocessing,
          lamTargetSampleRate: lam.target_sample_rate,
        },
        diagnostics: {
          // 상주 워커에는 "콜드 스타트" 라는 구분이 없다. 모른다고 말한다.
          coldStart: null,
          synthesisMs: tts.synthesis_ms,
          inferenceMs: lam.inference_ms,
          ttsRtf: rtf(tts.synthesis_ms, tts.duration_s),
          lamRtf: rtf(lam.inference_ms, lam.audio_duration_s),
          jawOpenMax: lam.jawopen_max,
          jawOpenDistinct: lam.jawopen_distinct,
          framesAboveThreshold: lam.frames_above_threshold,
          activationThreshold: lam.activation_threshold,
          peakVramAllocated: lam.peak_vram_allocated,
          outputShape: lam.output_shape,
          runpodJobId: null,
          serverlessExecutionMs: null,
          serverlessQueueMs: null,
          workerInitMs: null,
        },
      };
    } finally {
      // 정본 오디오는 응답에 실려 나간다. 디스크에 남길 이유가 없다.
      await rm(wavPath, { force: true }).catch(() => undefined);
    }
  }
}

/* ------------------------------------------------------------------- runpod */

interface RunPodOutput {
  utteranceId?: string;
  voiceStyle?: string;
  error?: string;
  stage?: string;
  /** 핸들러의 진단 문구. 서버 로그까지만 간다 — 응답 본문에는 실리지 않는다. */
  detail?: string;
  audio?: {
    base64: string;
    bytes: number;
    sampleRate: number;
    channels: number;
    subtype: string;
    durationSeconds: number;
    sha256: string;
  };
  timeline?: VoiceResult["timeline"];
  identity?: Omit<VoiceResult["identity"], "sameSource"> & { sameSource: boolean };
  diagnostics?: Record<string, unknown>;
}

interface RunPodEnvelope {
  id?: string;
  status?: string;
  output?: RunPodOutput;
  error?: string;
  executionTime?: number;
  delayTime?: number;
}

/**
 * 예열용 최소 발화. 짧을수록 GPU 시간이 덜 든다 — 목적은 소리가 아니라 워커 기동이다.
 * Supertonic 은 빈 문자열을 거부하므로 한 음절은 필요하다.
 */
const WARM_TEXT = "네";

/** 핸들러가 낼 수 있는 코드 → 라우트가 아는 단계. */
const RUNPOD_STAGE: Record<string, VoiceFailureStage> = {
  INVALID_INPUT: "voice",
  NOT_READY: "voice",
  TTS_FAILED: "synthesis",
  LAM_FAILED: "inference",
  RESPONSE_TOO_LARGE: "voice",
  INTERNAL_ERROR: "voice",
};

/**
 * 핸들러는 코드와 단계를 따로 보낸다. 코드만 보면 정보가 뭉개진다 — 해시 불일치는
 * INTERNAL_ERROR + stage "identity" 로 오는데, 코드만 읽으면 그것이 일반 502 가
 * 되어 라우트의 동일성 경계(500, 폴백 없음)를 그냥 지나간다.
 *
 * 그렇다고 원격이 보낸 문자열을 그대로 믿지도 않는다. 아는 이름만 통과시킨다.
 */
const RUNPOD_HANDLER_STAGE: Record<string, VoiceFailureStage> = {
  validate: "voice",
  init: "voice",
  synthesis: "synthesis",
  inference: "inference",
  identity: "identity",
  response: "voice",
};

class RunPodVoiceProvider implements VoiceProvider {
  readonly name = "runpod" as const;

  private readonly endpointId: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(endpointId: string, apiKey: string, timeoutMs: number) {
    this.endpointId = endpointId;
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
  }

  /**
   * 아무것도 하지 않는다.
   *
   * scale-to-zero 엔드포인트를 미리 깨우는 것은 웜업이 아니라 과금이다. 워커를
   * 띄우는 유일한 이유는 실제 발화 요청이어야 한다.
   */
  async prepare(): Promise<void> {}

  /**
   * 먼저 `/health` 로 물어본다 — 조회는 공짜이고 워커를 깨우지 않는다. 이미 떠 있으면
   * 아무것도 하지 않는다. 비어 있을 때만 짧은 작업 하나를 **비동기**(`/run`)로 던져
   * 워커를 올린다. 결과는 쓰지 않는다 — 목적은 산출물이 아니라 기동이다.
   *
   * 실패는 삼킨다. 예열은 최선 노력이고, 실패해도 실제 합성 요청이 평소대로 콜드를
   * 겪을 뿐 사용자에게 보일 오류가 아니다.
   */
  async warm(): Promise<WarmOutcome> {
    const health = await probeRunPod(5000);
    if (!health.reachable) return "unavailable";
    const w = (health.workers ?? {}) as Record<string, number>;
    if ((w.ready ?? 0) > 0 || (w.idle ?? 0) > 0 || (w.running ?? 0) > 0 || (w.initializing ?? 0) > 0) {
      return "already-warm";
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(`https://api.runpod.ai/v2/${this.endpointId}/run`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ input: { text: WARM_TEXT, utteranceId: `warm-${Date.now()}` } }),
        signal: controller.signal,
      });
      return res.ok ? "started" : "unavailable";
    } catch {
      return "unavailable";
    } finally {
      clearTimeout(timer);
    }
  }

  async synthesize(text: string, utteranceId: string): Promise<VoiceResult> {
    const envelope = await this.runSync({ text, utteranceId });

    if (envelope.status && envelope.status !== "COMPLETED") {
      // 봉투의 error 는 워커 안에서 무엇이 죽었는지 말해 주는 유일한 단서다.
      // 버리면 "transport 실패" 라는 말만 남아 원격에서는 진단할 방법이 없어진다.
      throw new VoiceProviderError("transport", `runpod job ${envelope.status}: ${envelope.error ?? "no error detail"}`, {
        status: envelope.status,
        jobId: envelope.id,
        runpodError: envelope.error,
      });
    }
    const out = envelope.output;
    if (!out) {
      throw new VoiceProviderError("transport", "runpod returned no output", {
        jobId: envelope.id,
      });
    }
    if (out.error) {
      const stage = (out.stage ? RUNPOD_HANDLER_STAGE[out.stage] : undefined)
        ?? RUNPOD_STAGE[out.error]
        ?? "voice";
      throw new VoiceProviderError(stage, `runpod handler reported ${out.error}`, {
        jobId: envelope.id,
        handlerStage: out.stage,
        code: out.error,
        detail: typeof out.detail === "string" ? out.detail.slice(0, 400) : undefined,
      });
    }
    if (!out.audio || !out.timeline || !out.identity) {
      throw new VoiceProviderError("transport", "runpod output is missing required fields", {
        jobId: envelope.id,
      });
    }

    const audio = Buffer.from(out.audio.base64, "base64");
    const responseSha = createHash("sha256").update(audio).digest("hex");

    // 원격이 스스로 "같다" 고 말한 것으로는 부족하다. 여기 도착한 바이트를 직접
    // 해싱해서, 전송 중에 무엇이 바뀌었더라도 걸리게 한다.
    if (
      !sameAudioSource(out.identity.canonicalSha256, out.identity.lamSourceSha256, responseSha)
    ) {
      throw new VoiceProviderError("identity", "audio identity invariant violated in transit", {
        canonicalSha256: out.identity.canonicalSha256,
        lamSourceSha256: out.identity.lamSourceSha256,
        responseSha256: responseSha,
        jobId: envelope.id,
      });
    }

    if (out.identity.synthesisCount !== 1) {
      throw new VoiceProviderError("identity", "synthesis did not happen exactly once", {
        synthesisCount: out.identity.synthesisCount,
        jobId: envelope.id,
      });
    }

    const d = out.diagnostics ?? {};
    const num = (k: string): number | null => (typeof d[k] === "number" ? (d[k] as number) : null);
    const duration = out.audio.durationSeconds;

    return {
      provider: this.name,
      utteranceId: out.utteranceId ?? utteranceId,
      voiceStyle: out.voiceStyle ?? "unknown",
      audio,
      audioMeta: {
        bytes: out.audio.bytes,
        sampleRate: out.audio.sampleRate,
        channels: out.audio.channels,
        subtype: out.audio.subtype,
        durationSeconds: duration,
        sha256: responseSha,
      },
      timeline: out.timeline,
      identity: { ...out.identity, responseSha256: responseSha, sameSource: true },
      diagnostics: {
        coldStart: typeof d.coldStart === "boolean" ? d.coldStart : null,
        synthesisMs: num("synthesisMs"),
        inferenceMs: num("inferenceMs"),
        ttsRtf: rtf(num("synthesisMs"), duration),
        lamRtf: rtf(num("inferenceMs"), duration),
        jawOpenMax: num("jawOpenMax"),
        jawOpenDistinct: num("jawOpenDistinct"),
        framesAboveThreshold: num("framesAboveThreshold"),
        activationThreshold: num("activationThreshold"),
        peakVramAllocated: num("peakVramAllocated"),
        outputShape: Array.isArray(d.outputShape) ? (d.outputShape as number[]) : null,
        runpodJobId: envelope.id ?? null,
        // RunPod 이 붙여 주는 값. executionTime 은 실행, delayTime 은 큐 대기다.
        serverlessExecutionMs: typeof envelope.executionTime === "number"
          ? envelope.executionTime : null,
        serverlessQueueMs: typeof envelope.delayTime === "number" ? envelope.delayTime : null,
        workerInitMs: num("workerInitMs"),
      },
    };
  }

  private async runSync(input: Record<string, unknown>): Promise<RunPodEnvelope> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`https://api.runpod.ai/v2/${this.endpointId}/runsync`, {
        method: "POST",
        headers: {
          // 이 키는 서버 프로세스 안에만 있다. 응답에도 로그에도 들어가지 않는다.
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input }),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new VoiceProviderError("transport", `runpod responded ${res.status}`, {
          httpStatus: res.status,
        });
      }
      return (await res.json()) as RunPodEnvelope;
    } catch (err) {
      if (err instanceof VoiceProviderError) throw err;
      const aborted = err instanceof Error && err.name === "AbortError";
      throw new VoiceProviderError(
        "transport",
        aborted ? `runpod request exceeded ${this.timeoutMs} ms` : "runpod request failed",
        { aborted },
      );
    } finally {
      clearTimeout(timer);
    }
  }
}

/* ------------------------------------------------------------------- select */

/**
 * 어느 구현을 쓸지는 환경이 정한다.
 *
 *   DOCENT_VOICE_BACKEND=local   개발 기계의 상주 파이썬 워커 (기본)
 *   DOCENT_VOICE_BACKEND=runpod  RunPod Serverless
 *                                → RUNPOD_ENDPOINT_ID, RUNPOD_API_KEY 필요
 *
 * 엔드포인트 ID 를 소스에 박지 않는 것은 배포마다 달라지기 때문이고, API 키를
 * 박지 않는 것은 설명할 필요도 없다. 값은 오직 환경에서만 온다.
 */
/**
 * 어느 백엔드가 선택됐고 그 설정이 갖춰졌는지 — 값은 절대 내보내지 않는다.
 *
 * 헬스 라우트가 쓴다. 프로바이더를 만들지도, 엔드포인트를 깨우지도 않는다:
 * "준비됐나?" 가 "준비시켜라" 로 바뀌면 안 되고, 원격 백엔드의 워커 상태는
 * 여기서 알 수도 없다 (scale-to-zero 엔드포인트는 첫 요청이 워커를 띄운다).
 */
/**
 * RunPod 엔드포인트에 실제로 닿는지 확인한다. `/health` 는 워커 수와 큐 통계만 주는
 * 조회라서 워커를 깨우지 않고 GPU 과금도 없다 — `/runsync` 와 다르다.
 *
 * 자격증명·엔드포인트 ID 는 반환값에 넣지 않는다. 나가는 것은 HTTP 상태와 워커 수뿐이다.
 */
export async function probeRunPod(timeoutMs = 8000): Promise<{
  reachable: boolean;
  httpStatus: number | null;
  workers?: Record<string, unknown>;
  jobs?: Record<string, unknown>;
  error?: string;
}> {
  const endpointId = process.env.RUNPOD_ENDPOINT_ID?.trim();
  const apiKey = process.env.RUNPOD_API_KEY?.trim();
  if (!endpointId || !apiKey) return { reachable: false, httpStatus: null, error: "not configured" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`https://api.runpod.ai/v2/${endpointId}/health`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    if (!res.ok) return { reachable: false, httpStatus: res.status };
    const body = (await res.json()) as { workers?: Record<string, unknown>; jobs?: Record<string, unknown> };
    return { reachable: true, httpStatus: res.status, workers: body.workers, jobs: body.jobs };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return { reachable: false, httpStatus: null, error: aborted ? "timeout" : "request failed" };
  } finally {
    clearTimeout(timer);
  }
}

export function describeVoiceBackend(): {
  backend: "local" | "runpod" | "unknown";
  configured: boolean;
} {
  const backend = (process.env.DOCENT_VOICE_BACKEND ?? "local").trim().toLowerCase();
  if (backend === "runpod") {
    return {
      backend,
      configured: Boolean(process.env.RUNPOD_ENDPOINT_ID?.trim() && process.env.RUNPOD_API_KEY?.trim()),
    };
  }
  if (backend === "local") return { backend, configured: voiceBackendConfigured() };
  return { backend: "unknown", configured: false };
}

export function getVoiceProvider(): VoiceProvider {
  const backend = (process.env.DOCENT_VOICE_BACKEND ?? "local").trim().toLowerCase();

  if (backend === "runpod") {
    const endpointId = process.env.RUNPOD_ENDPOINT_ID?.trim();
    const apiKey = process.env.RUNPOD_API_KEY?.trim();
    if (!endpointId) throw new VoiceProviderUnavailable("RUNPOD_ENDPOINT_ID is not set");
    if (!apiKey) throw new VoiceProviderUnavailable("RUNPOD_API_KEY is not set");
    return new RunPodVoiceProvider(endpointId, apiKey, runpodTimeoutMs());
  }

  if (backend !== "local") {
    throw new VoiceProviderUnavailable(`unknown DOCENT_VOICE_BACKEND: ${backend}`);
  }
  return new LocalVoiceProvider();
}

/**
 * RunPod 왕복의 상한.
 *
 * 콜드 워커는 컨테이너 기동과 모델 로드를 포함해 오래 걸린다. 로컬 실측 콜드 경로가
 * 약 13 초였고 이미지 풀과 GPU 할당이 그 위에 더해지므로, 기본값은 넉넉히 두되
 * 무한은 아니다. 배포에서 조정할 수 있게 환경변수로 뺀다.
 */
function runpodTimeoutMs(): number {
  const raw = Number(process.env.RUNPOD_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 180_000;
}
