/**
 * 검색 평가 — 결정론적, 재현 가능.
 *
 *   node --import ./tests/alias-hook.mjs scripts/rag-eval.ts [--out <dir>]
 *
 * 설정별 Hit@1/3/5, MRR, wrong-project rate, unsupported 처리, 페이지 문맥 부분집합을
 * 낸다. 설정:
 *   naive     — 공백 토큰 BM25, prior 없음 (한국어 처리 없는 기준선)
 *   lexical   — 한국어 토크나이저 BM25, prior 없음
 *   +entity   — + 엔티티 prior
 *   +page     — + 페이지 prior
 *   final     — + 섹션 prior + 출처 priority (프로덕션 설정)
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { getCorpus } from "@/lib/docent/rag/corpus";
import { retrieve, type RetrievalOptions } from "@/lib/docent/rag/retrieval";
import type { PageContext, RagChunk } from "@/lib/docent/rag/types";

interface EvalQuery {
  id: string;
  category: string;
  query: string;
  page: string;
  project: string | null;
  acceptable: string[];
  unsupported?: boolean;
  history?: string[];
}

interface Fixture {
  version: number;
  pages: Record<string, PageContext>;
  queries: EvalQuery[];
}

const root = path.resolve(import.meta.dirname, "..");
const fixture = JSON.parse(readFileSync(path.join(root, "tests", "fixtures", "rag-eval.json"), "utf8")) as Fixture;

function matches(id: string, pattern: string): boolean {
  return pattern.endsWith("*") ? id.startsWith(pattern.slice(0, -1)) : id === pattern;
}

/* ------------------------------------------------------- naive BM25 (기준선) */

function naiveTokens(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9가-힣\s]/g, " ").split(/\s+/).filter((t) => t.length >= 2);
}

function naiveRank(query: string, corpus: RagChunk[]): { chunk: RagChunk; score: number }[] {
  const docs = corpus.map((chunk) => {
    const tf = new Map<string, number>();
    for (const t of naiveTokens(`${chunk.title} ${chunk.text} ${chunk.tags.join(" ")}`)) tf.set(t, (tf.get(t) ?? 0) + 1);
    let len = 0; for (const v of tf.values()) len += v;
    return { chunk, tf, len };
  });
  const df = new Map<string, number>();
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const avg = docs.reduce((a, d) => a + d.len, 0) / docs.length;
  const q = naiveTokens(query);
  return docs.map((d) => {
    let s = 0;
    for (const t of q) {
      const f = d.tf.get(t); if (!f) continue;
      const n = docs.length, dfi = df.get(t) ?? 0;
      s += Math.log(1 + (n - dfi + 0.5) / (dfi + 0.5)) * ((f * 2.2) / (f + 1.2 * (0.25 + (0.75 * d.len) / avg)));
    }
    return { chunk: d.chunk, score: s };
  }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id));
}

/* ------------------------------------------------------------------- 실행 */

type Config = { name: string; opts: RetrievalOptions | "naive" };
const CONFIGS: Config[] = [
  { name: "naive", opts: "naive" },
  { name: "lexical", opts: { usePagePrior: false, useEntityPrior: false, useSectionPrior: false, useSourcePriority: false } },
  { name: "+entity", opts: { usePagePrior: false, useEntityPrior: true, useSectionPrior: false, useSourcePriority: false } },
  { name: "+page", opts: { usePagePrior: true, useEntityPrior: true, useSectionPrior: false, useSourcePriority: false } },
  { name: "final", opts: {} },
];

interface PerQuery {
  id: string; category: string; rank: number | null; top1: string | null; top1Project: string | null;
  expectedProject: string | null; wrongProject: boolean; supported: boolean; lexicalTop: number; top5: string[];
}

