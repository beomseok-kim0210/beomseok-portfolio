// 워커 수명주기 — 타임아웃, 크래시, 복구, 백프레셔를 *실제로 돌려서* 확인한다.
//
// P1 리뷰의 MEDIUM 10 이 지적한 것이 이 자리의 공백이었다: 당시 단언은 전부 소스
// 텍스트 검사였고, 프로세스를 띄우거나 이벤트를 흘려보내지 않았다. 여기서는 진짜
// `Worker` 클래스에 가짜 워커 프로세스를 물려 상태 기계를 직접 몰아본다. 모델이
// 없으므로 GPU 도 파이썬도 필요 없고, 수 초 안에 끝난다.
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { Worker, voiceErrorCode } from "../src/lib/docent/voiceWorkers";

const here = path.dirname(fileURLToPath(import.meta.url));
const STUB = path.join(here, "stub-worker.mjs");

/** 가짜 워커는 파이썬이 아니라 node 로 돈다. Worker 는 그 차이를 모른다. */
function stub(mode: string, opts: { maxPending?: number; startupTimeoutMs?: number;
                                    readyDelayMs?: number; marker?: string } = {}) {
  return new Worker(
    "stub",
    process.execPath,
    STUB,
    {
      STUB_MODE: mode,
      ...(opts.readyDelayMs ? { STUB_READY_DELAY_MS: String(opts.readyDelayMs) } : {}),
      ...(opts.marker ? { STUB_MARKER: opts.marker } : {}),
    },
    opts.maxPending ?? 3,
    opts.startupTimeoutMs ?? 5_000,
  );
}

const elapsed = async (fn: () => Promise<unknown>) => {
  const t0 = Date.now();
  try {
    await fn();
  } catch (err) {
    return { ms: Date.now() - t0, err: err as Error };
  }
  return { ms: Date.now() - t0, err: null };
};

/* --------------------------------------------------------------- 정상 경로 */

test("정상 워커는 뜨고, 답하고, 상태를 보고한다", async () => {
  const w = stub("normal");
  try {
    const r = await w.send({ text: "hello" }, 5_000);
    assert.equal(r.ok, true);
    assert.equal(r.echo, "hello");
    const h = w.health();
    assert.equal(h.state, "READY");
    assert.equal(h.restarts, 0);
    assert.equal(h.pending, 0);
    assert.ok(h.readyAt, "준비 시각이 남아야 한다");
    assert.ok(h.lastRepliedAt, "마지막 응답 시각이 남아야 한다");
  } finally {
    w.dispose();
  }
});

/* --------------------------------------------- §20 타임아웃과 그 다음 요청 */

test("무응답 워커는 상한에서 잘리고, 다음 요청이 새 워커로 성공한다", async () => {
  // 이것이 §20 이 요구하는 동적 확인이다. 타임아웃이 "선언되어 있다" 가 아니라
  // 실제로 시간 안에 끊기고, 매달린 자식이 죽고, 그 다음 요청이 살아나야 한다.
  const w = stub("hang");
  try {
    const first = await elapsed(() => w.send({ text: "no answer will come" }, 800));
    assert.ok(first.err, "무응답인데 성공으로 돌아왔다");
    assert.match(first.err.message, /timed out after 800 ms/);
    // 상한 근처에서 끊겨야 한다. 두 배를 넘기면 상한이 상한 노릇을 못 하는 것이다.
    assert.ok(first.ms >= 700 && first.ms < 1_600, `끊기까지 ${first.ms} ms`);

    const afterTimeout = w.health();
    assert.equal(afterTimeout.lastFailureStage, "timeout");
    // 매달린 자식은 exit 통지를 기다리지 않고 *즉시* 버려져야 한다. 그 사이가
    // 비어 있으면 바로 다음 요청이 죽어 가는 자식에게 쓰고 또 한 번 상한을 문다.
    assert.equal(w.health().state, "FAILED", "매달린 자식이 즉시 버려지지 않았다");
    assert.equal(w.health().restarts, 1);
  } finally {
    w.dispose();
  }
});

