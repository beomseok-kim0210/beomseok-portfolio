// RAG 프로젝트 커버리지 — 포트폴리오에 실제로 있는 정보는 찾고, 없는 사실만 모른다고 말한다.
//
// 2026-10-01 회귀: "ARMI에 대해서 설명해줘" 의 근거가 개요 조각 셋뿐이라(문제·역할·구조·기술·결과
// 없음) 모델이 "구체적인 문제, 기능, 기술 구성이나 성과가 기록돼 있지 않다" 고 답했다. 코퍼스에는
// ARMI 조각이 41 개 있었다. 이 파일은 답변 문자열이 아니라 검색 계약(대상 프로젝트, 근거 판정,
// 근거 섹션, 다른 프로젝트 섞임)과 모델에 실제로 실리는 근거 블록을 고정한다.
//
// 2026-10-01 하이브리드 전환: 근거 판정은 full / partial / none 이다. "설명해줘", "뭔데" 처럼 근거 본문에
// 없는 어절이 있으면 partial — 관련 근거는 실리고, 그 어절이 구어체인지 없는 사실인지는 모델이 가린다.
// 그래서 "답해야 한다" 는 none 이 아니고 근거 묶음이 실리는 것, "모른다고 해야 한다" 는 full 이 아니고
// 프롬프트가 근거에 없는 그 사실어를 밝히는 것이다. 이 파일은 dense 없이(BM25 폴백 모드) 돈다.
import "./helpers/legacyCorpus";
import assert from "node:assert/strict";
import { test } from "node:test";

import { getCorpus, RAG_EXCLUDED_SITE_PROJECTS } from "@/lib/docent/rag/corpus";
import { PROJECT_ENTITIES } from "@/lib/docent/rag/entities";
import { answerFromEvidence, buildGroundedSystemPrompt } from "@/lib/docent/rag/grounding";
import { retrieve, type RetrievalResult } from "@/lib/docent/rag/retrieval";
import type { PageContext, ProjectId, Section } from "@/lib/docent/rag/types";
import { projectDetails } from "@/data/projectDetails";
import { projects } from "@/data/projects";

import { oracleQuery } from "./helpers/oracleDense";

const PORTFOLIO_DENSE = oracleQuery(["profile:portfolio:projects", "project:armi:overview:recap", "project:hangarae:overview:recap", "project:wedding:overview:recap", "project:claw-dev:overview:recap", "project:docent:overview:detail"]);

const corpus = getCorpus();
const sectionsOf = (id: ProjectId) => new Set(corpus.filter((c) => c.projectId === id).map((c) => c.section));
const own = (r: RetrievalResult, id: ProjectId) => r.results.filter((x) => x.chunk.projectId === id);
const others = (r: RetrievalResult, ids: ProjectId[]) => r.results.filter((x) => x.chunk.projectId && !ids.includes(x.chunk.projectId));
const hasSection = (r: RetrievalResult, id: ProjectId, secs: Section[]) => own(r, id).some((x) => secs.includes(x.chunk.section));

/* ------------------------------------------------------------ 반드시 답해야 하는 질문 */

const MUST_ANSWER: Array<{ q: string; project: ProjectId | null; sections?: Section[] }> = [
  { q: "ARMI에 대해서 설명해줘", project: "armi", sections: ["overview", "role", "architecture", "technology", "result"] },
  { q: "armi가 뭐야?", project: "armi", sections: ["overview", "role", "architecture", "technology"] },
  // 운영 회귀(2026-10-01): 구어체·붙여 쓴 별칭
  { q: "armi프로젝트가 뭔데", project: "armi", sections: ["overview", "role", "architecture", "technology"] },
  { q: "ARMI가 뭔데?", project: "armi", sections: ["overview", "role", "architecture"] },
  { q: "아르미 뭐임?", project: "armi", sections: ["overview", "role"] },
  { q: "아르미 설명해줘", project: "armi", sections: ["overview", "role", "architecture"] },
  { q: "ARMI에서 맡은 역할은?", project: "armi", sections: ["role"] },
  { q: "ARMI 기술 구성은?", project: "armi", sections: ["technology"] },
  { q: "행가래에 대해서 설명해줘", project: "hangarae", sections: ["overview", "role", "technology"] },
  { q: "Wedding AI 설명해줘", project: "wedding", sections: ["overview", "problem", "role"] },
  { q: "Claw Dev가 뭐야?", project: "claw-dev", sections: ["overview", "role", "architecture"] },
  { q: "AI Docent를 설명해줘", project: "docent", sections: ["overview", "role", "architecture", "technology"] },
  { q: "어떤 프로젝트를 만들었나요?", project: null },
];

