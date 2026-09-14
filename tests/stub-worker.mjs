// 타임아웃·크래시·복구를 실제로 재현하기 위한 가짜 워커.
//
// 진짜 Supertonic/LAM 워커와 같은 프로토콜을 말한다 — stdout 으로 JSON 한 줄씩,
// 먼저 {"ready":true} 를 내고 그 다음부터 stdin 의 요청에 답한다. 다른 점은 모델이
// 없다는 것뿐이고, 그래서 GPU 없이 몇 밀리초 안에 뜬다.
//
// 행동은 환경변수가 정한다:
//   STUB_MODE=normal        정상 응답 (기본)
//   STUB_MODE=hang          준비는 알리고, 요청에는 영원히 답하지 않는다
//   STUB_MODE=hang_once     첫 프로세스만 매달리고, 재시작된 프로세스는 정상이다
//                           (STUB_MARKER 파일의 존재로 세대를 구분한다)
//   STUB_MODE=never_ready   준비 자체를 알리지 않는다
//   STUB_MODE=ready_false   {"ready":false,...} 를 알리고 종료한다 (워밍업 실패 흉내)
//   STUB_MODE=crash_on_call 첫 요청을 받으면 즉시 죽는다
//   STUB_READY_DELAY_MS     준비 완료를 늦춘다
import { createInterface } from "node:readline";
import { existsSync, writeFileSync } from "node:fs";

let mode = process.env.STUB_MODE ?? "normal";

// "한 번만 매달린다" 는 프로세스 안에 담을 수 없다 — 재시작하면 새 프로세스이고
// 메모리는 사라진다. 그래서 세대를 파일로 표시한다. 첫 프로세스는 마커를 만들고
// 매달리고, 교체된 프로세스는 마커를 보고 정상 동작한다. 이렇게 해야 "같은 Worker
// 인스턴스가 스스로 복구한다" 를 증명할 수 있다.
if (mode === "hang_once") {
  const marker = process.env.STUB_MARKER;
  if (marker && !existsSync(marker)) {
    writeFileSync(marker, "1");
    mode = "hang";
  } else {
    mode = "normal";
  }
}
const readyDelay = Number(process.env.STUB_READY_DELAY_MS ?? 0);

function say(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

createInterface({ input: process.stdin }).on("line", (line) => {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }
  if (mode === "hang") return;              // 응답하지 않는다 — 매달린 워커
  if (mode === "crash_on_call") process.exit(7);
  say({ ok: true, id: msg.id, echo: msg.text ?? null, pid: process.pid });
});

if (mode === "ready_false") {
  say({ ready: false, stage: "warmup", error: "RuntimeError: synthetic warm-up failure" });
  process.exit(3);
}
if (mode !== "never_ready") {
  setTimeout(() => say({ ready: true, model_load_ms: 1, pid: process.pid }), readyDelay);
}

// 진짜 워커처럼 stdin 이 닫히면 끝난다.
process.stdin.on("end", () => process.exit(0));
