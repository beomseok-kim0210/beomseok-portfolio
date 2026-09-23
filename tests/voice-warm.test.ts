// 워커 예열 경로.
//
// 지키려는 성질: (1) 이미 떠 있으면 돈 드는 작업을 던지지 않는다, (2) 실패해도
// 사용자에게 오류가 가지 않는다(항상 202), (3) 예열이 합성 경로를 대신하지 않는다.
import assert from "node:assert/strict";
import { test } from "node:test";

import { readFileSync } from "node:fs";

// 이 저장소는 체크아웃에서 CRLF 가 될 수 있다 — 개행으로 잘라내지 않도록 정규화한다.
const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");

const providerSrc = read("src/lib/docent/voiceProvider.ts");
const warmRouteSrc = read("src/app/api/docent/voice/warm/route.ts");
const experienceSrc = read("src/features/docent/DocentExperience.tsx");

test("예열은 공짜 조회로 먼저 확인하고, 워커가 있으면 작업을 던지지 않는다", () => {
  // RunPod 쪽 warm() 만 본다 — 로컬 구현은 prepare() 위임이라 관심 밖이다.
  const start = providerSrc.indexOf("async warm(): Promise<WarmOutcome> {\n    const health");
  assert.ok(start > 0, "RunPod warm() 를 찾지 못했다");
  const body = providerSrc.slice(start, providerSrc.indexOf("async synthesize", start));
  // /health 확인이 /run 제출보다 먼저 와야 한다
  const healthAt = body.indexOf("probeRunPod");
  const runAt = body.indexOf("/run`");
  assert.ok(healthAt >= 0 && runAt > healthAt, "probeRunPod 가 /run 보다 먼저여야 한다");
  // 워커가 하나라도 있으면 already-warm 으로 빠져나간다
  assert.match(body, /ready.*idle.*running.*initializing/s);
  assert.match(body, /return "already-warm"/);
});

test("예열은 비동기 /run 을 쓴다 — 응답을 기다리면 클라이언트가 콜드만큼 막힌다", () => {
  assert.ok(providerSrc.includes("/run`"), "예열은 /run 을 써야 한다");
  const warmSection = providerSrc.slice(providerSrc.indexOf("async warm()"), providerSrc.indexOf("async synthesize"));
  assert.ok(!warmSection.includes("runsync"), "예열이 runsync 를 쓰면 기다리게 된다");
});

test("예열 라우트는 실패해도 오류를 내지 않고 항상 202 로 답한다", () => {
  assert.ok(!/status: 5\d\d/.test(warmRouteSrc), "5xx 를 내면 안 된다");
  assert.match(warmRouteSrc, /status: 202/);
  assert.match(warmRouteSrc, /catch/);
});

test("예열도 레이트리밋을 거친다 — GPU 를 쓰는 행위다", () => {
  assert.match(warmRouteSrc, /checkRateLimit/);
  assert.match(warmRouteSrc, /status: 429/);
});

test("예열은 음성이 켜져 있을 때만 걸린다", () => {
  assert.match(experienceSrc, /if \(!voice\.voiceEnabled\) return;[\s\S]{0,400}voice\/warm/);
  assert.match(experienceSrc, /if \(voice\.voiceEnabled\) \{[\s\S]{0,200}voice\/warm/);
});

test("예열이 합성을 대신하지 않는다 — 발화는 여전히 speak 경로로만 나간다", () => {
  const warmCalls = experienceSrc.match(/voice\/warm/g) ?? [];
  assert.equal(warmCalls.length, 2, "예열 호출 지점은 음성 켜기와 질문 보내기 둘뿐이다");
  assert.match(experienceSrc, /supertonic\.speak\(content\)/);
});
