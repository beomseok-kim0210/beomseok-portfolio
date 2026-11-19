import test from "node:test";
import assert from "node:assert/strict";
import { toPoliteSpeech } from "@/lib/docent/politeSpeech";

test("서술체 문장 끝을 합니다체로 바꾼다", () => {
  const cases: Array<[string, string]> = [
    ["로봇 동작, 검색, 기억 조회 같은 실행 경로로 연결하는 병상 보조 로봇 프로젝트다.", "로봇 동작, 검색, 기억 조회 같은 실행 경로로 연결하는 병상 보조 로봇 프로젝트입니다."],
    ["AIoT 재활 보조 시스템이다.", "AIoT 재활 보조 시스템입니다."],
    ["게임형 피드백으로 바꾸는 것이 핵심이었다.", "게임형 피드백으로 바꾸는 것이 핵심이었습니다."],
    ["실제 코드를 생성한다.", "실제 코드를 생성합니다."],
    ["근거를 찾는다.", "근거를 찾습니다."],
    ["지연이 있다.", "지연이 있습니다."],
    ["비용이 크다.", "비용이 큽니다."],
    ["정답은 아니다.", "정답은 아닙니다."],
    ["이미 합니다체입니다.", "이미 합니다체입니다."],
    ["문장 중간의 다음 단어는 그대로 둔다 다음", "문장 중간의 다음 단어는 그대로 둔다 다음"],
  ];
  for (const [input, expected] of cases) assert.equal(toPoliteSpeech(input), expected);
});

test("여러 문장과 줄 끝을 모두 바꾼다", () => {
  assert.equal(toPoliteSpeech("A를 만들었다. B를 검증한다\n행가래다"), "A를 만들었습니다. B를 검증합니다\n행가래입니다");
});
