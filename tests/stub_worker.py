"""타임아웃·크래시·복구를 재현하기 위한 가짜 파이썬 워커.

진짜 Supertonic/LAM 워커와 같은 프로토콜을 말한다 — stdout 으로 JSON 한 줄씩,
먼저 {"ready": true} 를 내고 그 다음부터 stdin 의 요청에 답한다. 모델이 없으므로
GPU 없이 몇 밀리초 안에 뜬다.

행동은 환경변수가 정한다:
    STUB_MODE=normal          정상 응답 (기본)
    STUB_MODE=hang            준비는 알리고, 요청에는 영원히 답하지 않는다
    STUB_MODE=hang_once       첫 프로세스만 매달리고, 재시작된 프로세스는 정상이다
                              (STUB_MARKER 파일의 존재로 세대를 구분한다)
    STUB_MODE=slow            STUB_REPLY_DELAY_MS 만큼 늦게 답한다
    STUB_MODE=never_ready     준비 자체를 알리지 않는다
    STUB_MODE=ready_false     {"ready": false, ...} 를 알리고 종료한다 (워밍업 실패 흉내)
    STUB_MODE=crash_on_call   첫 요청을 받으면 즉시 죽는다
    STUB_MODE=noisy           JSON 사이에 모델 라이브러리 같은 잡음을 섞는다
    STUB_READY_DELAY_MS       준비 완료를 늦춘다
"""
import json
import os
import sys
import time

MODE = os.environ.get("STUB_MODE", "normal")

# "한 번만 매달린다" 는 프로세스 안에 담을 수 없다 — 재시작하면 새 프로세스다.
# 세대를 파일로 표시해야 "같은 Worker 인스턴스가 스스로 복구한다" 를 증명할 수 있다.
if MODE == "hang_once":
    _marker = os.environ.get("STUB_MARKER")
    if _marker and not os.path.exists(_marker):
        with open(_marker, "w") as _f:
            _f.write("1")
        MODE = "hang"
    else:
        MODE = "normal"

READY_DELAY_MS = float(os.environ.get("STUB_READY_DELAY_MS", "0"))
REPLY_DELAY_MS = float(os.environ.get("STUB_REPLY_DELAY_MS", "0"))


def say(obj):
    sys.stdout.write(json.dumps(obj) + "\n")
    sys.stdout.flush()


def noise(text):
    sys.stdout.write(text + "\n")
    sys.stdout.flush()


if MODE == "ready_false":
    say({"ready": False, "stage": "warmup", "error": "RuntimeError: synthetic warm-up failure"})
    sys.exit(3)

if MODE != "never_ready":
    if READY_DELAY_MS:
        time.sleep(READY_DELAY_MS / 1000.0)
    if MODE == "noisy":
        noise("Loading checkpoint shards:  50%|#####     | 1/2 [00:01<00:01]")
    say({"ready": True, "model_load_ms": 1, "pid": os.getpid()})

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        msg = json.loads(line)
    except json.JSONDecodeError:
        continue

    if MODE == "hang":
        continue                       # 응답하지 않는다 — 매달린 워커
    if MODE == "crash_on_call":
        os._exit(7)
    if MODE == "slow":
        time.sleep(REPLY_DELAY_MS / 1000.0)
    if MODE == "noisy":
        noise("some library warning that is not JSON")
        noise("")

    say({"ok": True, "id": msg.get("id"), "echo": msg.get("text"), "pid": os.getpid()})
