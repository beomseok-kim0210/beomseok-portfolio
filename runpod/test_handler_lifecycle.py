"""RunPod 핸들러의 워커 수명주기를 실제로 돌려서 확인한다.

§20 은 타임아웃 동작을 동적으로 시험할 것을 요구한다. 여기서 확인하는 것은
handler.py 의 진짜 Worker 클래스이고, 물리는 것만 모델 없는 가짜 워커다.
GPU 도, 모델 파일도, RunPod 계정도 필요하지 않다 — 따라서 과금도 없다.

    python runpod/test_handler_lifecycle.py

성공하면 마지막 줄에 WORKER_TIMEOUT_RECOVERY = PASS 를 찍는다.
"""
import os
import shutil
import sys
import tempfile
import time
import types

# Windows 콘솔 기본 코드페이지는 cp949 라 한글도 em dash 도 못 찍는다.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# handler.py 는 최상단에서 runpod 을 import 한다. 그 패키지는 이 기계에 없어도
# 되고, 있어도 여기서 쓰지 않는다. 껍데기를 끼워 넣어 import 만 통과시킨다.
if "runpod" not in sys.modules:
    stub = types.ModuleType("runpod")
    stub.serverless = types.SimpleNamespace(start=lambda *a, **k: None)
    sys.modules["runpod"] = stub

sys.path.insert(0, HERE)
import handler  # noqa: E402

STUB = os.path.join(ROOT, "tests", "stub_worker.py")

FAILURES = []


def check(name, cond, detail=""):
    mark = "PASS" if cond else "FAIL"
    print(f"  [{mark}] {name}" + (f" — {detail}" if detail else ""))
    if not cond:
        FAILURES.append(name)


def stub_worker(mode, startup_timeout_s=5.0, ready_delay_ms=0, marker=None):
    env = {"STUB_MODE": mode, "STUB_READY_DELAY_MS": str(ready_delay_ms)}
    if marker:
        env["STUB_MARKER"] = marker
    return handler.Worker("stub", sys.executable, STUB, env, startup_timeout_s)


def elapsed(fn):
    t0 = time.time()
    try:
        fn()
        return time.time() - t0, None
    except Exception as exc:
        return time.time() - t0, exc


def test_normal():
    print("정상 워커")
    w = stub_worker("normal")
    try:
        w.await_ready()
        r = w.call({"text": "hello", "id": "a"}, 5)
        check("응답이 돌아온다", r.get("ok") is True and r.get("echo") == "hello")
        check("재시작 없음", w.restarts == 0)
    finally:
        w._kill()


def test_timeout_and_recovery():
    print("무응답 워커 — 상한과 복구  (§20)")
    w = stab = stub_worker("hang")
    try:
        w.await_ready()
        dt, exc = elapsed(lambda: w.call({"text": "no answer", "id": "a"}, 1.0))
        check("상한에서 끊긴다", isinstance(exc, handler.WorkerError), repr(exc))
        check("상한 근처에서 끊긴다", 0.9 <= dt < 2.5, f"{dt:.2f}s")
        # 이것이 핵심이다: 매달린 자식을 버리고 새로 띄웠어야 한다. 그러지 않으면
        # 다음 요청이 *이전* 발화의 늦은 응답을 읽는다.
        check("매달린 자식이 교체된다", w.restarts == 1, f"restarts={w.restarts}")
        check("교체된 워커가 살아 있다", w.alive())
    finally:
        stab._kill()

    # 복구: 정상 워커를 물리면 그 다음 요청은 성공해야 한다.
    healthy = stub_worker("normal")
    try:
        healthy.await_ready()
        r = healthy.call({"text": "recovered", "id": "b"}, 5)
        check("복구 후 요청이 성공한다", r.get("echo") == "recovered")
    finally:
        healthy._kill()


def test_no_stale_reply():
    print("늦게 도착한 응답이 다음 요청을 오염시키지 않는다")
    # 첫 요청에는 2 초 뒤에 답하는 워커. 상한을 0.5 초로 두면 그 응답은 버려진
    # 자식의 것이 되고, 두 번째 요청은 새 자식에게서 자기 id 의 답을 받아야 한다.
    w = handler.Worker("stub", sys.executable, STUB,
                       {"STUB_MODE": "slow", "STUB_REPLY_DELAY_MS": "2000"}, 5.0)
    try:
        w.await_ready()
        _, exc = elapsed(lambda: w.call({"text": "first", "id": "first"}, 0.5))
        check("첫 요청은 상한에서 끊긴다", isinstance(exc, handler.WorkerError))
        time.sleep(2.5)  # 옛 자식이 답할 시간을 준다 — 죽었다면 아무 일도 없다
        r = w.call({"text": "second", "id": "second"}, 5)
        check("두 번째 응답은 두 번째 요청의 것이다",
              r.get("id") == "second" and r.get("echo") == "second", repr(r))
    finally:
        w._kill()


