import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";

/**
 * Supertonic 과 LAM-A2E 를 상주 프로세스로 붙들고 있는 서버 전용 층.
 *
 * 두 모델은 서로 다른 venv 에 산다 — Supertonic 은 onnxruntime + numpy 2.2,
 * LAM 은 torch 2.1.2+cu121 + numpy 1.26. 합칠 수 없으므로 프로세스가 둘인 것은
 * 선택이 아니라 제약이다.
 *
 * 요청마다 새로 띄우지 않는 이유는 측정값이다: Supertonic ONNX 세션 구성 ~1.1 s,
 * LAM 체크포인트 로드 ~2.4 s. 발화마다 낼 비용이 아니다.
 *
 * 요청은 워커당 하나씩 직렬로 보낸다. Supertonic 은 numpy 전역 RNG 를 쓰고 LAM 은
 * 3 GB GPU 하나를 쓰므로, 동시 요청을 흘려보내면 서로를 밟는다. 직렬이라는 것은
 * 곧 대기열이 생긴다는 뜻이고, 대기열은 반드시 유한해야 한다.
 */

export type WorkerState = "STOPPED" | "STARTING" | "READY" | "BUSY" | "FAILED";

export interface WorkerHealth {
  label: string;
  state: WorkerState;
  restarts: number;
  pending: number;
  lastFailureStage: string | null;
  lastFailureAt: string | null;
  readyAt: string | null;
  modelLoadMs: number | null;
  /** 워커가 READY 전에 스스로 치른 워밍업(ms). LAM 만 보고한다. 없으면 null. */
  warmupMs: number | null;
  /** 마지막으로 실제 응답을 준 시각. READY 라는 말보다 이쪽이 살아 있음의 증거다. */
  lastRepliedAt: string | null;
}

export interface SupertonicResult {
  sha256: string;
  bytes: number;
  sample_rate: number;
  channels: number;
  subtype: string;
  frames: number;
  duration_s: number;
  peak_abs: number;
  synthesis_ms: number;
  synthesis_count: number;
  voice_style: string;
}

export interface LamFrame {
  t: number;
  jaw: number;
  round: number;
  stretch: number;
  upperLift: number;
}

export interface LamResult {
  lam_source_sha256: string;
  preprocessing: string;
  target_sample_rate: number;
  samples_at_16k: number;
  audio_duration_s: number;
  fps: number;
  frame_count: number;
  timeline_duration_s: number;
  output_shape: number[];
  nan_count: number;
  inf_count: number;
  jawopen_max: number;
  jawopen_distinct: number;
  activation_threshold: number;
  frames_above_threshold: number;
  inference_ms: number;
  peak_vram_allocated: number;
  channels: Record<string, string>;
  frames: LamFrame[];
}

/**
 * 오류 종류는 `instanceof` 로 판별하지 않는다.
 *
 * 워커 인스턴스는 `globalThis` 에 캐시되어 hot reload 를 넘어 살아남는다. 그러면
 * 캐시된 워커가 던지는 클래스는 *이전* 모듈 평가본의 것이고, 라우트가 비교하는
 * 클래스는 새로 로드된 것이라 `instanceof` 가 조용히 false 가 된다. 실제로 그
 * 때문에 대기열 거절이 503 이 아니라 502 로 보고됐다 — 백프레셔가 고장으로
 * 둔갑한 것이다. 문자열 코드는 모듈 경계를 넘어도 같다.
 */
export type VoiceErrorCode = "VOICE_CAPACITY" | "VOICE_UNCONFIGURED";

export function voiceErrorCode(err: unknown): VoiceErrorCode | null {
  const code = (err as { ddVoiceCode?: unknown } | null)?.ddVoiceCode;
  return code === "VOICE_CAPACITY" || code === "VOICE_UNCONFIGURED" ? code : null;
}

/** 대기열이 가득 찼을 때. 라우트가 503 으로 바꾼다. */
export class VoiceCapacityExceeded extends Error {
  readonly ddVoiceCode: VoiceErrorCode = "VOICE_CAPACITY";
}
/** 설정이 없어 백엔드를 띄울 수 없을 때. 라우트가 503 으로 바꾼다. */
export class VoiceBackendUnavailable extends Error {
  readonly ddVoiceCode: VoiceErrorCode = "VOICE_UNCONFIGURED";
}

interface Pending {
  resolve: (value: Record<string, unknown>) => void;
  reject: (reason: Error) => void;
}

