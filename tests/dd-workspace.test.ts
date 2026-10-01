import "./helpers/legacyCorpus";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { answerFromEvidence, buildGroundedSystemPrompt } from "@/lib/docent/rag/grounding";
import { retrieve } from "@/lib/docent/rag/retrieval";
import type { PageContext } from "@/lib/docent/rag/types";

import { oracleQuery } from "./helpers/oracleDense";

// 포트폴리오 전체 질문의 dense 순위: 전체 목록 조각과 프로젝트 개요들이 위에 온다(실제 임베딩에서 기대하는 모양).
const PORTFOLIO_DENSE = oracleQuery([
  "profile:portfolio:projects",
  "project:armi:overview:recap",
  "project:hangarae:overview:recap",
  "project:wedding:overview:recap",
  "project:claw-dev:overview:recap",
  "project:docent:overview:detail",
]);

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");
const shell = read("src/features/docent/GlobalDocent.tsx");
const experience = read("src/features/docent/DocentExperience.tsx");
const chat = read("src/features/docent/ChatPanel.tsx");
const layout = read("src/app/layout.tsx");
const globals = read("src/app/globals.css");
const runtime = read("src/features/docent/DocentRuntime.tsx");

const armiPage: PageContext = {
  pathname: "/projects/armi",
  pageType: "project",
  projectSlug: "armi",
  projectTitle: "ARMI",
};

test("expanded DD occupies only the region below the persistent 56px header", () => {
  assert.match(read("src/components/ui/SiteHeader.tsx"), /h-14 max-w-\[1440px\]/);
  assert.match(shell, /fixed inset-x-0 bottom-0 top-14/);
  assert.match(shell, /data-docent-workspace/);
  assert.match(experience, /data-docent-avatar-region/);
  assert.match(experience, /data-docent-conversation-region/);
  assert.match(experience, /grid-rows-\[auto_minmax\(0,1fr\)\]/);
  assert.match(experience, /lg:grid-cols-\[minmax\(360px,42%\)_minmax\(0,58%\)\]/);
  assert.equal((chat.match(/overflow-y-auto/g) ?? []).length, 1);
  assert.match(chat, /max-w-\[860px\]/);
  assert.match(chat, /aria-label="도슨트에게 질문하기"/);
});

test("minimize restores the untouched portfolio layout without reflow", () => {
  assert.match(shell, /dispatch\(\{ type: "MINIMIZE" \}\)/);
  assert.match(shell, /invisible translate-y-3 opacity-0/);
  assert.match(layout, /<div className="global-docent-layout" data-global-docent-layout>/);
  assert.match(globals, /\.global-docent-layout\s*\{\s*min-width: 0;\s*padding-right: 0;/);
  assert.doesNotMatch(shell, /document\.body\.style\.(width|padding|margin)|data-global-docent-layout.*style=/);
});

test("broad overview evidence spans every recorded project and excludes devlogs", () => {
  for (const page of [null, armiPage]) {
    const result = retrieve("어떤 프로젝트를 만들었나요?", page, { topK: 8, dense: PORTFOLIO_DENSE });
    assert.equal(result.scope, "portfolio");
    const entities = new Set(result.results.map((item) => item.chunk.entityId));
    assert.ok(entities.size >= 4);
    assert.deepEqual([...entities].filter((e) => e !== "portfolio").sort(), ["armi", "claw-dev", "docent", "hangarae", "wedding"]);
    assert.equal(result.results[0].chunk.id, "profile:portfolio:projects");
    assert.ok(result.results.every((item) => item.chunk.section !== "devlog"));
  }
});

test("portfolio scope comes from the result shape, not a question regex — and overrides page bias", () => {
  // dense 가 전체 목록·개요들을 올리면 프로젝트 페이지에서도 포트폴리오 전체 범위다.
  const broad = retrieve("어떤 프로젝트를 만들었나요?", armiPage, { topK: 8, dense: PORTFOLIO_DENSE });
  assert.equal(broad.scope, "portfolio");
  assert.equal(broad.activeProject, null);
  assert.ok(new Set(broad.results.map((item) => item.chunk.projectId).filter(Boolean)).size >= 5);

  // 지시어 질문은 지금 보는 프로젝트에 머문다(정규식 의도 없이도). 결정 근거가 묶음에 실린다.
  const decision = retrieve("이건 왜 이렇게 만들었어요?", armiPage, { topK: 8 });
  assert.equal(decision.activeProject, "armi");
  assert.ok(decision.results.every((item) => !item.chunk.projectId || item.chunk.projectId === "armi"));
  assert.ok(decision.results.some((item) => item.chunk.projectId === "armi" && item.chunk.section === "decision"));
});

test("prompt has one conversational policy for every question — no per-intent shaping, no character ceiling", () => {
  const broad = retrieve("어떤 프로젝트를 만들었나요?", null, { topK: 8, dense: PORTFOLIO_DENSE });
  const prompt = buildGroundedSystemPrompt(null, broad);
  assert.doesNotMatch(prompt, /300자|답변 깊이|답변 구성 지침/);
  assert.match(prompt, /포트폴리오 전체 범위/);
  assert.match(prompt, /프로젝트 이름을 감탄사처럼 되풀이하는 시작을 피합니다/);
  const technology = buildGroundedSystemPrompt(null, retrieve("어떤 기술을 다룰 수 있어요?", null, { topK: 8 }));
  assert.match(technology, /묻지 않은 아키텍처·수치·기술 스택을 나열하지 않습니다/);
});

test("deterministic broad fallback names multiple projects without an ARMI echo opening", () => {
  const result = retrieve("어떤 프로젝트를 만들었나요?", null, { topK: 8, dense: PORTFOLIO_DENSE });
  const answer = answerFromEvidence("어떤 프로젝트를 만들었나요?", null, result).answer;
  for (const title of ["ARMI", "행가래", "Wedding AI", "Claw Dev", "AI Docent"]) {
    assert.match(answer, new RegExp(title));
  }
  assert.doesNotMatch(answer, /^「?ARMI」?\s*(그래서|그렇게)/);
});

test("workspace open, navigation, and text send cannot warm voice", () => {
  const nonVoiceSurfaces = [shell, experience, chat, read("src/features/docent/useDocentChat.ts")];
  for (const source of nonVoiceSurfaces) assert.equal(source.includes("/api/docent/voice/warm"), false);
  assert.match(runtime, /if \(voiceEnabled\) ensureReady\(\)/);
  assert.equal((read("src/features/docent/voiceWarmClient.ts").match(/\/api\/docent\/voice\/warm/g) ?? []).length, 1);
});