def test_never_ready():
    print("준비를 알리지 않는 워커")
    w = stub_worker("never_ready", startup_timeout_s=0.8)
    try:
        dt, exc = elapsed(lambda: w.await_ready())
        check("기동 상한이 걸린다", isinstance(exc, handler.WorkerError), repr(exc))
        check("상한 근처에서 끊긴다", dt < 3.0, f"{dt:.2f}s")
    finally:
        w._kill()


def test_slow_ready():
    print("느리게 뜨는 워커는 상한 안이면 기다려 준다")
    w = stub_worker("normal", startup_timeout_s=5.0, ready_delay_ms=600)
    try:
        w.await_ready()
        r = w.call({"text": "slow", "id": "a"}, 5)
        check("성공한다", r.get("echo") == "slow")
        check("재시작 없음", w.restarts == 0)
    finally:
        w._kill()


def test_crash_and_restart():
    print("요청 도중 죽은 워커  (§21)")
    w = stub_worker("crash_on_call")
    try:
        w.await_ready()
        dt, exc = elapsed(lambda: w.call({"text": "boom", "id": "a"}, 10))
        check("즉시 실패한다", isinstance(exc, handler.WorkerError), repr(exc))
        check("매달리지 않는다", dt < 5.0, f"{dt:.2f}s")
        check("교체된다", w.restarts == 1, f"restarts={w.restarts}")
        check("교체된 워커가 살아 있다", w.alive())
    finally:
        w._kill()


def test_noise_tolerated():
    print("stdout 잡음을 건너뛴다")
    # 모델 라이브러리는 stdout 에 진행 표시줄과 경고를 흘린다. 그것을 프로토콜로
    # 오해하면 첫 요청부터 깨진다.
    w = handler.Worker("stub", sys.executable, STUB,
                       {"STUB_MODE": "noisy"}, 5.0)
    try:
        w.await_ready()
        r = w.call({"text": "through the noise", "id": "a"}, 5)
        check("잡음 사이에서 JSON 을 찾아낸다", r.get("echo") == "through the noise")
    finally:
        w._kill()


def test_same_instance_recovery():
    print("타임아웃된 워커가 *같은 인스턴스에서* 스스로 복구한다  (§20)")
    # 앞의 테스트는 "끊긴다" 와 "교체된다" 까지만 보인다. 복구를 증명하려면 새
    # Worker 를 만드는 것이 아니라 같은 Worker 가 다음 요청을 살려 내는 것을 봐야
    # 한다. stub 은 마커 파일로 세대를 구분한다 — 첫 프로세스만 매달린다.
    tmp = tempfile.mkdtemp(prefix="dd-stub-")
    w = stub_worker("hang_once", marker=os.path.join(tmp, "hung-once"))
    try:
        w.await_ready()
        _, exc = elapsed(lambda: w.call({"text": "first", "id": "first"}, 0.8))
        check("첫 요청은 끊긴다", isinstance(exc, handler.WorkerError), repr(exc))
        check("자식이 교체된다", w.restarts == 1, f"restarts={w.restarts}")
        r = w.call({"text": "recovered", "id": "second"}, 5)
        check("같은 인스턴스의 다음 요청이 성공한다", r.get("echo") == "recovered", repr(r))
        check("복구에 추가 재시작이 들지 않는다", w.restarts == 1, f"restarts={w.restarts}")
    finally:
        w._kill()
        shutil.rmtree(tmp, ignore_errors=True)


def test_never_ready_is_not_permanent():
    print("기동 실패가 이후 모든 요청을 영구히 막지 않는다")
    # await_ready() 가 실패한 자식을 그대로 두면 ready_info 가 계속 None 이라
    # 이후 모든 요청이 같은 죽은 자식을 상대로 기동 상한을 처음부터 다시 기다린다.
    tmp = tempfile.mkdtemp(prefix="dd-stub-")
    marker = os.path.join(tmp, "hung-once")
    w = stub_worker("hang_once", startup_timeout_s=0.6, marker=marker)
    try:
        # 첫 자식은 준비는 알리고 요청에 답하지 않는다. 그것을 상한으로 끊고 교체.
        w.await_ready()
        elapsed(lambda: w.call({"text": "x", "id": "a"}, 0.6))
        check("교체됐다", w.restarts == 1, f"restarts={w.restarts}")
        # 교체된 자식은 정상이다. ready_info 는 None 이므로 call() 이 기다려 준다.
        check("ready_info 가 비워져 있다", w.ready_info is None)
        dt, exc = elapsed(lambda: w.call({"text": "y", "id": "b"}, 3))
        check("다음 요청이 스스로 준비를 기다렸다 성공한다", exc is None, repr(exc))
        check("영구 차단되지 않는다", dt < 3.0, f"{dt:.2f}s")
    finally:
        w._kill()
        shutil.rmtree(tmp, ignore_errors=True)