/**
 * 재시작 정책.
 *
 * 워커가 죽으면 다음 요청에서 다시 띄운다. 다만 무한히는 아니다 — 모델 파일이
 * 사라졌거나 GPU 가 빠진 경우처럼 고쳐지지 않는 실패에서 스폰 루프를 도는 것은
 * 상황을 더 나쁘게만 만든다. 창 안에서 정해진 횟수를 넘기면 FAILED 로 두고,
 * 창이 지나면 다시 시도한다.
 */
const RESTART_WINDOW_MS = 60_000;
const MAX_RESTARTS_PER_WINDOW = 3;

/**
 * 기동에도 상한이 필요하다.
 *
 * 준비 완료 한 줄을 영원히 기다리면, 모델 파일이 깨졌거나 CUDA 가 초기화되지 않는
 * 워커 하나가 요청 전체를 무한정 붙든다.
 *
 * READY 에는 이제 LAM 워밍업이 들어 있다 (2026-09-14). 로컬 실측: 워밍업 포함 LAM
 * 준비까지 12.8 s (numba 캐시 있음) ~ 30.3 s (없음), 라우트에서 본 첫 요청 준비
 * 대기 41 s. 60 s 는 그 최악값의 약 1.5 배이고, 라우트의 전체 상한 130 s 안에서
 * 기동 60 + 한 단계 60 이 들어간다. 90 s 로 두면 기동만으로 전체 상한을 거의
 * 다 써 버려 단계 상한이 광고와 달라진다.
 */
const STARTUP_TIMEOUT_MS = 60_000;

/**
 * 자식에게 물려줄 환경.
 *
 * 워커는 PATH, CUDA 경로, HF_HOME 같은 주변 환경이 필요하다. 그래서 화이트리스트가
 * 아니라 걸러내기를 쓴다 — 기계마다 필요한 변수가 달라 화이트리스트는 조용히
 * 깨진다. 대신 비밀로 보이는 이름은 넘기지 않는다.
 *
 * 이것이 중요한 이유: 자식의 stderr 는 오류 메시지에 붙어 서버 로그로 나간다.
 * 파이썬 라이브러리가 죽으면서 환경을 덤프하는 일은 드물지 않고, 그때 이 프로세스가
 * 들고 있는 RUNPOD_API_KEY 가 그 안에 있으면 안 된다. 워커는 그 키를 알 필요가
 * 전혀 없다 — RunPod 인증은 라우트와 RunPod API 사이에서만 일어난다.
 */
const SECRET_NAME = /(KEY|SECRET|TOKEN|PASSWORD|PASSWD|CREDENTIAL)/i;

function childEnv(): NodeJS.ProcessEnv {
  const out = { ...process.env };
  for (const k of Object.keys(out)) {
    if (SECRET_NAME.test(k)) delete out[k];
  }
  return out;
}

/** 로그에 남기기 전에 실제 비밀 *값* 을 지운다. 이름 필터만으로는 부족하다. */
export function redactSecretValues(text: string): string {
  let out = text;
  for (const [k, v] of Object.entries(process.env)) {
    if (!v || v.length < 8 || !SECRET_NAME.test(k)) continue;
    out = out.split(v).join("<redacted>");
  }
  return out;
}

export class Worker {
  private child: ChildProcessWithoutNullStreams | null = null;
  private ready: Promise<Record<string, unknown>> | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private pending = new Map<string, Pending>();
  private seq = 0;

  private state: WorkerState = "STOPPED";
  private restartTimes: number[] = [];
  private lastFailureStage: string | null = null;
  private lastFailureAt: string | null = null;
  private readyAt: string | null = null;
  private modelLoadMs: number | null = null;
  private warmupMs: number | null = null;
  private lastRepliedAt: string | null = null;
  /** 큐에 들어와 아직 끝나지 않은 요청 수 */
  private inFlight = 0;

  // 파라미터 프로퍼티 대신 명시적 필드를 쓴다. node --test 의 타입 스트리핑은
  // 파라미터 프로퍼티를 해석하지 못하고, 그러면 이 모듈은 테스트에서 아예
  // import 할 수 없다 — 단언이 소스 텍스트 검사로만 남는다는 뜻이다.
  private readonly label: string;
  private readonly python: string;
  private readonly script: string;
  private readonly env: Record<string, string>;
  private readonly maxPending: number;
  /**
   * 기동 상한. 기본값은 실측에서 나온 모듈 상수이고, 생성자로 받는 이유는 하나다 —
   * 타임아웃 동작을 테스트가 실제로 재현할 수 있어야 하기 때문이다. 90 초를 기다리는
   * 테스트는 아무도 돌리지 않고, 돌리지 않는 테스트는 없는 것과 같다.
   */
  private readonly startupTimeoutMs: number;

