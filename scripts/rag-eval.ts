/**
 * 검색 평가 — BM25 only / Dense only / Hybrid 를 같은 질문으로 비교한다.
 *
 *   npm run docent:eval                       BM25 + (키·아티팩트가 있으면) 실제 dense/hybrid
 *   npm run docent:eval -- --mock             dense 자리에 가짜 임베딩(구조 확인용, 품질 지표 아님)
 *   npm run docent:eval -- --out <dir>        결과 JSON 위치(기본 docs/rag)
 *   npm run docent:eval -- --label <name>     결과에 기준선 이름을 남긴다(예: pre-corpus-rebuild) — Before/After 를 섞지 않는다
 *
 * 평가 셋 두 개:
 *  - tests/fixtures/rag-eval.json        기존 64문항(A–K, 정답 = 조각 ID 패턴)
 *  - tests/fixtures/rag-eval-hybrid.json 하이브리드용(EXACT / SEMANTIC / UNSUPPORTED / CONVO, 정답 = 규칙)
 *
 * 지표: Hit@1/3/5, MRR, wrong-project(1위 조각이 다른 프로젝트), unsupported false positive(코퍼스에
 * 없는 사실 질문인데 근거 판정 full), answerable false negative(답할 수 있는 질문인데 근거 판정 none).
 *
 * 실제 dense 지표는 OPENAI_API_KEY 와 유효한 src/generated/docent-embeddings.json 이 있을 때만 낸다.
 * 질문 임베딩은 .cache/docent-eval/ 에 캐시해 같은 평가를 다시 돌릴 때 API 를 부르지 않는다.
 * 키가 없으면 dense·hybrid 는 BLOCKED_BY_KEY 로 적는다 — 가짜 임베딩 수치를 dense 품질로 보고하지 않는다.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { activeCorpusSource } from "@/lib/docent/corpus/active";
import { getCorpus } from "@/lib/docent/rag/corpus";
import {
  createOpenAIEmbedder,
  decodeVector,
  denseIndexFromArtifact,
  encodeVector,
  readEmbeddingArtifact,
  type DenseIndex,
  type Embedder,
} from "@/lib/docent/rag/embeddings";
import { createHashingEmbedder, mockDenseIndex } from "@/lib/docent/rag/mockEmbedder";
import { contextualQueryText, retrieve, type ConversationTurn, type RetrievalResult } from "@/lib/docent/rag/retrieval";
import type { PageContext, RagChunk } from "@/lib/docent/rag/types";

interface Accept { project?: string; sections?: string[]; contains?: string[] }
interface EvalQuery {
  id: string;
  group: string;
  query: string;
  page: string;
  project: string | null;
  acceptable?: string[];
  accept?: Accept;
  unsupported?: boolean;
  history?: ConversationTurn[] | string[];
  portfolio?: boolean;
  alsoProject?: string;
  /** 공개 범위 밖 정보 노출 검사용 질문(정답 없음). */
  leak?: boolean;
  /** 거짓 전제 질문 — 검색은 정답 조각을, 답변은 전제 교정을 본다. */
  premise?: boolean;
  /** 이 질문의 근거에 와야 하는 비현재 상태(planned/experimental). */
  statusTarget?: string;
}
interface Fixture { version: number; pages: Record<string, PageContext>; queries: Array<EvalQuery & { category?: string }> }

const root = path.resolve(import.meta.dirname, "..");
const load = (f: string) => JSON.parse(readFileSync(path.join(root, "tests", "fixtures", f), "utf8")) as Fixture;
const corpus = getCorpus();
const source = activeCorpusSource();

// 평가 셋은 활성 코퍼스에 맞춘다: 큐레이션 스냅샷이면 v4 셋, 레거시 코퍼스면 기존 두 셋(정답이 레거시 조각 ID 라서).
// 공개 범위 밖 정보를 직접 찌르는 노출 검사 질문은 공개 저장소에 두지 않는다 — gitignore 된 큐레이션 디렉터리의
// rag-eval-local-probes.json({ queries: [...] }, 형식은 v4 셋과 같음)이 있으면 v4 셋에 더한다.
const localProbes = (() => {
  const f = path.join(root, "docs", "rag", "curated-corpus", "rag-eval-local-probes.json");
  if (!existsSync(f)) return [];
  return (JSON.parse(readFileSync(f, "utf8")) as { queries: Fixture["queries"] }).queries;
})();
const SETS: Array<{ name: string; fixture: Fixture }> = source.kind === "snapshot"
  ? [{ name: "v4", fixture: (() => { const v = load("rag-eval-v4.json"); return { ...v, queries: [...v.queries, ...localProbes] }; })() }]
  : [
    { name: "legacy", fixture: (() => { const l = load("rag-eval.json"); return { ...l, queries: l.queries.map((q) => ({ ...q, group: q.category ?? "?" })) }; })() },
    { name: "hybrid", fixture: load("rag-eval-hybrid.json") },
  ];