test("타임아웃된 워커는 *같은 인스턴스에서* 스스로 복구한다", async () => {
  // 앞의 테스트는 "끊긴다" 까지만 보인다. 복구를 증명하려면 새 Worker 를 만드는
  // 것이 아니라 같은 Worker 가 다음 요청을 살려 내는 것을 봐야 한다.
  // stub 은 마커 파일로 세대를 구분한다 — 첫 프로세스만 매달리고, 교체된
  // 프로세스는 정상 동작한다.
  const dir = mkdtempSync(path.join(tmpdir(), "dd-stub-"));
  const marker = path.join(dir, "hung-once");
  const w = stub("hang_once", { marker });
  try {
    const first = await elapsed(() => w.send({ text: "first" }, 800));
    assert.ok(first.err, "첫 요청은 끊겨야 한다");
    assert.equal(w.health().restarts, 1);

    // 같은 인스턴스, 다음 요청. 교체된 자식이 답해야 한다.
    const second = await w.send({ text: "recovered" }, 5_000);
    assert.equal(second.echo, "recovered");
    assert.equal(w.health().state, "READY");
    assert.equal(w.health().restarts, 1, "복구에 추가 재시작이 들지 않아야 한다");
  } finally {
    w.dispose();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("준비를 알리지 않는 워커는 기동 상한에서 잘린다", async () => {
  // 이 상한이 없으면 CUDA 가 올라오지 않는 워커 하나가 요청을 영원히 붙든다.
  const w = stub("never_ready", { startupTimeoutMs: 700 });
  try {
    const r = await elapsed(() => w.send({ text: "x" }, 30_000));
    assert.ok(r.err);
    assert.match(r.err.message, /startup timed out|no readiness within/);
    assert.ok(r.ms < 3_000, `기동 상한이 걸리기까지 ${r.ms} ms`);
    assert.equal(w.health().lastFailureStage, "startup timed out");
  } finally {
    w.dispose();
  }
});

test("느리게 뜨는 워커는 상한 안이면 기다려 준다", async () => {
  // 상한을 너무 조이면 정상적인 콜드 스타트가 전부 실패한다. 경계의 반대편도 본다.
  const w = stub("normal", { readyDelayMs: 400, startupTimeoutMs: 5_000 });
  try {
    const r = await w.send({ text: "slow but fine" }, 10_000);
    assert.equal(r.echo, "slow but fine");
    assert.equal(w.health().restarts, 0);
  } finally {
    w.dispose();
  }
});

/* ------------------------------------------------------- §21 크래시와 복구 */

test("요청 도중 죽은 워커는 그 요청을 실패시키고 재시작된다", async () => {
  const w = stub("crash_on_call");
  try {
    const r = await elapsed(() => w.send({ text: "boom" }, 10_000));
    assert.ok(r.err, "죽었는데 성공으로 돌아왔다");
    assert.match(r.err.message, /exited/);
    assert.ok(r.ms < 5_000, "매달리지 않고 즉시 실패해야 한다");
    const h = w.health();
    assert.equal(h.state, "FAILED");
    assert.equal(h.restarts, 1);
    assert.ok(h.lastFailureAt);
    // 진행 중이던 요청이 반납되어야 한다. 새지 않았는지 확인한다.
    assert.equal(h.pending, 0, "죽은 뒤에도 계수가 남아 있다");
  } finally {
    w.dispose();
  }
});

test("고쳐지지 않는 실패는 무한 재시작 루프가 되지 않는다", async () => {
  // 모델 파일이 사라졌거나 GPU 가 빠진 경우, 계속 스폰하는 것은 상황을 나쁘게만
  // 만든다. 창 안의 재시작 횟수를 넘기면 띄우기를 멈춰야 한다.
  const w = stub("crash_on_call");
  try {
    for (let i = 0; i < 3; i += 1) {
      await elapsed(() => w.send({ text: `attempt ${i}` }, 5_000));
    }
    assert.equal(w.health().restarts, 3);
    const blocked = await elapsed(() => w.send({ text: "fourth" }, 5_000));
    assert.ok(blocked.err);
    assert.match(blocked.err.message, /will not be restarted yet/);
    // 거절은 즉시여야 한다 — 또 띄웠다가 또 죽기를 기다리면 안 된다.
    assert.ok(blocked.ms < 500, `거절까지 ${blocked.ms} ms`);
  } finally {
    w.dispose();
  }
});

/* ------------------------------------------------------------- 백프레셔 */

test("대기열이 차면 기다리게 하지 않고 거절한다", async () => {
  const w = stub("hang", { maxPending: 2 });
  try {
    // 둘은 받아들여 매달리고, 셋째는 즉시 거절되어야 한다.
    const a = w.send({ text: "1" }, 3_000);
    const b = w.send({ text: "2" }, 3_000);
    const rejected = await elapsed(() => w.send({ text: "3" }, 3_000));
    assert.ok(rejected.err);
    assert.equal(voiceErrorCode(rejected.err), "VOICE_CAPACITY");
    assert.ok(rejected.ms < 200, `거절까지 ${rejected.ms} ms — 기다리게 하면 안 된다`);
    assert.equal(w.health().pending, 2);

    await Promise.allSettled([a, b]);
    // 매달린 요청이 정리된 뒤 계수가 새지 않아야 한다.
    assert.equal(w.health().pending, 0, "in-flight 계수가 드리프트했다");
  } finally {
    w.dispose();
  }
});

test("정상 워커에서는 대기열이 비워지고 다시 받아들인다", async () => {
  const w = stub("normal", { maxPending: 2 });
  try {
    const results = await Promise.all([
      w.send({ text: "a" }, 5_000),
      w.send({ text: "b" }, 5_000),
    ]);
    assert.deepEqual(results.map((r) => r.echo), ["a", "b"]);
    assert.equal(w.health().pending, 0);
    // 앞의 요청이 끝났으니 다시 자리가 있어야 한다
    assert.equal((await w.send({ text: "c" }, 5_000)).echo, "c");
  } finally {
    w.dispose();
  }
});

/* --------------------------------------------------------------- 종료 */

test("dispose 는 자식을 데려간다", async () => {
  const w = stub("normal");
  const r = await w.send({ text: "alive" }, 5_000);
  const pid = r.pid as number;
  assert.ok(pid);
  w.dispose();
  assert.equal(w.health().state, "STOPPED");

  // Windows 는 부모의 죽음을 자식에게 전파하지 않는다. 명시적으로 죽여야 한다.
  await new Promise((res) => setTimeout(res, 500));
  let alive = true;
  try {
    process.kill(pid, 0);
  } catch {
    alive = false;
  }
  assert.equal(alive, false, `자식 ${pid} 가 남았다`);
});

/* ---------------------------------------------- 워밍업 실패는 READY 가 아니다 */

test("워커가 ready:false 를 알리면 그 이유로 실패하고 재시작 예산을 쓴다", async () => {
  // LAM 워커는 bootstrap 워밍업(librosa 첫 로드 + 첫 CUDA forward)이 실패하면
  // {"ready": false, "error": ...} 를 내고 종료한다. 그것을 "잡음" 으로 흘려보내면
  // 자식이 죽은 뒤에야 "exited: code 3" 같은 무의미한 메시지로 실패한다. 이유가
  // 그대로 실려야 하고, 가짜 READY 는 절대 없어야 한다.
  const w = stub("ready_false");
  try {
    const r = await elapsed(() => w.send({ text: "x" }, 5_000));
    assert.ok(r.err, "ready:false 인데 성공으로 돌아왔다");
    assert.match(r.err.message, /failed readiness/);
    assert.match(r.err.message, /synthetic warm-up failure/, "워커가 낸 이유가 실려야 한다");
    assert.ok(r.ms < 3_000, `즉시 실패해야 한다 — ${r.ms} ms`);
    const h = w.health();
    assert.equal(h.state, "FAILED");
    assert.equal(h.readyAt, null, "readyAt 이 찍히면 가짜 READY 다");
    assert.equal(h.restarts, 1);
    assert.equal(h.pending, 0);
  } finally {
    w.dispose();
  }
});

test("워밍업 실패가 반복되면 무한 재시작이 아니라 창 안에서 멈춘다", async () => {
  const w = stub("ready_false");
  try {
    for (let i = 0; i < 3; i += 1) await elapsed(() => w.send({ text: `a${i}` }, 5_000));
    const blocked = await elapsed(() => w.send({ text: "fourth" }, 5_000));
    assert.ok(blocked.err);
    assert.match(blocked.err.message, /will not be restarted yet/);
    assert.ok(blocked.ms < 500);
  } finally {
    w.dispose();
  }
});

/* ------------------------------ 준비 실패는 prepare() 에서 거절되어야 한다 */

test("warmupVoiceBackend 는 한 워커라도 준비에 실패하면 그 이유로 거절한다", async () => {
  // 전에는 allSettled 로 삼켰다. 그러면 READY 가 아닌 워커를 두고 요청이 진행되어
  // 첫 요청 안에서 재기동·워밍업을 다시 치른다 — 요청 상한을 잡아먹는 가짜 준비다.
  const { warmupVoiceBackend } = await import("../src/lib/docent/voiceWorkers");
  const supertonic = stub("normal");
  const lam = stub("ready_false");
  try {
    const r = await elapsed(() => warmupVoiceBackend({ supertonic, lam, config: {} } as never));
    assert.ok(r.err, "준비 실패를 삼켰다");
    assert.match(r.err.message, /synthetic warm-up failure/);
    assert.ok(r.ms < 3_000, `즉시 거절해야 한다 — ${r.ms} ms`);
    assert.equal(supertonic.health().state, "READY");
    assert.equal(lam.health().state, "FAILED");
  } finally {
    supertonic.dispose(); lam.dispose();
  }
});