  constructor(
    label: string,
    python: string,
    script: string,
    env: Record<string, string>,
    maxPending: number,
    startupTimeoutMs: number = STARTUP_TIMEOUT_MS,
  ) {
    this.label = label;
    this.python = python;
    this.script = script;
    this.env = env;
    this.maxPending = maxPending;
    this.startupTimeoutMs = startupTimeoutMs;
  }

  health(): WorkerHealth {
    return {
      label: this.label,
      state: this.state,
      restarts: this.restartTimes.length,
      pending: this.inFlight,
      lastFailureStage: this.lastFailureStage,
      lastFailureAt: this.lastFailureAt,
      readyAt: this.readyAt,
      modelLoadMs: this.modelLoadMs,
      warmupMs: this.warmupMs,
      lastRepliedAt: this.lastRepliedAt,
    };
  }

  private restartsInWindow(): number {
    const cutoff = Date.now() - RESTART_WINDOW_MS;
    this.restartTimes = this.restartTimes.filter((t) => t > cutoff);
    return this.restartTimes.length;
  }

  /** 워커를 띄우고 준비 완료 한 줄을 기다린다. 이미 떠 있으면 그대로 쓴다. */
  start(): Promise<Record<string, unknown>> {
    if (this.ready) return this.ready;
    if (this.state === "FAILED" && this.restartsInWindow() >= MAX_RESTARTS_PER_WINDOW) {
      return Promise.reject(
        new Error(
          `${this.label} worker failed ${this.restartsInWindow()} times in the last ` +
            `${RESTART_WINDOW_MS / 1000}s and will not be restarted yet`,
        ),
      );
    }

    this.state = "STARTING";
    this.ready = new Promise((resolve, reject) => {
      const child = spawn(this.python, [this.script], {
        env: {
          ...childEnv(),
          ...this.env,
          PYTHONIOENCODING: "utf-8",
          PYTHONUNBUFFERED: "1",
        },
        stdio: ["pipe", "pipe", "pipe"],
      });
      this.child = child;

      let settled = false;
      let dead = false;
      const lines = createInterface({ input: child.stdout });
      lines.on("line", (line) => {
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(line);
        } catch {
          return; // 모델 라이브러리가 stdout 에 흘리는 잡음은 무시한다
        }
        if (!settled && msg.ready === false) {
          // 워커가 스스로 "준비 안 됨" 을 판정했다 — 예: LAM 워밍업 실패. 그 이유를
          // 그대로 실어 실패시킨다. 곧 따라올 exit 통지는 die() 가 한 번만 처리한다.
          try { child.kill(); } catch { /* 이미 죽었으면 그만이다 */ }
          die("failed readiness", String(msg.error ?? msg.stage ?? "no reason given"));
          return;
        }
        if (!settled && msg.ready) {
          settled = true;
          this.state = "READY";
          this.readyAt = new Date().toISOString();
          this.modelLoadMs = typeof msg.model_load_ms === "number" ? msg.model_load_ms : null;
          this.warmupMs = typeof msg.warmup_ms === "number" ? msg.warmup_ms : null;
          resolve(msg);
          return;
        }
        const id = typeof msg.id === "string" ? msg.id : null;
        const waiter = id ? this.pending.get(id) : undefined;
        if (!waiter || !id) return;
        this.pending.delete(id);
        this.lastRepliedAt = new Date().toISOString();
        if (msg.ok) waiter.resolve(msg);
        else waiter.reject(new Error(`${this.label}: ${String(msg.error ?? "unknown error")}`));
      });

      // stderr 는 진단용으로만 남긴다. 여기서 죽이지 않는다.
      let stderrTail = "";
      child.stderr.on("data", (b: Buffer) => {
        stderrTail = (stderrTail + b.toString("utf8")).slice(-4000);
      });

      /**
       * 한 자식의 죽음을 정확히 한 번만 처리한다.
       *
       * `exit` 와 `error` 가 둘 다 올 수 있고, 더 나쁘게는 이미 교체 워커가 떠 있는
       * 뒤에 옛 자식의 종료 통지가 도착할 수 있다. 그때 무조건 상태를 건드리면 멀쩡한
       * 교체 워커를 FAILED 로 만들고 그 요청들을 죽이며 재시작 예산까지 태운다.
       * 그래서 (1) 이 클로저의 자식에 대해 한 번만 돌고 (2) 그 자식이 아직 현재
       * 자식일 때만 매니저 상태를 만진다.
       */
      const die = (stage: string, detail: string) => {
        if (dead) return;
        dead = true;
        const err = new Error(`${this.label} worker ${stage}: ${detail}`);
        if (this.child !== child) {
          // 이미 교체된 옛 자식이다. 조용히 보낸다.
          if (!settled) { settled = true; reject(err); }
          return;
        }
        this.lastFailureStage = stage;
        this.lastFailureAt = new Date().toISOString();
        this.state = "FAILED";
        this.restartTimes.push(Date.now());
        // 진행 중이던 요청은 전부 즉시 실패시킨다. 영원히 매달려 있으면 안 된다.
        // inFlight 은 여기서 건드리지 않는다 — 각 요청이 자기 몫을 정확히 한 번
        // 반납하므로, 여기서 0으로 밀면 아직 살아 있는 대기열이 계수에서 사라진다.
        for (const [, p] of this.pending) p.reject(err);
        this.pending.clear();
        this.child = null;
        this.ready = null; // 다음 요청이 다시 띄울 수 있게 놓아준다
        if (!settled) { settled = true; reject(err); }
      };

      child.on("exit", (code, signal) =>
        die("exited", `code ${code}${signal ? ` signal ${signal}` : ""}. ${stderrTail.slice(-400)}`));
      child.on("error", (e) => die("could not start", e.message));

      // 준비 완료가 오지 않는 워커를 영원히 기다리지 않는다.
      const startTimer = setTimeout(() => {
        if (settled) return;
        try { child.kill(); } catch { /* 이미 죽었으면 그만이다 */ }
        die("startup timed out", `no readiness within ${this.startupTimeoutMs} ms`);
      }, this.startupTimeoutMs);
      void this.ready?.catch(() => undefined);
      const clearStartTimer = () => clearTimeout(startTimer);
      lines.on("line", clearStartTimerOnReady);
      function clearStartTimerOnReady(line: string) {
        try { if (JSON.parse(line).ready) clearStartTimer(); } catch { /* 잡음 */ }
      }
      child.on("exit", clearStartTimer);
    });
    return this.ready;
  }

  /**
   * 현재 자식을 *동기적으로* 포기한다.
   *
   * kill() 만 부르고 exit 통지를 기다리면 그 사이가 비어 있다. 큐는 직렬이므로
   * 타임아웃된 요청이 거절되는 즉시 다음 요청이 start() 를 부르는데, 그때 아직
   * 옛 ready 프로미스와 옛 child 가 그대로 남아 있으면 다음 요청이 죽어 가는
   * 자식에게 쓰고 또 한 번 상한을 기다린다. 그래서 여기서 바로 끊는다.
   */
  private abandon(stage: string): void {
    const child = this.child;
    this.lastFailureStage = stage;
    this.lastFailureAt = new Date().toISOString();
    this.state = "FAILED";
    this.restartTimes.push(Date.now());
    this.child = null;
    this.ready = null;
    const err = new Error(`${this.label} worker ${stage}`);
    for (const [, p] of this.pending) p.reject(err);
    this.pending.clear();
    if (!child) return;
    // this.child 를 이미 비웠으므로 뒤늦게 오는 exit/error 는 die() 의
    // "이미 교체된 옛 자식" 가지로 빠져 조용히 버려진다.
    try { child.kill(); } catch { /* 이미 죽었으면 그만이다 */ }
  }

  /** 직렬로 한 건 보낸다. 앞의 요청이 끝나야 다음이 나간다. */
  send(payload: Record<string, unknown>, timeoutMs: number): Promise<Record<string, unknown>> {
    // 대기열은 유한하다. 넘치면 기다리게 두지 않고 바로 거절한다.
    if (this.inFlight >= this.maxPending) {
      return Promise.reject(
        new VoiceCapacityExceeded(
          `${this.label} worker is saturated (${this.inFlight}/${this.maxPending} in flight)`,
        ),
      );
    }
    this.inFlight += 1;

    const run = async () => {
      await this.start();
      const child = this.child;
      if (!child) throw new Error(`${this.label} worker is not running`);
      this.state = "BUSY";
      const id = `${this.label}-${++this.seq}`;
      return await new Promise<Record<string, unknown>>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pending.delete(id);
          // 요청을 버리는 것만으로는 부족하다. 응답하지 않는 워커를 그대로 두면
          // 뒤따르는 요청이 전부 같은 시간을 기다렸다 같은 이유로 죽는다. 자식을
          // 지금 포기해야 다음 요청이 새 워커로 간다 — exit 통지를 기다리면 늦다.
          this.abandon("timeout");
          reject(new Error(`${this.label} worker timed out after ${timeoutMs} ms`));
        }, timeoutMs);
        this.pending.set(id, {
          resolve: (v) => { clearTimeout(timer); resolve(v); },
          reject: (e) => { clearTimeout(timer); reject(e); },
        });
        child.stdin.write(JSON.stringify({ ...payload, id }) + "\n");
      });
    };

    const settle = () => {
      this.inFlight = Math.max(0, this.inFlight - 1);
      if (this.state === "BUSY") this.state = this.child ? "READY" : "FAILED";
    };
    const next = this.queue.then(run, run).then(
      (v) => { settle(); return v; },
      (e) => { settle(); throw e; },
    );
    // 큐는 실패해도 이어져야 한다 — 한 건의 실패가 뒤를 막지 않게
    this.queue = next.then(() => undefined, () => undefined);
    return next;
  }

  /**
   * 노드가 사라질 때 자식도 데려간다.
   *
   * Windows 는 부모의 죽음을 자식에게 전파하지 않는다. 이것이 없으면 서버를 껐다
   * 켤 때마다 모델을 물고 있는 파이썬이 남고, GPU 메모리도 함께 남는다.
   */
  dispose(): void {
    const child = this.child;
    this.child = null;
    this.ready = null;
    this.state = "STOPPED";
    if (!child) return;
    try { child.stdin.end(); } catch { /* 이미 닫혔으면 그만이다 */ }
    try { child.kill(); } catch { /* 이미 죽었으면 그만이다 */ }
  }
}

