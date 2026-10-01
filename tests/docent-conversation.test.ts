// 다중 턴 대화 회귀 — 짧은 후속 질문이 무엇을 가리키는지 이해하고, 어시스턴트의 이전 답은 사실 근거가
// 되지 않는다. BM25 폴백 모드(dense 없음)와, dense 가 문맥을 반영해 순위를 낸 경우(정답 dense) 둘 다 본다.
//
// 이 파일이 고정하는 것: 대화가 가리키는 프로젝트(activeProject), 실리는 근거(프로젝트·섹션),
// 근거 블록에 어시스턴트 문장이 없는 것, 대화마다 같은 대화 정책 프롬프트. 답이 "점점 깊어지는지" 는
// 모델 행동이라 여기서 잴 수 없다 — 프롬프트 계약(dd-answer-policy)과 라이브 검증 몫이다.
import "./helpers/legacyCorpus";
import assert from "node:assert/strict";
import { test } from "node:test";

import { buildGroundedSystemPrompt } from "@/lib/docent/rag/grounding";
import { conversationStateOf, retrieve, type ConversationTurn, type DenseQuery, type RetrievalResult } from "@/lib/docent/rag/retrieval";

import { oracleQuery } from "./helpers/oracleDense";

const A1 = "ARMI는 병상 환자의 음성 요청을 AI Agent가 판단해 답변, 로봇 동작, 웹 검색으로 연결하는 병상 보조 로봇이에요.";
const A2 = "환자 음성을 STT로 바꾼 뒤 AI Agent가 요청을 분류하고, 실시간 이벤트는 WebSocket으로 전달해요.";
// 사실과 다른(가정상 환각한) 어시스턴트 문장 — 근거로 새면 안 된다
const HALLUCINATED = "ARMI는 팀원 12명이 Kubernetes 로 운영한 웨딩드레스 로봇이에요.";

type Turn = { q: string; history: ConversationTurn[]; dense?: DenseQuery };
function ask({ q, history, dense }: Turn): RetrievalResult {
  return retrieve(q, { pathname: "/", pageType: "home" }, { topK: 8, history, dense: dense ?? null });
}
const projects = (r: RetrievalResult) => new Set(r.results.map((x) => x.chunk.projectId).filter(Boolean));
const evidenceOf = (r: RetrievalResult) => {
  const p = buildGroundedSystemPrompt({ pathname: "/", pageType: "home" }, r);
  return p.slice(p.indexOf("<evidence>"));
};

/* ------------------------------------------------------------- Scenario A */

const SCENARIO_A: Array<{ q: string; history: ConversationTurn[] }> = [
  { q: "ARMI가 뭔데?", history: [] },
  { q: "어떻게 동작해?", history: [{ role: "user", content: "ARMI가 뭔데?" }, { role: "assistant", content: A1 }] },
  { q: "왜 그렇게 한 거야?", history: [{ role: "user", content: "ARMI가 뭔데?" }, { role: "assistant", content: A1 }, { role: "user", content: "어떻게 동작해?" }, { role: "assistant", content: A2 }] },
  { q: "그럼 가장 어려웠던 건?", history: [{ role: "user", content: "ARMI가 뭔데?" }, { role: "assistant", content: A1 }, { role: "user", content: "어떻게 동작해?" }, { role: "assistant", content: A2 }, { role: "user", content: "왜 그렇게 한 거야?" }, { role: "assistant", content: "환자 요청이 여러 기능으로 갈라지기 때문이에요." }] },
];

test("Scenario A (BM25): ARMI → 어떻게 → 왜 → 가장 어려웠던 건 — 네 턴 모두 ARMI 에 머물고 다른 프로젝트가 섞이지 않는다", () => {
  for (const turn of SCENARIO_A) {
    const r = ask(turn);
    assert.equal(r.activeProject, "armi", `${turn.q}: ${r.activeProject}`);
    assert.deepEqual([...projects(r)], ["armi"], `${turn.q}: ${[...projects(r)]}`);
    assert.notEqual(r.support, "none", turn.q);
  }
  // 마지막 턴은 어려움(트러블슈팅·결정) 근거가 실린다
  const last = ask(SCENARIO_A[3]);
  assert.ok(last.results.some((x) => x.chunk.section === "troubleshooting"), last.results.map((x) => x.chunk.id).join(","));
});