// 비공개 엔티티 이름 — gitignore 된 큐레이션 원본에서 읽는다(런타임 스냅샷에는 없다). 누출 지표에만 쓴다.
const privateNames: string[] = (() => {
  const dir = path.join(root, "docs", "rag", "curated-corpus");
  if (!existsSync(dir)) return [];
  const names: string[] = [];
  for (const file of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    try {
      const d = JSON.parse(readFileSync(path.join(dir, file), "utf8")) as { entities?: Array<{ id: string; canonicalName: string; aliases?: string[]; public: boolean }> };
      for (const e of d.entities ?? []) if (e.public === false) names.push(e.id, e.canonicalName, ...(e.aliases ?? []));
    } catch { /* 패키지가 아닌 파일 */ }
  }
  return [...new Set(names.map((n) => n.toLowerCase()).filter((n) => n.length >= 3))];
})();
const leaks = (c: RagChunk) => privateNames.some((n) => `${c.entityId} ${c.title} ${c.text}`.toLowerCase().includes(n));
const rrfKArg = process.argv.indexOf("--rrf-k");
const rrfK = rrfKArg >= 0 ? Number(process.argv[rrfKArg + 1]) : undefined;

function toHistory(h: EvalQuery["history"]): ConversationTurn[] {
  if (!h) return [];
  return h.map((x) => (typeof x === "string" ? { role: "user" as const, content: x } : x));
}

const matchesPattern = (id: string, pattern: string) => (pattern.endsWith("*") ? id.startsWith(pattern.slice(0, -1)) : id === pattern);
function isCorrect(q: EvalQuery, c: RagChunk): boolean {
  if (q.acceptable) return q.acceptable.some((p) => matchesPattern(c.id, p));
  const a = q.accept;
  if (!a) return false;
  if (a.project && c.projectId !== a.project) return false;
  if (a.sections && !a.sections.includes(c.section)) return false;
  if (a.contains) {
    const hay = `${c.title} ${c.text} ${c.tags.join(" ")}`.toLowerCase();
    if (!a.contains.some((w) => hay.includes(w.toLowerCase()))) return false;
  }
  return true;
}

/* ------------------------------------------------------------- dense 준비 */

const useMock = process.argv.includes("--mock");
let denseIndex: DenseIndex | null = null;
let embedder: Embedder | null = null;
let denseSource: "real" | "mock" | "BLOCKED_BY_KEY" = "BLOCKED_BY_KEY";
let denseBlockedReason: string | null = null;

if (useMock) {
  denseIndex = mockDenseIndex(corpus);
  embedder = createHashingEmbedder();
  denseSource = "mock";
} else {
  const artifact = readEmbeddingArtifact(root);
  const status = artifact === null ? { ok: false as const, reason: "missing_artifact" } : denseIndexFromArtifact(artifact, corpus);
  if (!process.env.OPENAI_API_KEY) denseBlockedReason = "no OPENAI_API_KEY";
  else if (!status.ok) denseBlockedReason = `artifact: ${status.reason}`;
  else {
    denseIndex = status.index;
    embedder = createOpenAIEmbedder({ ...process.env, DOCENT_EMBEDDING_TIMEOUT_MS: "20000" });
    denseSource = "real";
  }
}