for (const c of MUST_ANSWER) {
  test(`답해야 한다: "${c.q}"`, () => {
    const r = retrieve(c.q, null, { topK: 8, dense: c.project ? null : PORTFOLIO_DENSE });
    assert.notEqual(r.support, "none", `${c.q}: support=${r.support}`);
    // 프롬프트에 "근거를 찾지 못했다" 가 실리지 않고, LLM 없는 폴백도 "기록 없음" 으로 답하지 않는다
    assert.doesNotMatch(buildGroundedSystemPrompt(null, r), /근거를 찾지 못했습니다/);
    assert.notEqual(answerFromEvidence(c.q, null, r).kind, "unsupported", c.q);
    if (c.project) {
      assert.deepEqual(r.explicitProjects, [c.project]);
      assert.equal(r.activeProject, c.project);
      assert.equal(others(r, [c.project]).length, 0, `다른 프로젝트 섞임: ${others(r, [c.project]).map((x) => x.chunk.id)}`);
      for (const sec of c.sections ?? []) assert.ok(hasSection(r, c.project, [sec]), `${c.q}: ${sec} 섹션 없음 — ${r.results.map((x) => x.chunk.id)}`);
    } else {
      assert.equal(r.activeProject, null);
      assert.equal(r.scope, "portfolio");
      const covered = new Set(r.results.map((x) => x.chunk.projectId).filter(Boolean));
      assert.ok(covered.size >= 4, `포트폴리오 전체 질문이 프로젝트 ${covered.size} 개만 덮는다`);
    }
  });
}

/* ------------------------------------------------------------ 없는 사실은 계속 모른다 */

const MUST_NOT_ANSWER: Array<[string, string]> = [
  ["ARMI 팀원의 혈액형은?", "혈액형"],
  ["ARMI 팀원 혈액형은?", "혈액형"],
  ["ARMI MAU는?", "MAU"],
  ["행가래 월간 활성 사용자 수는?", "월간"],
  ["행가래 매출은?", "매출"],
  ["Wedding AI의 투자 유치 금액은?", "투자"],
  ["Wedding AI 투자금은?", "투자금"],
  ["ARMI 월간 활성 사용자 수는?", "월간"],
  ["Claw Dev 투자 유치 금액은?", "투자"],
];

for (const [q, fact] of MUST_NOT_ANSWER) {
  test(`모른다고 해야 한다: "${q}"`, () => {
    const r = retrieve(q, null, { topK: 8 });
    assert.equal(r.supported, false, `${q}: support=${r.support}`);
    assert.notEqual(r.support, "full");
    // 근거에 없는 사실어가 판정에 남고, 프롬프트가 그 말을 짚어 "기록돼 있지 않다" 고 말하게 한다
    assert.ok(r.coverage.uncovered.some((w) => w.includes(fact)), `${q}: ${r.coverage.uncovered}`);
    const prompt = buildGroundedSystemPrompt(null, r);
    assert.match(prompt, new RegExp(`근거 본문에 나오지 않습니다: .*「[^」]*${fact}[^」]*」`));
    assert.match(prompt, /근거에 없는 대상·수치·사실을 묻는 말이라면 그 부분은 포트폴리오에 기록돼 있지 않다고 말하고/);
    // LLM 없는 폴백도 지어내지 않는다
    const a = answerFromEvidence(q, null, r);
    assert.match(a.answer, /기록/);
    assert.ok(a.kind === "unsupported" || a.kind === "partial");
  });
}

// 사이트 콘텐츠 리메이크(2026-10-02): ARMI의 Redis 원문·실시간 상태와 Chroma 장기 기억 분리가 명시됐습니다.
test("ARMI의 Redis 사용 이유는 프로젝트 근거로 답한다", () => {
  const q = "ARMI에서 Redis를 왜 썼어?";
  const r = retrieve(q, null, { topK: 8 });
  assert.equal(r.activeProject, "armi");
  assert.equal(others(r, ["armi"]).length, 0);
  assert.notEqual(r.support, "none");
  assert.ok(!r.coverage.uncovered.some((word) => word.includes("Redis")));
  const memory = r.results.find((item) => item.chunk.id === "project:armi:architecture:card:agent-decision-memory");
  assert.ok(memory, "Redis와 Chroma의 역할을 설명하는 구조 근거가 실려야 한다");
  assert.match(memory.chunk.text, /Redis는 빠른 원문·실시간 상태 조회/);
  assert.match(memory.chunk.text, /Chroma는 중요 내용의 장기 기억 의미 검색/);
  assert.notEqual(answerFromEvidence(q, null, r).kind, "unsupported");
});

/* ------------------------------------------------------------ 프로젝트 × 질문 유형 전수 */