interface Backend {
  supertonic: Worker;
  lam: Worker;
  config: {
    supertonicPython: string;
    supertonicModelDir: string;
    lamPython: string;
    lamSrc: string;
    lamCkpt: string;
    workDir: string;
  };
}

/** dev 서버의 hot reload 가 모듈을 다시 평가해도 워커는 하나여야 한다. */
const CACHE = globalThis as unknown as { __ddVoiceBackend?: Backend | null };

function readConfig() {
  const need = (name: string) => {
    const v = process.env[name];
    if (!v) throw new VoiceBackendUnavailable(`${name} is not set`);
    return v;
  };
  return {
    supertonicPython: need("DD_SUPERTONIC_PYTHON"),
    supertonicModelDir: need("DD_SUPERTONIC_MODEL_DIR"),
    lamPython: need("DD_LAM_PYTHON"),
    lamSrc: need("DD_LAM_SRC"),
    lamCkpt: need("DD_LAM_CKPT"),
    workDir: process.env.DD_VOICE_WORK_DIR ?? "",
  };
}

/**
 * 용량.
 *
 * 두 워커 모두 요청을 직렬로 처리하므로 동시 실행은 각 1이 상한이다. 그 위에
 * 짧은 대기열을 둔다 — 사람 한 명이 문장을 연달아 보내는 정도는 흡수하고,
 * 그보다 많이 쌓이면 기다리게 하는 대신 거절한다.
 */