test("Scenario A (hybrid): 문맥 dense 가 결정·구조 근거를 올리면 \"왜 그렇게 한 거야?\" 에 그 근거가 먼저 실린다", () => {
  // 문맥 질의([context] ARMI… [current] 왜 그렇게 한 거야?)의 dense 순위가 ARMI 결정 조각을 올렸다고 가정한다.
  const dense = oracleQuery(
    ["project:hangarae:decision:trouble-02", "project:wedding:decision:pivot"], // 현재 질문만으로는 엉뚱한 결정 조각
    ["project:armi:decision:02-conversation-loop", "project:armi:decision:01-audio-ownership", "project:armi:architecture:state-machine"],
  );
  const r = ask({ ...SCENARIO_A[2], dense });
  assert.equal(r.activeProject, "armi");
  assert.deepEqual([...projects(r)], ["armi"]);
  assert.equal(r.results[0].chunk.section, "decision", r.results.map((x) => x.chunk.id).join(","));
});

test("어시스턴트의 이전 답은 사실 근거가 아니다 — 환각한 답이 있어도 근거 블록은 코퍼스 조각뿐이다", () => {
  const history: ConversationTurn[] = [{ role: "user", content: "ARMI가 뭔데?" }, { role: "assistant", content: HALLUCINATED }];
  for (const q of ["팀원은 몇 명이었어?", "왜?", "그거 어떻게 운영했어?"]) {
    const r = ask({ q, history });
    assert.equal(r.contextProject, "armi");
    const evidence = evidenceOf(r);
    assert.ok(!/12명|Kubernetes|웨딩드레스 로봇/.test(evidence), `${q}: 어시스턴트 문장이 근거에 들어갔다`);
    for (const x of r.results) assert.ok(x.chunk.id.startsWith("project:") || x.chunk.id.startsWith("profile:") || x.chunk.id.startsWith("skill:") || x.chunk.id.startsWith("knowledge:"));
  }
  // "팀원은 몇 명" 은 근거에 없는 사실 — full 이 아니다
  assert.notEqual(ask({ q: "팀원은 몇 명이었어?", history }).support, "full");
});

/* ------------------------------------------------------------- Scenario B */

test("Scenario B: \"ARMI 설명해줘\" → \"행가래랑 뭐가 달라?\" — 두 프로젝트 근거가 함께 실린다", () => {
  const r = ask({ q: "행가래랑 뭐가 달라?", history: [{ role: "user", content: "ARMI 설명해줘" }, { role: "assistant", content: A1 }] });
  assert.deepEqual(r.explicitProjects, ["hangarae"]);
  assert.equal(r.contextProject, "armi");
  assert.equal(r.activeProject, "hangarae");
  const own = (id: string) => r.results.filter((x) => x.chunk.projectId === id).length;
  assert.ok(own("hangarae") >= 3, `hangarae ${own("hangarae")}`);
  assert.ok(own("armi") >= 1, `armi ${own("armi")}`);
  assert.deepEqual([...projects(r)].sort(), ["armi", "hangarae"]);
  const prompt = buildGroundedSystemPrompt(null, r);
  assert.match(prompt, /직전 대화에서 이야기하던 프로젝트: ARMI/);
});

/* ------------------------------------------------------------- Scenario C */

test("Scenario C: \"어떤 프로젝트를 만들었나요?\" → \"그중 AI 프로젝트만 알려줘\" — 문맥으로 포트폴리오 전체를 이어받는다", () => {
  const overview = "ARMI, 행가래, Wedding AI, Claw Dev, AI Docent 다섯 개를 만들었어요.";
  // 문맥 질의의 dense 상위가 포트폴리오 목록 조각이라고 가정한다(현재 질문만으로는 신호가 약하다).
  const dense = oracleQuery(
    ["project:docent:overview:detail"],
    ["profile:portfolio:projects", "project:armi:overview:recap", "project:hangarae:overview:recap"],
  );
  const r = ask({ q: "그중 AI 프로젝트만 알려줘", history: [{ role: "user", content: "어떤 프로젝트를 만들었나요?" }, { role: "assistant", content: overview }], dense });
  assert.equal(r.scope, "portfolio");
  assert.ok(projects(r).size >= 5);
  // 어떤 프로젝트가 "AI 프로젝트" 인지는 모델이 근거와 프로젝트 목록을 보고 고른다 — 목록이 프롬프트에 있다
  const prompt = buildGroundedSystemPrompt(null, r);
  for (const t of ["ARMI", "행가래", "Wedding AI", "Claw Dev", "AI Docent"]) assert.match(prompt, new RegExp(`- ${t}: `));
});