def test_secrets_not_inherited():
    print("자식이 비밀 환경변수를 물려받지 않는다")
    # 자식의 stderr 는 예외 메시지에 붙어 로그로 나간다. 워커는 RunPod 키를 알
    # 필요가 없으므로 애초에 물려주지 않아야 한다.
    os.environ["DD_TEST_FAKE_API_KEY"] = "not-a-real-key-0123456789"
    try:
        env = handler._child_env()
        check("KEY 가 붙은 이름은 걸러진다", "DD_TEST_FAKE_API_KEY" not in env)
        check("평범한 변수는 그대로 간다", "PATH" in env or "Path" in env)
        red = handler._redact("boom: not-a-real-key-0123456789 in stderr")
        check("값 자체도 로그에서 지워진다",
              "not-a-real-key-0123456789" not in red and "<redacted>" in red, red)
    finally:
        del os.environ["DD_TEST_FAKE_API_KEY"]


def test_ready_false_is_not_ready():
    print("워커가 ready:false 를 알리면 가짜 READY 없이 그 이유로 실패한다  (워밍업 실패 정책)")
    # LAM 워커는 bootstrap 워밍업이 실패하면 {"ready": false, "error": ...} 를 내고 종료한다.
    # 오케스트레이터는 그 이유를 실어 실패시키고, 요청 경로에서는 재활용한다 — 요청마다
    # 한 번씩. 영원히 큐를 붙들지 않는다.
    w = stub_worker("ready_false", startup_timeout_s=5.0)
    try:
        dt, exc = elapsed(lambda: w.await_ready())
        check("await_ready 가 실패한다", isinstance(exc, handler.WorkerError), repr(exc))
        check("워커가 낸 이유가 실린다", exc is not None and "synthetic warm-up failure" in str(exc), repr(exc))
        check("즉시 실패한다 (기동 상한을 기다리지 않는다)", dt < 3.0, f"{dt:.2f}s")
        check("ready_info 가 비어 있다 (가짜 READY 없음)", w.ready_info is None)
        # 요청 경로: ready_info None → await_ready → 실패 → 재활용 → 예외. 요청당 1 회 재시작.
        dt2, exc2 = elapsed(lambda: w.call({"text": "x", "id": "a"}, 5))
        check("요청은 실패한다", isinstance(exc2, handler.WorkerError), repr(exc2))
        check("재시작은 요청당 한 번으로 묶인다", w.restarts == 1, f"restarts={w.restarts}")
        check("요청이 매달리지 않는다", dt2 < 5.0, f"{dt2:.2f}s")
        _, exc3 = elapsed(lambda: w.call({"text": "y", "id": "b"}, 5))
        check("두 번째 요청도 실패하되 무한 루프가 아니다", isinstance(exc3, handler.WorkerError) and w.restarts == 2,
              f"restarts={w.restarts}")
    finally:
        w._kill()


def test_restart_budget():
    print("고쳐지지 않는 실패는 잡마다 새 프로세스를 띄우지 않는다  (재시작 예산)")
    w = stub_worker("ready_false", startup_timeout_s=5.0)
    try:
        for i in range(3):
            elapsed(lambda: w.call({"text": f"a{i}", "id": f"a{i}"}, 5))
        check("세 번까지는 재시작한다", w.restarts == 3, f"restarts={w.restarts}")
        dt, exc = elapsed(lambda: w.call({"text": "fourth", "id": "d"}, 5))
        check("네 번째는 띄우지 않고 거절한다", isinstance(exc, handler.WorkerError) and "will not be restarted yet" in str(exc), repr(exc))
        check("거절은 즉시다", dt < 0.5, f"{dt:.2f}s")
        check("재시작 수가 늘지 않는다", w.restarts == 3, f"restarts={w.restarts}")
        check("마지막 이유가 실린다", exc is not None and "synthetic warm-up failure" in str(exc))
    finally:
        w._kill()


def test_in_call_readiness_wait_is_bounded_by_call_timeout():
    print("요청 안의 준비 대기는 요청 상한을 넘지 않는다  (RunPod 실행 상한과의 정합)")
    # 기동 상한 5 s 인 워커가 준비를 알리지 않을 때, 상한 0.5 s 인 요청은 0.5 s 근처에서
    # 끊겨야 한다. 기동 상한(180 s)을 그대로 기다리면 잡이 RunPod 실행 상한을 넘긴다.
    w = stub_worker("never_ready", startup_timeout_s=5.0)
    try:
        dt, exc = elapsed(lambda: w.call({"text": "x", "id": "a"}, 0.5))
        check("요청 상한에서 끊긴다", isinstance(exc, handler.WorkerError), repr(exc))
        check("기동 상한이 아니라 요청 상한이다", dt < 2.0, f"{dt:.2f}s")
    finally:
        w._kill()