export const MAX_CONCURRENT_SYNTHESIS = 1;
export const MAX_CONCURRENT_LAM = 1;
export const MAX_PENDING_PER_WORKER = 3;

/**
 * 노드가 끝날 때 자식 파이썬을 데려간다.
 *
 * Windows 는 부모의 죽음을 자식에게 전파하지 않는다. 이것이 없으면 서버를 껐다 켤
 * 때마다 모델을 물고 있는 파이썬이 하나씩 남고, GPU 메모리도 함께 남는다.
 * 한 번만 등록한다 — hot reload 마다 리스너를 쌓지 않기 위해서다.
 */
function registerShutdownOnce() {
  const g = globalThis as unknown as { __ddVoiceShutdownHooked?: boolean };
  if (g.__ddVoiceShutdownHooked) return;
  g.__ddVoiceShutdownHooked = true;
  const stop = () => {
    const b = CACHE.__ddVoiceBackend;
    if (!b) return;
    CACHE.__ddVoiceBackend = null;
    b.supertonic.dispose();
    b.lam.dispose();
  };
  process.once("exit", stop);
  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
    process.once(sig, () => { stop(); process.exit(0); });
  }
}

export function getVoiceBackend(scriptDir: string): Backend {
  if (CACHE.__ddVoiceBackend) return CACHE.__ddVoiceBackend;
  const config = readConfig();
  const backend: Backend = {
    config,
    supertonic: new Worker(
      "supertonic",
      config.supertonicPython,
      `${scriptDir}/supertonic_worker.py`,
      { DD_SUPERTONIC_MODEL_DIR: config.supertonicModelDir },
      MAX_PENDING_PER_WORKER,
    ),
    lam: new Worker(
      "lam",
      config.lamPython,
      `${scriptDir}/lam_worker.py`,
      { DD_LAM_SRC: config.lamSrc, DD_LAM_CKPT: config.lamCkpt },
      MAX_PENDING_PER_WORKER,
    ),
  };
  CACHE.__ddVoiceBackend = backend;
  registerShutdownOnce();
  return backend;
}