function evaluate(config: Config) {
  const corpus = getCorpus();
  const per: PerQuery[] = [];
  for (const q of fixture.queries) {
    const page = fixture.pages[q.page];
    let ranked: { id: string; projectId?: string; lexical: number }[];
    let supported: boolean;
    if (config.opts === "naive") {
      const r = naiveRank(q.query, corpus);
      ranked = r.map((x) => ({ id: x.chunk.id, projectId: x.chunk.projectId, lexical: x.score }));
      supported = ranked.length > 0 && ranked[0].lexical >= 4.0;
    } else {
      const r = retrieve(q.query, page, { ...config.opts, topK: 10, recentUserQueries: q.history });
      ranked = r.results.map((x) => ({ id: x.chunk.id, projectId: x.chunk.projectId, lexical: x.lexical }));
      supported = r.supported;
    }
    let rank: number | null = null;
    for (let i = 0; i < ranked.length && rank === null; i++) {
      if (q.acceptable.some((p) => matches(ranked[i].id, p))) rank = i + 1;
    }
    const top1 = ranked[0] ?? null;
    per.push({
      id: q.id, category: q.category, rank, top1: top1?.id ?? null, top1Project: top1?.projectId ?? null,
      expectedProject: q.project, wrongProject: Boolean(q.project && top1?.projectId && top1.projectId !== q.project),
      supported, lexicalTop: top1 ? Math.round(top1.lexical * 100) / 100 : 0, top5: ranked.slice(0, 5).map((r) => r.id),
    });
  }
  const answerable = per.filter((p) => !fixture.queries.find((q) => q.id === p.id)?.unsupported);
  const unsupportedQs = per.filter((p) => fixture.queries.find((q) => q.id === p.id)?.unsupported);
  const hit = (k: number, set: PerQuery[]) => set.length ? set.filter((p) => p.rank !== null && p.rank <= k).length / set.length : null;
  const mrr = (set: PerQuery[]) => set.length ? set.reduce((a, p) => a + (p.rank ? 1 / p.rank : 0), 0) / set.length : null;
  const projectQs = answerable.filter((p) => p.expectedProject);
  const subset = (cat: string) => answerable.filter((p) => p.category === cat);
  const summarize = (set: PerQuery[]) => ({ n: set.length, hit1: hit(1, set), hit3: hit(3, set), hit5: hit(5, set), mrr: mrr(set) });
  return {
    config: config.name,
    overall: summarize(answerable),
    wrongProjectRate: projectQs.length ? projectQs.filter((p) => p.wrongProject).length / projectQs.length : null,
    wrongProjectCount: projectQs.filter((p) => p.wrongProject).length,
    unsupported: { n: unsupportedQs.length, correctlyUnsupported: unsupportedQs.filter((p) => !p.supported).length, falselySupported: unsupportedQs.filter((p) => p.supported).map((p) => ({ id: p.id, top1: p.top1, lexicalTop: p.lexicalTop })) },
    answerableFalselyUnsupported: answerable.filter((p) => !p.supported).map((p) => ({ id: p.id, lexicalTop: p.lexicalTop })),
    byCategory: Object.fromEntries(["A", "B", "C", "D", "E", "F", "G", "H", "J", "K"].map((c) => [c, summarize(subset(c))])),
    pageContext: { currentPage: summarize(subset("G")), crossProjectOverride: summarize(subset("H")), followUp: summarize(subset("K")) },
    misses: answerable.filter((p) => p.rank === null || p.rank > 1).map((p) => ({ id: p.id, rank: p.rank, top1: p.top1, top5: p.top5 })),
    per,
  };
}

const results = CONFIGS.map(evaluate);
const corpus = getCorpus();
const report = {
  generatedAt: new Date().toISOString(),
  fixtureVersion: fixture.version,
  queryCount: fixture.queries.length,
  answerableCount: fixture.queries.filter((q) => !q.unsupported).length,
  unsupportedCount: fixture.queries.filter((q) => q.unsupported).length,
  corpus: { chunks: corpus.length, chars: corpus.reduce((a, c) => a + c.text.length, 0) },
  results,
};

const outArg = process.argv.indexOf("--out");
const outDir = outArg >= 0 ? process.argv[outArg + 1] : path.join(root, "docs", "rag");
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "eval-results.json"), JSON.stringify(report, null, 1));

const f = (x: number | null) => (x === null ? "  n/a" : x.toFixed(3));
console.log(`corpus ${corpus.length} chunks · ${report.queryCount} queries (${report.answerableCount} answerable / ${report.unsupportedCount} unsupported)`);
console.log("config     Hit@1  Hit@3  Hit@5  MRR    wrongProj  unsupOK   G:H@1  H:H@1  K:H@1");
for (const r of results) {
  console.log(`${r.config.padEnd(10)} ${f(r.overall.hit1)}  ${f(r.overall.hit3)}  ${f(r.overall.hit5)}  ${f(r.overall.mrr)}  ${String(r.wrongProjectCount).padStart(2)}/${r.wrongProjectRate === null ? "-" : (r.wrongProjectRate * 100).toFixed(0) + "%"}      ${r.unsupported.correctlyUnsupported}/${r.unsupported.n}       ${f(r.pageContext.currentPage.hit1)}  ${f(r.pageContext.crossProjectOverride.hit1)}  ${f(r.pageContext.followUp.hit1)}`);
}
const final = results[results.length - 1];
console.log("\nfinal misses (rank≠1):");
for (const m of final.misses) console.log(` ${m.id} rank=${m.rank} top1=${m.top1}`);
console.log("final falsely supported:", JSON.stringify(final.unsupported.falselySupported));
console.log("final answerable but unsupported:", JSON.stringify(final.answerableFalselyUnsupported));
console.log(`\nwritten ${path.join(outDir, "eval-results.json")}`);
