// 프로토콜 표지 위생 — 감정 태그·근거 번호·근거 구분자는 방문자의 화면과 음성에 절대 나가지 않는다.
//
// 운영 회귀(2026-10-01, 기준선 60회 중 1회 재현): 모델이 "<emotion=smile>ARMI는 …" 처럼 태그 형식을 흐트러
// 뜨렸고, 라우트는 맨 앞의 "<emotion>값</emotion>" 정규식만 보고 있어서 그대로 화면에 나갔다. 델타 하나에
// 정규식을 적용하는 방식은 태그가 델타 경계에서 쪼개지면 어차피 못 잡는다 — 그래서 문자 단위 파서로 바꿨다.
import assert from "node:assert/strict";
import { test } from "node:test";

import { stripEmphasisForDisplay } from "@/lib/docent/displayText";
import { ProtocolStreamParser, VisibleAnswerStream, stripProtocolMarkers } from "@/lib/docent/protocolStream";
import { prepareSpokenText } from "@/lib/docent/ttsSegments";
import type { DocentEmotion } from "@/types/docent";

/** 델타 배열을 흘려 보이는 글과 감정 메타를 모은다. */
function run(deltas: string[]): { text: string; meta: DocentEmotion[]; deltas: string[] } {
  const meta: DocentEmotion[] = [];
  const out: string[] = [];
  const s = new VisibleAnswerStream((e) => meta.push(e), (t) => out.push(t));
  for (const d of deltas) s.push(d);
  s.end();
  return { text: out.join(""), meta, deltas: out };
}

/** 문자열을 가능한 모든 두 조각으로 쪼개 흘린다 — 어느 경계에서 잘려도 같아야 한다. */
function everySplit(full: string, check: (r: ReturnType<typeof run>, at: number) => void) {
  for (let i = 0; i <= full.length; i++) check(run([full.slice(0, i), full.slice(i)]), i);
  // 한 글자씩
  check(run([...full]), -1);
}

const LEAK = /<\/?\s*emotion|emotion\s*[=:>]|<\/?evidence>|\[E\d+\]/i;

test("운영에서 샌 형태: \"<emotion=smile>\" 은 메타데이터가 되고 글로 나가지 않는다", () => {
  const r = run(["<emotion=smile>ARMI는 병상 보조 로봇이에요."]);
  assert.deepEqual(r.meta, ["smile"]);
  assert.equal(r.text, "ARMI는 병상 보조 로봇이에요.");
});

test("정상 형태와 흐트러진 형태 모두 — 앞, 중간, 끝, 중복, 늦은 태그, 닫는 태그만", () => {
  const cases: Array<[string, DocentEmotion, string]> = [
    ["<emotion>smile</emotion>안녕하세요.", "smile", "안녕하세요."],
    ["<emotion>neutral</emotion> 안녕하세요.", "neutral", "안녕하세요."],
    ["<emotion> sad </emotion>죄송해요.", "sad", "죄송해요."],
    ["<emotion:thinking>음.", "thinking", "음."],
    ["<emotion value=\"surprised\"/>오!", "surprised", "오!"],
    ["<emotion smile>네.", "smile", "네."],
    ["<EMOTION>Smile</EMOTION>Hi.", "smile", "Hi."],
    ["안녕하세요. <emotion>smile</emotion>반가워요.", "smile", "안녕하세요. 반가워요."],
    ["<emotion>smile</emotion>첫 문장. <emotion>neutral</emotion>둘째 문장.", "smile", "첫 문장. 둘째 문장."],
    ["답변 끝입니다. <emotion>neutral</emotion>", "neutral", "답변 끝입니다. "],
    ["<emotion>smile</emotion>앞</emotion>뒤", "smile", "앞뒤"],
    ["<emotion>smile 닫는 태그 없이 이어지는 글", "smile", "닫는 태그 없이 이어지는 글"],
    ["<emotion>angry</emotion>모르는 값은 중립.", "neutral", "모르는 값은 중립."],
  ];
  for (const [input, emotion, text] of cases) {
    const r = run([input]);
    assert.deepEqual(r.meta, [emotion], input);
    assert.equal(r.text, text, input);
    assert.doesNotMatch(r.text, LEAK, input);
  }
});