/**
 * 두 워커를 동시에 띄운다.
 *
 * 순서대로 띄우면 LAM 은 Supertonic 이 합성을 끝낸 뒤에야 파이썬을 시작한다.
 * 실측에서 그 대기가 콜드 경로의 대부분이었다 — Supertonic 준비와 LAM 준비 사이
 * 13.3 초, 그중 LAM 자신의 체크포인트 로드는 1.8 초뿐이고 나머지는 torch 와 CUDA
 * 가 올라오는 시간이었다. 둘은 서로를 기다릴 이유가 없으므로 겹쳐서 올린다.
 *
 * 둘 다 끝날 때까지 기다린 뒤, 하나라도 준비에 실패했으면 *그 이유로 거절한다*.
 * 전에는 allSettled 로 삼켰는데, 그러면 READY 가 아닌 워커를 두고 요청이 진행되어
 * 첫 요청 안에서 재기동과 워밍업을 다시 치른다 — 요청 상한을 잡아먹는 가짜 준비다.
 * 거절하면 라우트가 즉시 폴백으로 내려가고, 다음 요청이 예산 안에서 다시 띄운다.
 */
export async function warmupVoiceBackend(backend: Backend): Promise<void> {
  const results = await Promise.allSettled([backend.supertonic.start(), backend.lam.start()]);
  const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failed.length > 0) {
    throw new Error(failed.map((f) => (f.reason instanceof Error ? f.reason.message : String(f.reason))).join("; "));
  }
}

/** 설정만 확인한다. 워커를 띄우지 않으므로 헬스체크가 비용을 만들지 않는다. */
export function voiceBackendConfigured(): boolean {
  try {
    readConfig();
    return true;
  } catch {
    return false;
  }
}

/** 이미 만들어진 백엔드의 상태. 없으면 null — 헬스체크가 워커를 깨우지 않는다. */
export function voiceBackendHealth(): { supertonic: WorkerHealth; lam: WorkerHealth } | null {
  const b = CACHE.__ddVoiceBackend;
  if (!b) return null;
  return { supertonic: b.supertonic.health(), lam: b.lam.health() };
}

/**
 * 타임아웃.
 *
 * 임의로 고른 값이 아니라 실측에서 나왔다. 웜 상태에서 짧은 문장 합성은
 * 883–957 ms, 10.4 초 문장은 2657 ms 였고 LAM 추론은 256–275 ms (P1), 워밍업 뒤에는
 * 86–96 ms (2026-09-14) 였다. 기동은 이 단계 상한과 별도로 STARTUP_TIMEOUT_MS 가
 * 재고, 요청 전체는 VOICE_REQUEST_TIMEOUT_MS 가 잰다.
 *
 * 단계 상한은 "가장 긴 관측 작업 + 큰 여유" 다. 이보다 훨씬 길면 죽은 워커를 오래
 * 붙들고 있게 된다.
 */
export const SUPERTONIC_TIMEOUT_MS = 60_000;
export const LAM_TIMEOUT_MS = 60_000;
/**
 * 요청 전체의 상한. 각 단계 상한의 합(120 s)보다 짧게 잡지 않는다.
 *
 * 기동(≤ 60 s)이 요청 안에서 일어나는 경우는 콜드 첫 요청뿐이고, 그때 두 단계가
 * 동시에 상한까지 가는 일은 관측된 적이 없다 (웜 합성 ≤ 2.7 s, LAM ≤ 0.1 s).
 * 기동 60 + 한 단계 60 = 120 < 130.
 */
export const VOICE_REQUEST_TIMEOUT_MS = 130_000;
