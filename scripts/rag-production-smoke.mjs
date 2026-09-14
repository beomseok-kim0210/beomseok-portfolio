// 공개 프로덕션 스모크 — /api/docent/chat 을 실제 페이지 문맥으로 친다. GPU 는 건드리지 않는다.
//
//   node scripts/rag-production-smoke.mjs [--base https://beomseok-portfolio.vercel.app] [--out <dir>]
//
// 시나리오 1–6 (게이트 §23). 7(음성 ON)은 브라우저에서 따로 한다.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const BASE = arg("--base", "https://beomseok-portfolio.vercel.app");
const OUT = arg("--out", "D:/dd-runpod-evidence/2026-09-14-rag/production");
mkdirSync(OUT, { recursive: true });

const page = (slug) => (slug ? { pathname: `/projects/${slug}`, pageType: "project", projectSlug: slug } : { pathname: "/", pageType: "home" });

const SCENARIOS = [
  { id: "1-project-direct", page: page("armi"), messages: [{ role: "user", content: "이 프로젝트에서 본인이 한 역할이 뭐예요?" }], expectProject: "armi", expectGrounded: true },
  { id: "2-tech-decision", page: page("hangarae"), messages: [{ role: "user", content: "왜 YOLOv11-M을 재학습했어요?" }], expectProject: "hangarae", expectGrounded: true },
  { id: "3-metric", page: page("hangarae"), messages: [{ role: "user", content: "성과 수치의 근거가 뭐예요?" }], expectProject: "hangarae", expectGrounded: true },
  { id: "4-vague-followup", page: page("wedding"), messages: [{ role: "user", content: "이 프로젝트에서 어떤 역할을 했어?" }, { role: "assistant", content: "(이전 답변)" }, { role: "user", content: "그중 가장 어려웠던 건?" }], expectProject: "wedding", expectGrounded: true },
  { id: "5-other-project-override", page: page("armi"), messages: [{ role: "user", content: "행가래 프로젝트에서 정확도를 어떻게 높였어?" }], expectProject: "hangarae", expectGrounded: true },
  { id: "6-unsupported", page: page("armi"), messages: [{ role: "user", content: "ARMI 팀원은 몇 명이었어요?" }], expectProject: "armi", expectGrounded: false },
];

const LEAK = /src\/data|knowledge\/[a-z0-9-]+\.md|C:\\|\/Users\/|API_KEY|process\.env|RUNPOD_|rpa_|Bearer/;

async function run(s) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/docent/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: s.messages, pageContext: s.page }) });
  const raw = await res.text();
  const clientMs = Date.now() - t0;
  const events = raw.split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const meta = events.find((e) => e.type === "meta");
  const sources = events.find((e) => e.type === "sources");
  const done = events.find((e) => e.type === "done");
  const answer = events.filter((e) => e.type === "delta").map((e) => e.text).join("");
  const topProject = sources?.sources?.[0]?.entityId ?? null;
  const rec = {
    id: s.id, at: new Date(t0).toISOString(), status: res.status, clientMs, vercelId: res.headers.get("x-vercel-id"),
    mode: meta?.mode, provider: meta?.provider, emotion: meta?.emotion,
    grounded: sources?.grounded, activeProject: sources?.activeProject, topProject,
    sourceIds: (sources?.sources ?? []).slice(0, 3).map((x) => x.chunkId),
    timings: done?.timings ?? null,
    answerPreview: answer.slice(0, 160), answerLength: answer.length,
    checks: {
      status200: res.status === 200,
      projectOk: s.expectGrounded ? (sources?.activeProject === s.expectProject && topProject === s.expectProject) : sources?.activeProject === s.expectProject,
      groundedOk: Boolean(sources?.grounded) === s.expectGrounded,
      noLeak: !LEAK.test(raw),
      noRawSourcePath: !events.some((e) => e.type === "sources" && JSON.stringify(e).includes("sourcePath")),
      protocolOk: Boolean(meta && sources && done),
    },
  };
  rec.pass = Object.values(rec.checks).every(Boolean);
  writeFileSync(path.join(OUT, `${s.id}.json`), JSON.stringify({ ...rec, answer, events: events.filter((e) => e.type !== "delta") }, null, 1));
  console.log(JSON.stringify(rec));
  return rec;
}

const results = [];
for (const s of SCENARIOS) results.push(await run(s));
const summary = { base: BASE, at: new Date().toISOString(), pass: results.filter((r) => r.pass).length, total: results.length, results: results.map((r) => ({ id: r.id, pass: r.pass, checks: r.checks })) };
writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(summary, null, 1));
console.log(`\n${summary.pass}/${summary.total} passed`);
