// 답변 정책 — 길이·깊이는 규칙 기반 라우터(L1/L2/L3)가 아니라 모델이 질문과 대화 흐름을 보고 정한다.
//
// 2026-10-01: "왜?" 같은 짧은 후속 질문이 정규식으로 decision 의도 → L3 심화로 잡혀 원하지 않는 장문이
// 나왔다. 그 라우터(resolveAnswerDepth / resolveAnswerShape / DEPTH_GUIDANCE / ANSWER_SHAPING)를 없애고
// 프롬프트에 "기본은 짧게, 더 물으면 깊게" 대화 방식을 준다. 이 파일은 그 계약과, LLM 없는 폴백이
// 내부 메타데이터를 노출하지 않는 것을 고정한다.
import "./helpers/legacyCorpus";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import * as grounding from "@/lib/docent/rag/grounding";
import { answerFromEvidence, buildGroundedSystemPrompt, projectInventory } from "@/lib/docent/rag/grounding";
import { retrieve, type ConversationTurn, type RetrievedChunk, type RetrievalResult } from "@/lib/docent/rag/retrieval";
import type { PageContext } from "@/lib/docent/rag/types";
import { docentConfig } from "@/data/docent";

import { oracleQuery } from "./helpers/oracleDense";

const armiPage: PageContext = { pathname: "/projects/armi", pageType: "project", projectSlug: "armi", projectTitle: "ARMI" };
const ARMI_ANSWER = "ARMI는 병상 환자의 음성 요청을 AI Agent가 판단해 답변, 로봇 동작, 웹 검색으로 연결하는 병상 보조 로봇이에요.";

function query(question: string, page: PageContext | null = null, history: ConversationTurn[] = []): RetrievalResult {
  return retrieve(question, page, { topK: 8, history });
}

test("규칙 기반 답변 깊이 라우터가 없다 — L1/L2/L3·답변 모양 라우팅·의도 정규식", () => {
  assert.equal("resolveAnswerDepth" in grounding, false);
  assert.equal("resolveAnswerShape" in grounding, false);
  const retrievalSrc = readFileSync("src/lib/docent/rag/retrieval.ts", "utf8");
  const groundingSrc = readFileSync("src/lib/docent/rag/grounding.ts", "utf8");
  for (const gone of ["INTENT_PATTERNS", "SECTION_FOR_INTENT", "QUESTION_WORD_STEMS", "QUESTION_WORDS_EXACT", "detectIntents", "looksLikeFollowUp", "isBroadPortfolioOverviewQuery", "classifyWords"]) {
    assert.ok(!retrievalSrc.includes(gone), `retrieval.ts 에 ${gone} 가 남아 있다`);
  }
  for (const gone of ["DEPTH_GUIDANCE", "ANSWER_SHAPING", "L1 개요", "L3 심화"]) {
    assert.ok(!groundingSrc.includes(gone), `grounding.ts 에 ${gone} 가 남아 있다`);
  }
});

test("\"왜?\" 같은 짧은 후속 질문과 첫 질문이 같은 대화 정책을 받는다 — 질문 종류별 깊이 지시가 없다", () => {
  const first = buildGroundedSystemPrompt(null, query("ARMI가 뭔데?"));
  const why = buildGroundedSystemPrompt(null, query("왜?", null, [{ role: "user", content: "ARMI가 뭔데?" }, { role: "assistant", content: ARMI_ANSWER }]));
  const section = (p: string) => p.slice(p.indexOf("## 대화 방식"), p.indexOf("## 답변 규칙"));
  assert.equal(section(first), section(why));
  for (const p of [first, why]) {
    assert.doesNotMatch(p, /답변 깊이|L[123]\b|심화:|케이스 스터디로 확장/);
  }
});

test("대화 방식: 기본은 짧게, 질문에 먼저 답하고 끝내고, 더 물으면 깊어지고, 상투적 마무리를 하지 않는다", () => {
  const p = buildGroundedSystemPrompt(null, query("ARMI가 뭔데?"));
  assert.match(p, /기본은 짧고 직접적으로 답합니다/);
  assert.match(p, /질문에 먼저 답하고 거기서 끝냅니다/);
  assert.match(p, /검색 근거를 한 번에 다 풀어 놓지 않고/);
  assert.match(p, /묻지 않은 아키텍처·수치·기술 스택을 나열하지 않습니다/);
  assert.match(p, /더 묻거나 "자세히", "더 설명해줘" 라고 하면 그때 한 단계 깊게/);
  assert.match(p, /"왜\?", "어떻게\?", "그건\?".*직전 답변에서 말한 내용을 가리킵니다/);
  assert.match(p, /상투적인 문장을 붙이지 않습니다/);
  assert.match(p, /"대표적인 거 2개만"/);
  assert.doesNotMatch(p, /\d+\s*(?:자|글자|characters?)\s*(?:안팎|이내|이하|미만|제한)/i);
});