const NAMES: Record<ProjectId, string> = { armi: "ARMI", hangarae: "행가래", wedding: "Wedding AI", "claw-dev": "Claw Dev", docent: "AI Docent" };
const KINDS: Array<[string, (n: string) => string, Section[]]> = [
  ["설명", (n) => `${n} 설명해줘`, ["overview"]],
  ["정의", (n) => `${n}가 뭐야?`, ["overview"]],
  ["역할", (n) => `${n}에서 내가 맡은 역할은?`, ["role"]],
  ["기술", (n) => `${n} 기술은 뭐 썼어?`, ["technology"]],
  ["문제", (n) => `${n}에서 가장 어려웠던 문제는?`, ["troubleshooting"]],
  ["성과", (n) => `${n} 결과나 성과는?`, ["result", "metric"]],
  ["결정", (n) => `${n}에서 왜 그 기술을 선택했어?`, ["decision", "technology"]],
];

test("다섯 프로젝트 × 일곱 질문: 대상 프로젝트가 맞고, 근거가 있고, 섹션이 실리고, 다른 프로젝트가 섞이지 않는다", () => {
  const failures: string[] = [];
  for (const id of Object.keys(NAMES) as ProjectId[]) {
    const have = sectionsOf(id);
    for (const [kind, make, secs] of KINDS) {
      const q = make(NAMES[id]);
      const r = retrieve(q, null, { topK: 8 });
      if (r.activeProject !== id) failures.push(`${q}: active=${r.activeProject}`);
      if (r.support === "none") failures.push(`${q}: none (${kind})`);
      if (others(r, [id]).length > 0) failures.push(`${q}: 다른 프로젝트 ${others(r, [id]).length} 개`);
      if (secs.some((s) => have.has(s)) && !hasSection(r, id, secs)) failures.push(`${q}: ${secs.join("/")} 없음`);
    }
  }
  assert.deepEqual(failures, []);
});

test("비교 질문은 두 프로젝트를 고르게 싣고 세 번째 프로젝트를 섞지 않는다", () => {
  for (const [q, ids] of [["ARMI랑 행가래 차이가 뭐야?", ["armi", "hangarae"]], ["Wedding AI와 Claw Dev는 어떤 점이 달라?", ["wedding", "claw-dev"]]] as const) {
    const r = retrieve(q, null, { topK: 8 });
    assert.deepEqual(r.explicitProjects, [...ids]);
    assert.notEqual(r.support, "none", q);
    for (const id of ids) assert.ok(own(r, id).length >= 2, `${q}: ${id} ${own(r, id).length} 개`);
    assert.equal(others(r, [...ids]).length, 0, `${q}: ${others(r, [...ids]).map((x) => x.chunk.id)}`);
  }
});

test("포트폴리오 전체 질문과 특정 프로젝트 질문은 다르게 라우팅된다", () => {
  const broad = retrieve("대표 프로젝트들을 설명해줘", null, { topK: 8, dense: PORTFOLIO_DENSE });
  const one = retrieve("ARMI 설명해줘", null, { topK: 8 });
  assert.equal(broad.activeProject, null);
  assert.ok(new Set(broad.results.map((x) => x.chunk.projectId)).size >= 4);
  assert.equal(one.activeProject, "armi");
  assert.equal(new Set(one.results.map((x) => x.chunk.projectId)).size, 1);
});

test("현재 프로젝트 페이지의 \"이 프로젝트 설명해줘\" 도 개요 한 줄이 아니라 묶음을 싣는다", () => {
  const armiPage: PageContext = { pathname: "/projects/armi", pageType: "project", projectSlug: "armi", projectTitle: "ARMI" };
  const r = retrieve("이 프로젝트 설명해줘", armiPage, { topK: 8 });
  assert.equal(r.activeProject, "armi");
  assert.notEqual(r.support, "none");
  for (const sec of ["overview", "role", "architecture", "technology"] as Section[]) assert.ok(hasSection(r, "armi", [sec]), sec);
});

/* ------------------------------------------------------------ 모델에 실리는 근거 */

test("ARMI 설명 질문의 시스템 프롬프트 <evidence> 에 역할·구조·기술·결과 근거가 실제로 실린다", () => {
  const r = retrieve("ARMI에 대해서 설명해줘", null, { topK: 8 });
  const prompt = buildGroundedSystemPrompt(null, r);
  const evidence = prompt.slice(prompt.indexOf("<evidence>"), prompt.indexOf("</evidence>"));
  assert.doesNotMatch(prompt, /근거 검색 결과가 질문과 충분히 맞지 않았습니다|근거를 찾지 못했습니다/);
  for (const sec of ["overview", "role", "architecture", "technology", "result"]) {
    assert.match(evidence, new RegExp(`\\(ARMI · ${sec}\\)`), `${sec} 근거가 프롬프트에 없다`);
  }
  // 한 줄 정의 조각의 실제 본문이 그대로 실린다
  const recap = corpus.find((c) => c.id === "project:armi:overview:recap")!;
  assert.ok(evidence.includes(recap.text.slice(0, 40)));
});