test("태그가 델타 경계 어디에서 쪼개져도 새지 않는다", () => {
  for (const full of [
    "<emotion>smile</emotion>ARMI는 병상 보조 로봇이에요.",
    "<emotion=smile>ARMI는 병상 보조 로봇이에요.",
    "앞 문장. <emotion>neutral</emotion>뒤 문장. [E2] 근거 번호도 <evidence>구분자</evidence>도.",
  ]) {
    everySplit(full, (r, at) => {
      assert.doesNotMatch(r.text, LEAK, `split@${at}: ${JSON.stringify(r.text)}`);
      assert.equal(r.meta.length, 1, `split@${at}: 메타는 한 번만`);
      assert.ok(r.text.includes("로봇이에요") || r.text.includes("뒤 문장"), `split@${at}`);
    });
  }
});

test("메타는 첫 글보다 먼저 한 번만 나가고, 태그가 없으면 neutral 로 시작한다", () => {
  const events: string[] = [];
  const s = new VisibleAnswerStream((e) => events.push(`meta:${e}`), (t) => events.push(`text:${t}`));
  s.push("<emo");
  s.push("tion>smile</emotion>안녕");
  s.push("하세요");
  s.end();
  assert.equal(events[0], "meta:smile");
  assert.equal(events.filter((e) => e.startsWith("meta:")).length, 1);
  assert.equal(events.slice(1).map((e) => e.slice(5)).join(""), "안녕하세요");

  const noTag = run(["태그 없이 바로 답하는 모델."]);
  assert.deepEqual(noTag.meta, ["neutral"]);
  assert.equal(noTag.text, "태그 없이 바로 답하는 모델.");
});

test("태그가 아닌 꺾쇠·대괄호는 글 그대로다", () => {
  for (const s of ["1 < 2 이고 3 > 2 예요.", "[Example] 은 근거 번호가 아니에요.", "<emotional> 은 다른 단어예요.", "배열 a[E] 표기", "끝에 꺾쇠 <"]) {
    assert.equal(run([s]).text, s, s);
  }
  // 스트림이 미완성 감정 태그로 끝나면 표지 조각이라 버린다
  assert.equal(run(["끝 <emotion"]).text, "끝 ");
});

test("파서 단독: 감정은 한 스트림에서 한 번만 확정된다", () => {
  const p = new ProtocolStreamParser();
  const a = p.push("<emotion>smile</emotion>A");
  const b = p.push("<emotion>sad</emotion>B");
  assert.equal(a.emotion, "smile");
  assert.equal(b.emotion, undefined);
  assert.equal(a.text + b.text + p.end().text, "AB");
});

test("화면 방어선: 저장된 메시지에 태그가 있어도 보이지 않고, 스트리밍 중 미완성 태그는 숨긴다", () => {
  assert.equal(stripEmphasisForDisplay("<emotion>neutral</emotion>**ARMI**는 로봇이에요."), "ARMI는 로봇이에요.");
  assert.equal(stripEmphasisForDisplay("<emotion=smile>안녕"), "안녕");
  assert.equal(stripEmphasisForDisplay("안녕하세요 <emo"), "안녕하세요 ");
  assert.equal(stripProtocolMarkers("근거 [E3] 에 따르면"), "근거 에 따르면");
});

test("음성 방어선: TTS 문자열에 감정 태그·근거 번호·마크다운이 없다", () => {
  const spoken = prepareSpokenText("<emotion>smile</emotion>**ARMI**는 [E1] 병상 로봇이에요. <emotion=neutral>끝.");
  assert.doesNotMatch(spoken, LEAK);
  assert.doesNotMatch(spoken, /\*\*|emotion|neutral|smile/);
  assert.match(spoken, /ARMI는/);
});