def test_bootstrap_awaits_replacement_and_serves_with_reason():
    print("bootstrap 은 교체 워커의 준비까지 기다리고, 잡은 기록된 이유로 빨리 실패한다")
    # 실제 _start_workers() 를 stub 으로 돌린다: supertonic 정상, lam 은 ready:false.
    tmp = tempfile.mkdtemp(prefix="dd-boot-")
    stub_src = open(STUB, encoding="utf-8").read()
    header = "import os\nos.environ['STUB_MODE'] = '{mode}'\n"
    with open(os.path.join(tmp, "supertonic_worker.py"), "w", encoding="utf-8") as f:
        f.write(header.format(mode="normal") + stub_src)
    with open(os.path.join(tmp, "lam_worker.py"), "w", encoding="utf-8") as f:
        f.write(header.format(mode="ready_false") + stub_src)
    saved = {k: getattr(handler, k) for k in ("SUPERTONIC_PYTHON", "LAM_PYTHON", "WORKER_DIR", "WORK_DIR", "STARTUP_TIMEOUT_S")}
    saved_env = {k: os.environ.get(k) for k in ("DD_SUPERTONIC_MODEL_DIR", "DD_LAM_SRC", "DD_LAM_CKPT")}
    try:
        handler.SUPERTONIC_PYTHON = sys.executable; handler.LAM_PYTHON = sys.executable
        handler.WORKER_DIR = tmp; handler.WORK_DIR = os.path.join(tmp, "work"); handler.STARTUP_TIMEOUT_S = 5.0
        os.environ["DD_SUPERTONIC_MODEL_DIR"] = "x"; os.environ["DD_LAM_SRC"] = "x"; os.environ["DD_LAM_CKPT"] = "x"
        t0 = time.time()
        sup, lam, errors = handler._start_workers()
        boot_s = time.time() - t0
        check("supertonic 은 준비된다", sup.ready_info is not None and "supertonic" not in errors)
        check("lam 실패가 이유와 함께 기록된다", "lam" in errors and "synthetic warm-up failure" in errors["lam"], str(errors.get("lam"))[:120])
        check("교체를 한 번 시도했다", lam.restarts == 1, f"restarts={lam.restarts}")
        check("bootstrap 이 매달리지 않는다", boot_s < 10.0, f"{boot_s:.2f}s")
        check("가짜 READY 없음", lam.ready_info is None)
        # 이제 잡 하나. 핸들러는 INIT_ERRORS 로 영구 차단하지 않고 단계별로 실패한다.
        handler.SUPERTONIC, handler.LAM, handler.INIT_ERRORS = sup, lam, errors
        handler.INIT_MS = 1.0
        os.makedirs(handler.WORK_DIR, exist_ok=True)
        t0 = time.time()
        out = handler.handler({"id": "j1", "input": {"text": "안녕"}})
        job_s = time.time() - t0
        check("잡은 LAM_FAILED 로 빨리 실패한다", out.get("error") == "LAM_FAILED", str(out)[:160])
        check("실패 detail 에 워밍업 이유가 실린다", "synthetic warm-up failure" in str(out.get("detail", "")), str(out.get("detail"))[:120])
        check("잡이 매달리지 않는다", job_s < 5.0, f"{job_s:.2f}s")
        sup._kill(); lam._kill()
    finally:
        for k, v in saved.items(): setattr(handler, k, v)
        for k, v in saved_env.items():
            if v is None: os.environ.pop(k, None)
            else: os.environ[k] = v
        handler.SUPERTONIC = handler.LAM = None; handler.INIT_ERRORS = {}
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    if not os.path.exists(STUB):
        print(f"stub worker not found: {STUB}")
        sys.exit(2)
    for fn in (test_normal, test_timeout_and_recovery, test_same_instance_recovery,
               test_no_stale_reply, test_never_ready, test_never_ready_is_not_permanent,
               test_slow_ready, test_crash_and_restart, test_noise_tolerated,
               test_secrets_not_inherited, test_ready_false_is_not_ready,
               test_restart_budget, test_in_call_readiness_wait_is_bounded_by_call_timeout,
               test_bootstrap_awaits_replacement_and_serves_with_reason):
        fn()
    print()
    if FAILURES:
        print(f"WORKER_TIMEOUT_RECOVERY = FAIL  ({len(FAILURES)}: {', '.join(FAILURES)})")
        sys.exit(1)
    print("WORKER_TIMEOUT_RECOVERY = PASS")
