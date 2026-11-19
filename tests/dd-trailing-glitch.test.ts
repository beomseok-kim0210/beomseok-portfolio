// 운영(gpt-5.6-luna)에서 한국어 답 끝에 뜻 없는 영문 한 단어가 붙어 나왔다 — "…시스템입니다.eriwa",
// "…시스템입니다. sermitsiaq" (2026-11-19 재현). 화면과 음성으로 그대로 나가므로 스트림 끝에서 버린다.
import assert from "node:assert/strict";
import { test } from "node:test";

import { TrailingGlitchFilter, VisibleAnswerStream } from "@/lib/docent/protocolStream";

function run(deltas: string[]): { text: string; dropped: boolean } {
  let text = "";
  const s = new VisibleAnswerStream(() => {}, (t) => { text += t; }, 0);
  for (const d of deltas) s.push(d);
  s.end();
  assert.equal(s.text, text);
  return { text, dropped: s.droppedGlitch };
}

test("한국어 종결 뒤 스트림 끝의 영문 한 단어는 버린다 — 델타 경계와 무관", () => {
  for (const deltas of [
    ["<emotion>smile</emotion>행가래는 재활 시스템입니다.", "eriwa"],
    ["<emotion>smile</emotion>행가래는 재활 시스템입니다. sermitsiaq"],
    ["<emotion>smile</emotion>행가래는 재활 시스템입니다", ".", " ser", "mitsiaq"],
  ]) {
    const r = run(deltas);
    assert.equal(r.text.trimEnd(), "행가래는 재활 시스템입니다.", deltas.join("|"));
    assert.equal(r.dropped, true);
  }
});

test("이어지는 글·영어 답·문장 중간의 영문은 그대로 둔다", () => {
  assert.equal(run(["<emotion>smile</emotion>ARMI입니다. ", "ARMI", "는 로봇이에요."]).text, "ARMI입니다. ARMI는 로봇이에요.");
  assert.equal(run(["<emotion>smile</emotion>I build AI products. Thanks"]).text, "I build AI products. Thanks");
  assert.equal(run(["<emotion>smile</emotion>모델은 YOLOv11-M 입니다. Next.js"]).text, "모델은 YOLOv11-M 입니다. Next.js");
  const r = run(["<emotion>smile</emotion>재활 시스템입니다.\n\n"]);
  assert.equal(r.text, "재활 시스템입니다.\n\n");
  assert.equal(r.dropped, false);
});

test("필터 단독: 꼬리는 다음 글이 오면 흘려 보낸다", () => {
  let out = "";
  const f = new TrailingGlitchFilter((t) => { out += t; });
  f.push("좋아요. ");
  f.push("Three");
  assert.equal(out, "좋아요.");
  f.push(".js로 만들었어요.");
  assert.equal(f.end(), false);
  assert.equal(out, "좋아요. Three.js로 만들었어요.");
});