// 질문 임베딩 캐시(실제 API 일 때만 파일에 남긴다)
const cacheFile = path.join(root, ".cache", "docent-eval", "query-embeddings.json");
const diskCache: Record<string, string> = denseSource === "real" && existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, "utf8")) : {};
let apiCalls = 0;
async function embedAll(texts: string[]): Promise<Map<string, Float32Array>> {
  const out = new Map<string, Float32Array>();
  if (!embedder) return out;
  const key = (t: string) => `${embedder!.model}\u0000${t}`;
  const missing = [...new Set(texts)].filter((t) => !(key(t) in diskCache) || denseSource !== "real");
  for (let i = 0; i < missing.length; i += 64) {
    const batch = missing.slice(i, i + 64);
    const vs = await embedder.embed(batch);
    apiCalls += 1;
    batch.forEach((t, j) => { diskCache[key(t)] = encodeVector(vs[j]); });
  }
  for (const t of texts) out.set(t, decodeVector(diskCache[key(t)]));
  if (denseSource === "real") {
    mkdirSync(path.dirname(cacheFile), { recursive: true });
    writeFileSync(cacheFile, JSON.stringify(diskCache));
  }
  return out;
}

/* ------------------------------------------------------------------- 실행 */

type ConfigName = "bm25" | "dense" | "hybrid";
interface PerQuery {
  id: string; group: string; rank: number | null; top1: string | null; top1Project: string | null;
  expectedProject: string | null; wrongProject: boolean; support: string; scope: string; activeProject: string | null;
  unsupported: boolean; top5: string[]; timings: RetrievalResult["timings"];
  leakQuery: boolean; leaked: string[]; statusTarget: string | null; statusRank: number | null; top1Status: string;
}

async function evaluate(config: ConfigName, fixture: Fixture, vectors: Map<string, Float32Array>): Promise<PerQuery[]> {
  const per: PerQuery[] = [];
  for (const q of fixture.queries) {
    const page = fixture.pages[q.page] ?? null;
    const history = toHistory(q.history);
    const ctx = contextualQueryText(history, q.query);
    const dense = config === "bm25" || !denseIndex ? null : {
      index: denseIndex,
      current: vectors.get(q.query.trim())!,
      contextual: ctx ? vectors.get(ctx)! : null,
    };
    const r = retrieve(q.query, page, { history, topK: 10, dense, denseOnly: config === "dense", rrfK });
    let rank: number | null = null;
    for (let i = 0; i < r.results.length && rank === null; i++) if (isCorrect(q, r.results[i].chunk)) rank = i + 1;
    const top1 = r.results[0]?.chunk ?? null;
    per.push({
      id: q.id, group: q.group, rank, top1: top1?.id ?? null, top1Project: top1?.projectId ?? null,
      expectedProject: q.project, wrongProject: Boolean(q.project && top1?.projectId && top1.projectId !== q.project && !q.unsupported),
      support: r.support, scope: r.scope, activeProject: r.activeProject, unsupported: Boolean(q.unsupported),
      top5: r.results.slice(0, 5).map((x) => x.chunk.id), timings: r.timings,
      leakQuery: Boolean(q.leak), leaked: r.results.filter((x) => leaks(x.chunk)).map((x) => x.chunk.id),
      statusTarget: q.statusTarget ?? null,
      statusRank: q.statusTarget ? (() => { const i = r.results.findIndex((x) => (x.chunk.status ?? "current") === q.statusTarget); return i < 0 ? null : i + 1; })() : null,
      top1Status: top1?.status ?? "current",
    });
  }
  return per;
}

function summarize(per: PerQuery[]) {
  const answerable = per.filter((p) => !p.unsupported && !p.leakQuery);
  const unsup = per.filter((p) => p.unsupported);
  const statusQs = per.filter((p) => p.statusTarget);
  const hit = (k: number) => answerable.length ? answerable.filter((p) => p.rank !== null && p.rank <= k).length / answerable.length : null;
  const mrr = answerable.length ? answerable.reduce((a, p) => a + (p.rank ? 1 / p.rank : 0), 0) / answerable.length : null;
  const projectQs = answerable.filter((p) => p.expectedProject);
  return {
    n: per.length, answerable: answerable.length,
    hit1: hit(1), hit3: hit(3), hit5: hit(5), mrr,
    wrongProject: projectQs.filter((p) => p.wrongProject).length,
    unsupportedFalsePositive: unsup.filter((p) => p.support === "full").map((p) => p.id),
    unsupportedFalseNegative: answerable.filter((p) => p.support === "none").map((p) => p.id),
    partialAnswerable: answerable.filter((p) => p.support === "partial").length,
    /** 결과(상위 10)에 비공개 엔티티 조각·이름이 있는 질문 수 — 목표 0. */
    publicLeakage: per.filter((p) => p.leaked.length > 0).map((p) => p.id),
    /** 계획·실험 질문인데 그 상태의 조각이 상위 5 안에 없다 — 모델이 "계획" 이라는 근거를 못 본다. */
    statusEvidenceMissing: statusQs.filter((p) => p.statusRank === null || p.statusRank > 5).map((p) => p.id),
  };
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null;
};