test("주제 전환: 현재 질문이 다른 프로젝트 특유의 말을 하면 넘어가고, 흔한 말이면 머문다", () => {
  const history: ConversationTurn[] = [{ role: "user", content: "ARMI가 뭔데?" }, { role: "assistant", content: A1 }];
  // "재활" 은 행가래 특유의 말이다
  const sw = ask({ q: "재활 게임은 어떻게 만들었어?", history });
  assert.equal(sw.activeProject, "hangarae");
  // "기술", "선택" 은 모든 프로젝트에 있다 — ARMI 에 머문다
  const stay = ask({ q: "왜 그 기술을 선택했어?", history });
  assert.equal(stay.activeProject, "armi");
});

/* ------------------------------------------------------------- 대화 상태: 주제 vs 비교 대상 */

const CMP = "행가래는 재활 동작을 인식하는 AIoT 시스템이고, ARMI는 병상 환자의 요청을 실행 경로로 잇는 로봇이라 목적이 달라요.";
const HG = "행가래는 재활 동작을 좌표와 관절 각도로 분석해 게임형 피드백을 주는 시스템이에요.";

test("대화 상태: 비교 대상이 새로 언급돼도 주제는 바뀌지 않는다 — 답이 둘을 함께 다뤘으면 비교", () => {
  const history: ConversationTurn[] = [
    { role: "user", content: "ARMI 설명해줘" }, { role: "assistant", content: A1 },
    { role: "user", content: "행가래랑 뭐가 달라?" }, { role: "assistant", content: CMP },
    { role: "user", content: "왜 그렇게 다른 거야?" }, { role: "assistant", content: CMP },
  ];
  assert.deepEqual(conversationStateOf(history), { primaryEntity: "armi", comparisonEntities: ["hangarae"], lastExplicitEntity: "hangarae" });
  // 지시어만 있는 후속 질문: 주제(ARMI) 근거가 주, 비교 대상 근거도 함께 실린다 — 한쪽만 보고 "기록 없음" 이라 하지 않게
  const r = ask({ q: "실제로 검증했어?", history });
  assert.equal(r.contextProject, "armi");
  assert.equal(r.activeProject, "armi");
  assert.deepEqual(r.conversation.comparisonEntities, ["hangarae"]);
  const own = (id: string) => r.results.filter((x) => x.chunk.projectId === id).length;
  assert.ok(own("armi") > own("hangarae") && own("hangarae") >= 1, `armi ${own("armi")} hangarae ${own("hangarae")}`);
  assert.match(buildGroundedSystemPrompt(null, r), /대화의 주제는 ARMI이고, 함께 비교·언급된 프로젝트: 행가래/);
});

test("대화 상태: 답이 새 엔티티만 다뤘으면 주제 전환 — 주제를 다시 말하면 비교 대상은 비워진다", () => {
  const switched: ConversationTurn[] = [
    { role: "user", content: "ARMI가 뭔데?" }, { role: "assistant", content: A1 },
    { role: "user", content: "행가래는?" }, { role: "assistant", content: HG },
  ];
  assert.deepEqual(conversationStateOf(switched), { primaryEntity: "hangarae", comparisonEntities: [], lastExplicitEntity: "hangarae" });
  assert.equal(ask({ q: "어떻게 동작해?", history: switched }).activeProject, "hangarae");
  const back: ConversationTurn[] = [
    { role: "user", content: "ARMI 설명해줘" }, { role: "assistant", content: A1 },
    { role: "user", content: "행가래랑 뭐가 달라?" }, { role: "assistant", content: CMP },
    { role: "user", content: "ARMI 음성 구조 더 알려줘" }, { role: "assistant", content: A2 },
  ];
  assert.deepEqual(conversationStateOf(back), { primaryEntity: "armi", comparisonEntities: [], lastExplicitEntity: "armi" });
});
