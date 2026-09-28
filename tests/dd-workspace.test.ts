import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  answerFromEvidence,
  buildGroundedSystemPrompt,
  resolveAnswerShape,
} from "@/lib/docent/rag/grounding";
import { retrieve } from "@/lib/docent/rag/retrieval";
import type { PageContext } from "@/lib/docent/rag/types";

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
    const result = retrieve("어떤 프로젝트를 만들었나요?", page, { topK: 8 });
    const entities = new Set(result.results.map((item) => item.chunk.entityId));
    assert.ok(entities.size >= 4);
    assert.deepEqual([...entities].sort(), ["armi", "claw-dev", "docent", "hangarae", "wedding"]);
    assert.ok(result.results.every((item) => item.chunk.section !== "devlog"));
  }
});

test("broad portfolio routing overrides page bias while ambiguous decision routing keeps ARMI", () => {
  const broad = retrieve("어떤 프로젝트를 만들었나요?", armiPage, { topK: 8 });
  assert.equal(resolveAnswerShape(armiPage, broad), "PROJECT_PORTFOLIO_OVERVIEW");
  assert.ok(new Set(broad.results.map((item) => item.chunk.entityId)).size >= 4);

  const decision = retrieve("이건 왜 이렇게 만들었어요?", armiPage, { topK: 8 });
  assert.equal(decision.activeProject, "armi");
  assert.ok(decision.results.some((item) => item.chunk.projectId === "armi" && item.chunk.section === "decision"));
  assert.equal(decision.results[0].chunk.projectId, "armi");
  assert.equal(decision.results[0].chunk.section, "decision");
});

test("prompt shaping is intent-aware and removes the fixed 300-character ceiling", () => {
  const broad = retrieve("어떤 프로젝트를 만들었나요?", null, { topK: 8 });
  const prompt = buildGroundedSystemPrompt(null, broad);
  assert.doesNotMatch(prompt, /300자/);
  assert.match(prompt, /질문의 범위와 아래 답변 깊이로 정합니다/);
  assert.match(prompt, /대표 프로젝트를 이름과 정체성이 드러나는 짧은 문장 하나씩/);
  assert.match(prompt, /프로젝트 이름을 감탄사처럼 되풀이하며 시작하지 않습니다/);
  assert.match(prompt, /"그래서 우리는", "그렇게 만들었습니다"/);

  const technology = retrieve("어떤 기술을 다룰 수 있어요?", null, { topK: 8 });
  assert.equal(resolveAnswerShape(null, technology), "TECHNOLOGY_OVERVIEW");
  assert.match(buildGroundedSystemPrompt(null, technology), /원시 스택 목록으로 나열하지 않습니다/);
});

test("deterministic broad fallback names multiple projects without an ARMI echo opening", () => {
  const result = retrieve("어떤 프로젝트를 만들었나요?", null, { topK: 8 });
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
