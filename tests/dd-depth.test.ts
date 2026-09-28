import assert from "node:assert/strict";
import { test } from "node:test";

import {
  answerFromEvidence,
  buildGroundedSystemPrompt,
  resolveAnswerDepth,
} from "@/lib/docent/rag/grounding";
import { retrieve, type RetrievedChunk, type RetrievalResult } from "@/lib/docent/rag/retrieval";
import type { PageContext } from "@/lib/docent/rag/types";

const armiPage: PageContext = {
  pathname: "/projects/armi",
  pageType: "project",
  projectSlug: "armi",
  projectTitle: "ARMI",
};

function query(question: string, page: PageContext | null = null): RetrievalResult {
  return retrieve(question, page, { topK: 8 });
}

test("answer depth routes deterministically from existing overview and intent signals", () => {
  const cases: Array<[string, PageContext | null, "L1" | "L2" | "L3"]> = [
    ["어떤 프로젝트를 만들었나요?", null, "L1"],
    ["ARMI가 뭐예요?", null, "L2"],
    ["ARMI에서 어떤 기술을 썼어요?", null, "L2"],
    ["ARMI에서 직접 뭘 맡았어요?", null, "L2"],
    ["ARMI에서 가장 어려웠던 문제는?", null, "L3"],
    ["행가래 성능은 어떻게 개선했어요?", null, "L3"],
    ["이건 왜 이렇게 만들었어요?", armiPage, "L3"],
    ["어떤 기술을 다룰 수 있어요?", null, "L2"],
  ];

  for (const [question, page, expected] of cases) {
    assert.equal(resolveAnswerDepth(query(question, page)), expected, question);
  }
});

test("prompt treats evidence as a selective knowledge pool and contains no character cap", () => {
  for (const [question, page] of [
    ["어떤 프로젝트를 만들었나요?", null],
    ["ARMI가 뭐예요?", null],
    ["이건 왜 이렇게 만들었어요?", armiPage],
  ] as const) {
    const prompt = buildGroundedSystemPrompt(page, query(question, page));
    assert.match(prompt, /전부 소진할 체크리스트가 아니라 답변에 필요한 사실을 고르는 지식 풀/);
    assert.match(prompt, /질문에 잘 답하는 데 필요한 일부만 사용/);
    assert.match(prompt, /조각 제목, 섹션 라벨, 개발기 날짜, 출처 제목/);
    assert.match(prompt, /질문에 바로 답하기 → 이해에 꼭 필요한 맥락만 덧붙이기 → 멈추기/);
    assert.doesNotMatch(prompt, /\d+\s*(?:자|글자|characters?)\s*(?:안팎|이내|이하|미만|제한)/i);
  }
});

test("overview fallback emits one concise identity line per entity without deep-detail leakage", () => {
  const question = "어떤 프로젝트를 만들었나요?";
  const result = query(question);
  const answer = answerFromEvidence(question, null, result).answer;
  const lines = answer.split("\n");
  const projectLines = lines.filter((line) => line.startsWith("- "));

  assert.equal(projectLines.length, 5);
  for (const title of ["ARMI", "행가래", "Wedding AI", "Claw Dev", "AI Docent"]) {
    assert.equal(projectLines.filter((line) => line.includes(title)).length, 1, title);
  }
  assert.ok(projectLines.every((line) => /입니다\.$/.test(line)), answer);
  assert.doesNotMatch(answer, /(?:ARMI|행가래|Wedding AI|Claw Dev|AI Docent)\s*:/);
  assert.doesNotMatch(answer, /5~8만|node --check|tsc --noEmit|node --test|Precision|mAP|2026\.07\.16|시작한 계기/);
  assert.match(answer, /하나를 고르면 더 깊이 설명/);
  assert.ok(answer.length >= 200 && answer.length <= 330, `overview length ${answer.length}`);
});

test("fallback strips embedded heading/date metadata before rendering prose", () => {
  const base = query("AI Docent가 뭐예요?");
  const source = base.results.find((item) => item.chunk.projectId === "docent" && item.chunk.section === "overview");
  assert.ok(source);
  const dated: RetrievedChunk = {
    ...source,
    chunk: {
      ...source.chunk,
      title: "AI Docent — 뉴스에서 본 걸 실제로 만들어보기",
      text: "시작한 계기 2026.07.16: 방문자의 질문을 현재 페이지와 검색 근거에 연결하는 대화형 안내 서비스입니다.",
    },
  };
  const retrieval: RetrievalResult = {
    ...base,
    supported: true,
    intents: ["overview"],
    explicitProjects: ["docent"],
    activeProject: "docent",
    results: [dated],
  };
  const answer = answerFromEvidence("AI Docent가 뭐예요?", null, retrieval).answer;

  assert.match(answer, /방문자의 질문을 현재 페이지와 검색 근거에 연결/);
  assert.doesNotMatch(answer, /시작한 계기|2026\.07\.16|뉴스에서 본 걸 실제로 만들어보기/);
});

test("section-specific fallback selects the matching section even when it is not ranked first", () => {
  const question = "ARMI에서 직접 뭘 맡았어요?";
  const base = query(question, armiPage);
  const role = base.results.find((item) => item.chunk.section === "role");
  const other = base.results.find((item) => item.chunk.section !== "role");
  assert.ok(role && other);
  const reordered = { ...base, results: [other, role, ...base.results.filter((item) => item !== role && item !== other)] };
  const answer = answerFromEvidence(question, armiPage, reordered).answer;

  assert.match(answer, /^맡은 역할은 이렇게 기록돼 있어요\./);
  assert.match(answer, /ARMI에서 김범석이 맡은 역할/);
  assert.ok(!answer.includes(other.chunk.text));
});

test("evaluation fallbacks expose no raw chunk metadata", () => {
  const cases: Array<[string, PageContext | null]> = [
    ["어떤 프로젝트를 만들었나요?", null],
    ["ARMI가 뭐예요?", null],
    ["ARMI에서 어떤 기술을 썼어요?", null],
    ["ARMI에서 직접 뭘 맡았어요?", null],
    ["ARMI에서 가장 어려웠던 문제는?", null],
    ["행가래 성능은 어떻게 개선했어요?", null],
    ["어떤 기술을 다룰 수 있어요?", null],
    ["이건 왜 이렇게 만들었어요?", armiPage],
  ];

  for (const [question, page] of cases) {
    const retrieval = query(question, page);
    const answer = answerFromEvidence(question, page, retrieval).answer;
    for (const { chunk } of retrieval.results) {
      assert.ok(!answer.includes(chunk.title), `${question}: leaked title ${chunk.title}`);
    }
    assert.doesNotMatch(answer, /\b(?:overview|problem|role|architecture|technology|decision|troubleshooting|metric|result|lesson|award|devlog|roadmap)\b/i, question);
    assert.doesNotMatch(answer, /20\d{2}[.-]\d{1,2}[.-]\d{1,2}|\[E\d+\]|시작한 계기/, question);
  }
});
