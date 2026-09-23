// 합성 전 텍스트 정화.
//
// 기준값은 추측이 아니라 실측이다: 모델의 unicode_indexer.json 을 로드한
// supertonic 1.3.1 `UnicodeProcessor.validate_text()` 에 후보 기호를 하나씩 넣어
// 거부/통과를 가른 결과다 (2026-09-23, Supertonic 3).
import assert from "node:assert/strict";
import { test } from "node:test";

import { sanitizeForTts } from "@/lib/docent/ttsText";

/** 실측으로 거부된 문자 — 정화 후에는 하나도 남아 있으면 안 된다. */
const REJECTED = "≤≥≠∑∏∫¬‰′″‡‹›↑⇒↔▲■◆¤≡⊕⊗";

/** 실측으로 통과한 문자 — 멀쩡한 글자를 지우면 발화가 이상해지므로 보존해야 한다. */
const ACCEPTED = "≈±√∞†×÷→←↓▼●★☆✓✔✗✘•·…—–°℃℉µμσαβ∼";

test("거부되는 문자는 하나도 남기지 않는다", () => {
  const { text, replaced } = sanitizeForTts(`측정값 ${REJECTED} 입니다`);
  for (const ch of REJECTED) {
    assert.ok(!text.includes(ch), `${ch} (U+${ch.codePointAt(0)!.toString(16)}) 가 남았다`);
  }
  assert.equal(replaced.length, new Set(REJECTED).size);
});

test("통과하는 문자는 그대로 둔다", () => {
  const input = `지표 ${ACCEPTED} 끝`;
  const { text, replaced } = sanitizeForTts(input);
  assert.equal(text, input);
  assert.deepEqual(replaced, []);
});

test("뜻이 있는 기호는 버리지 않고 읽을 수 있게 바꾼다", () => {
  assert.match(sanitizeForTts("정확도 ≥ 0.98").text, /정확도 이상 0\.98|정확도\s*이상\s*0\.98/);
  assert.match(sanitizeForTts("p ≤ 0.05").text, /이하/);
  assert.match(sanitizeForTts("A ⇒ B").text, /따라서/);
  assert.match(sanitizeForTts("연결 ↔ 구독").text, /양방향/);
});

test("장식 기호는 소리 낼 것이 없으므로 버린다", () => {
  const { text } = sanitizeForTts("▲ 첫째 ■ 둘째 ◆ 셋째");
  assert.ok(!/[▲■◆]/.test(text));
  assert.ok(text.includes("첫째") && text.includes("둘째") && text.includes("셋째"));
});

test("한글·영문 본문과 줄바꿈은 건드리지 않는다", () => {
  const input = "안녕하세요.\nARMI에서 STOMP → gRPC 흐름을 맡았습니다.";
  assert.equal(sanitizeForTts(input).text, input);
});

test("대체가 만든 연속 공백만 정리하고 줄바꿈은 지키지 않는다", () => {
  const { text } = sanitizeForTts("값 ≥   0.9");
  assert.ok(!/ {2,}/.test(text));
  assert.ok(sanitizeForTts("첫 줄\n둘째 줄").text.includes("\n"));
});

test("정화 결과가 빈 문자열이 될 수 있다 — 라우트가 400 으로 막는다", () => {
  assert.equal(sanitizeForTts("▲■◆").text, "");
});

test("바뀐 문자를 보고해 새 기호가 들어오는 것을 알 수 있다", () => {
  const { replaced } = sanitizeForTts("a ≥ b ≥ c ▲");
  assert.deepEqual(replaced.sort(), ["≥", "▲"].sort());
});