/* ------------------------------------------------------------ 도슨트 자신에 대한 질문 */

test("도슨트에게 자기 음성·입모양을 물으면 AI Docent 의 현재 구조를 근거로 찾는다", () => {
  for (const q of ["왜 너는 음성이랑 입모양이 나중에 나오는 거야?", "현재 네 음성 구조가 어떻게 돼?", "왜 첫 음성은 느려?", "입모양은 어떻게 움직여?"]) {
    const r = retrieve(q, { pathname: "/", pageType: "home" }, { topK: 8 });
    assert.notEqual(r.support, "none", `${q}: ${r.support}`);
    const top = r.results.filter((x) => x.chunk.projectId === "docent");
    assert.ok(top.length >= 3, `${q}: docent 근거 ${top.length} 개 — ${r.results.map((x) => x.chunk.id)}`);
    assert.equal(others(r, ["docent"]).length, 0, `${q}: ${others(r, ["docent"]).map((x) => x.chunk.id)}`);
  }
  // 7월 개발기만이 아니라 9월 이후의 현재 구조가 실린다
  const voice = retrieve("왜 너는 음성이랑 입모양이 나중에 나오는 거야?", null, { topK: 8 });
  assert.ok(voice.results.some((x) => x.chunk.id.startsWith("project:docent:devlog:202609")), voice.results.map((x) => x.chunk.id).join(","));
});

test("2인칭 규칙은 좁다 — 다른 프로젝트를 명시하거나 도슨트 화제가 아니면 AI Docent 로 끌려가지 않는다", () => {
  assert.deepEqual(retrieve("너는 ARMI에서 무슨 역할을 했어?", null).explicitProjects, ["armi"]);
  assert.deepEqual(retrieve("행가래는 왜 느려?", null).explicitProjects, ["hangarae"]);
  assert.deepEqual(retrieve("너 기술 스택 뭐야?", null).explicitProjects, []);
});

/* ------------------------------------------------------------ 코퍼스 감사 */

test("모든 RAG 프로젝트는 개요·역할·구조·기술·결과 조각을 하나 이상 가진다", () => {
  for (const p of PROJECT_ENTITIES) {
    const have = sectionsOf(p.id);
    for (const sec of ["overview", "role", "architecture", "technology", "result"] as Section[]) {
      assert.ok(have.has(sec), `${p.title}: ${sec} 조각이 없다`);
    }
  }
});

test("사이트에 있는 프로젝트는 코퍼스에 개요가 있거나, 이유와 함께 제외 목록에 있다", () => {
  const ragIds = new Set(PROJECT_ENTITIES.map((p) => p.id as string));
  const siteIds = new Set<string>([
    ...projects.map((p) => p.key),
    ...projectDetails.map((d) => (d.slug === "ai-docent" ? "docent" : d.slug)),
  ]);
  for (const id of siteIds) {
    if (id in RAG_EXCLUDED_SITE_PROJECTS) continue;
    assert.ok(ragIds.has(id), `사이트 프로젝트 ${id} 가 RAG 엔티티에 없다 — PROJECT_ENTITIES 에 등록하거나 RAG_EXCLUDED_SITE_PROJECTS 에 이유를 적어라`);
    assert.ok(corpus.some((c) => c.projectId === id && c.section === "overview"), `${id}: 개요 조각이 없다`);
  }
  // 제외 목록은 실제 사이트 프로젝트만, 이유는 비어 있지 않게 — 오래된 예외가 남지 않는다
  for (const [id, reason] of Object.entries(RAG_EXCLUDED_SITE_PROJECTS)) {
    assert.ok(siteIds.has(id), `제외 목록의 ${id} 는 사이트에 없다`);
    assert.ok(!ragIds.has(id), `${id} 는 이미 RAG 엔티티다 — 제외 목록에서 빼라`);
    assert.ok(reason.length > 10);
  }
});

test("AI Docent 프로젝트 페이지 데이터가 코퍼스에 들어가고, 현재 운영 구조와 어긋난 문구가 없다", () => {
  const docent = corpus.filter((c) => c.projectId === "docent");
  assert.ok(docent.some((c) => c.id === "project:docent:role:detail"));
  assert.ok(docent.some((c) => c.id === "project:docent:architecture:detail"));
  const text = docent.map((c) => c.text).join(" ");
  assert.doesNotMatch(text, /브라우저 viseme/);
  assert.doesNotMatch(text, /비용 0원의 데모 모드/);
  assert.match(text, /RunPod/);
  assert.match(text, /합성은 정확히 한 번|합성을 한 번/);
});