const labelArg = process.argv.indexOf("--label");
const report: Record<string, unknown> = {
  label: labelArg >= 0 ? process.argv[labelArg + 1] : null,
  generatedAt: new Date().toISOString(),
  corpus: { chunks: corpus.length },
  dense: { source: denseSource, blockedReason: denseBlockedReason, model: denseIndex?.model ?? null },
  sets: {} as Record<string, unknown>,
};

const f = (x: number | null) => (x === null ? "  n/a" : x.toFixed(3));
console.log(`${report.label ? `[${report.label}] ` : ""}corpus ${corpus.length} chunks · dense: ${denseSource}${denseBlockedReason ? ` (${denseBlockedReason})` : ""}`);
for (const { name, fixture } of SETS) {
  const texts: string[] = [];
  for (const q of fixture.queries) {
    texts.push(q.query.trim());
    const ctx = contextualQueryText(toHistory(q.history), q.query);
    if (ctx) texts.push(ctx);
  }
  const vectors = denseIndex ? await embedAll(texts) : new Map<string, Float32Array>();
  const configs: ConfigName[] = denseIndex ? ["bm25", "dense", "hybrid"] : ["bm25"];
  const results: Record<string, unknown> = {};
  console.log(`\n[${name}] ${fixture.queries.length} queries`);
  console.log("config   Hit@1  Hit@3  Hit@5  MRR    wrongProj  unsupFP  answerableNone  partial  med bm25/dense/fusion ms");
  for (const config of configs) {
    const per = await evaluate(config, fixture, vectors);
    const s = summarize(per);
    const groups = Object.fromEntries([...new Set(per.map((p) => p.group))].map((g) => [g, summarize(per.filter((p) => p.group === g))]));
    const t = {
      bm25Ms: median(per.map((p) => p.timings.bm25Ms)),
      denseSearchMs: median(per.map((p) => p.timings.denseSearchMs)),
      fusionMs: median(per.map((p) => p.timings.fusionMs)),
    };
    results[config] = { summary: s, groups, timings: t, misses: per.filter((p) => !p.unsupported && p.rank !== 1).map((p) => ({ id: p.id, rank: p.rank, top1: p.top1, scope: p.scope })), per };
    console.log(`${config.padEnd(8)} ${f(s.hit1)}  ${f(s.hit3)}  ${f(s.hit5)}  ${f(s.mrr)}  ${String(s.wrongProject).padStart(9)}  ${String(s.unsupportedFalsePositive.length).padStart(7)}  ${String(s.unsupportedFalseNegative.length).padStart(14)}  ${String(s.partialAnswerable).padStart(7)}  leak ${s.publicLeakage.length} statusMissing ${s.statusEvidenceMissing.length}  ${t.bm25Ms}/${t.denseSearchMs}/${t.fusionMs}`);
    for (const [g, gs] of Object.entries(groups)) {
      console.log(`   ${g.padEnd(12)} n=${String(gs.n).padStart(2)} H@1 ${f(gs.hit1)} H@3 ${f(gs.hit3)} MRR ${f(gs.mrr)} unsupFP ${gs.unsupportedFalsePositive.length} none ${gs.unsupportedFalseNegative.length}`);
    }
  }
  if (!denseIndex) {
    results.dense = "BLOCKED_BY_KEY";
    results.hybrid = "BLOCKED_BY_KEY";
  }
  (report.sets as Record<string, unknown>)[name] = results;
}
if (denseSource === "real") console.log(`\nembedding API calls this run: ${apiCalls} (cache ${cacheFile})`);
if (denseSource === "mock") console.log("\n※ mock: 글자 n-gram 해시 벡터다. dense/hybrid 수치는 파이프라인 확인용이지 의미 검색 품질이 아니다.");

const outArg = process.argv.indexOf("--out");
const outDir = outArg >= 0 ? process.argv[outArg + 1] : path.join(root, "docs", "rag");
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "eval-results.json"), JSON.stringify(report, null, 1));
console.log(`\nwritten ${path.join(outDir, "eval-results.json")}`);