test("어시스턴트의 이전 답변은 사실의 출처가 아니라고 프롬프트가 못 박는다", () => {
  const p = buildGroundedSystemPrompt(null, query("왜?", null, [{ role: "user", content: "ARMI가 뭔데?" }, { role: "assistant", content: "ARMI는 팀원 12명이 만든 웨딩 로봇이에요." }]));
  assert.match(p, /이전 대화에서 당신\(어시스턴트\)이 한 답변은 .*사실의 출처가 아닙니다/);
  // 어시스턴트 문장은 근거 블록에 들어가지 않는다
  const evidence = p.slice(p.indexOf("<evidence>"));
  assert.ok(!evidence.includes("12명") && !evidence.includes("웨딩 로봇"));
});

test("정본 프로젝트 목록이 모든 프롬프트에 실린다 — 검색이 치우쳐도 AI Docent 가 빠지지 않는다", () => {
  const inventory = projectInventory();
  for (const title of ["ARMI", "행가래", "Wedding AI", "Claw Dev", "AI Docent"]) assert.match(inventory, new RegExp(`- ${title}: \\S`));
  for (const q of ["어떤 프로젝트를 만들었나요?", "ARMI가 뭔데?", "오늘 날씨 어때?"]) {
    const p = buildGroundedSystemPrompt(null, query(q));
    assert.ok(p.includes(inventory), q);
    assert.match(p, /범위를 정하지 않고 포트폴리오 전체의 프로젝트를 물으면 아래 프로젝트 목록의 프로젝트를 빠뜨리지 않고/);
  }
});

test("출력 상한은 안전 상한이다 — 2048 에서 내렸지만 긴 답을 자를 만큼 낮지 않다", () => {
  assert.ok(docentConfig.maxTokens >= 600 && docentConfig.maxTokens <= 1000, String(docentConfig.maxTokens));
});

test("LLM 없는 포트폴리오 개요 폴백: 프로젝트마다 한 줄, 내부 메타데이터 없음", () => {
  const dense = oracleQuery(["profile:portfolio:projects", "project:armi:overview:recap", "project:hangarae:overview:recap", "project:wedding:overview:recap", "project:claw-dev:overview:recap", "project:docent:overview:detail"]);
  const r = retrieve("어떤 프로젝트를 만들었나요?", null, { topK: 8, dense });
  assert.equal(r.scope, "portfolio");
  const answer = answerFromEvidence("어떤 프로젝트를 만들었나요?", null, r).answer;
  const lines = answer.split("\n").filter((line) => line.startsWith("- "));
  assert.equal(lines.length, 5, answer);
  for (const title of ["ARMI", "행가래", "Wedding AI", "Claw Dev", "AI Docent"]) assert.equal(lines.filter((l) => l.includes(title)).length, 1, title);
  assert.doesNotMatch(answer, /5~8만|node --check|tsc --noEmit|Precision|mAP|2026\.07\.16|시작한 계기/);
});

test("LLM 없는 폴백은 개발기 머리말·날짜를 걷어낸다", () => {
  const base = query("AI Docent가 뭐예요?");
  const source = base.results.find((item) => item.chunk.projectId === "docent" && item.chunk.section === "overview");
  assert.ok(source);
  const dated: RetrievedChunk = {
    ...source,
    chunk: { ...source.chunk, title: "AI Docent — 뉴스에서 본 걸 실제로 만들어보기", text: "시작한 계기 2026.07.16: 방문자의 질문을 현재 페이지와 검색 근거에 연결하는 대화형 안내 서비스입니다." },
  };
  const retrieval: RetrievalResult = { ...base, support: "full", supported: true, explicitProjects: ["docent"], activeProject: "docent", results: [dated] };
  const answer = answerFromEvidence("AI Docent가 뭐예요?", null, retrieval).answer;
  assert.match(answer, /방문자의 질문을 현재 페이지와 검색 근거에 연결/);
  assert.doesNotMatch(answer, /시작한 계기|2026\.07\.16|뉴스에서 본 걸 실제로 만들어보기/);
});

test("LLM 없는 폴백은 조각 제목·섹션 라벨·근거 번호를 노출하지 않는다", () => {
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
    for (const { chunk } of retrieval.results) assert.ok(!answer.includes(chunk.title), `${question}: leaked title ${chunk.title}`);
    assert.doesNotMatch(answer, /\b(?:overview|problem|role|architecture|technology|decision|troubleshooting|metric|result|lesson|award|devlog|roadmap)\b/i, question);
    assert.doesNotMatch(answer, /20\d{2}[.-]\d{1,2}[.-]\d{1,2}|\[E\d+\]|시작한 계기|<emotion/, question);
  }
});

test("LLM 없는 폴백: \"ARMI에 대해서 설명해줘\" 는 \"기록 없음\" 이 아니라 기록된 내용을 읽는다", () => {
  for (const q of ["ARMI에 대해서 설명해줘", "armi프로젝트가 뭔데", "ARMI가 뭔데?"]) {
    const a = answerFromEvidence(q, null, query(q));
    assert.notEqual(a.kind, "unsupported", `${q}: ${a.answer}`);
    assert.match(a.answer, /병상|환자|AI Agent/, q);
  }
});
