/**
 * 큐레이션 코퍼스 패키지 → 검증된 런타임 스냅샷.
 *
 *   npm run docent:corpus                              docs/rag/curated-corpus/ → src/generated/docent-corpus.json
 *   npm run docent:corpus -- --input <dir|file.json>   다른 입력
 *   npm run docent:corpus -- --check                   검증만(스냅샷을 쓰지 않음)
 *
 * 입력(디렉터리): manifest.json { schemaVersion, packageId, generatedBy, generatedAt, entities[], secretAllowlist? }
 *                + chunks/*.json (각 파일 = 조각 배열 또는 { chunks: [...] }). 형식: docs/rag/CURATED_CORPUS_HANDOFF.md
 * 입력(파일): 패키지 하나 { schemaVersion, entities, chunks, ... }. v4 큐레이션 형식(corpusVersion)은 src/lib/docent/corpus/v4.ts 로 변환.
 * 디렉터리에 manifest.json 이 없으면 그 안의 패키지 JSON 하나(가장 최근)를 쓴다.
 *
 * 오류가 하나라도 있으면 스냅샷을 쓰지 않고 exit 1. 스냅샷을 쓰면 코퍼스가 바뀐 것이므로 임베딩 아티팩트가 stale 이
 * 된다 — 이어서 `npm run docent:embed` → `npm run docent:eval`. 되돌리기: 스냅샷 파일을 지우거나 DOCENT_CORPUS=legacy.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import { SNAPSHOT_SOURCE_PATH, buildSnapshot } from "@/lib/docent/corpus/build";
import type { CuratedCorpusPackage } from "@/lib/docent/corpus/schema";
import { fromV4, isV4Package } from "@/lib/docent/corpus/v4";

const root = path.resolve(import.meta.dirname, "..", "..");
const arg = (name: string) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; };
const input = path.resolve(root, arg("--input") ?? path.join("docs", "rag", "curated-corpus"));
const checkOnly = process.argv.includes("--check");

export function loadPackage(target: string): unknown {
  if (statSync(target).isFile()) return JSON.parse(readFileSync(target, "utf8"));
  // manifest.json 이 없으면 디렉터리 안의 패키지 파일 하나(entities + chunks 를 가진 *.json, 가장 최근 것)를 쓴다.
  if (!existsSync(path.join(target, "manifest.json"))) {
    const files = readdirSync(target).filter((f) => f.endsWith(".json")).map((f) => path.join(target, f))
      .filter((f) => { try { const d = JSON.parse(readFileSync(f, "utf8")); return Array.isArray(d?.entities) && Array.isArray(d?.chunks); } catch { return false; } })
      .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
    if (files.length === 0) throw new Error("manifest.json 도, entities·chunks 를 가진 패키지 JSON 도 없다");
    console.log(`[docent:corpus] 입력 파일: ${path.relative(root, files[0])}`);
    return JSON.parse(readFileSync(files[0], "utf8"));
  }
  const manifest = JSON.parse(readFileSync(path.join(target, "manifest.json"), "utf8")) as Partial<CuratedCorpusPackage>;
  const dir = path.join(target, "chunks");
  const chunks: unknown[] = [...(Array.isArray(manifest.chunks) ? manifest.chunks : [])];
  if (existsSync(dir)) {
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
      const data = JSON.parse(readFileSync(path.join(dir, f), "utf8")) as unknown;
      const list = Array.isArray(data) ? data : (data as { chunks?: unknown[] })?.chunks;
      if (!Array.isArray(list)) throw new Error(`${f}: 조각 배열 또는 { chunks: [...] } 이어야 한다`);
      chunks.push(...list);
    }
  }
  return { ...manifest, chunks };
}

if (!existsSync(input)) {
  console.error(`[docent:corpus] 입력이 없다: ${path.relative(root, input)} — 큐레이션 패키지를 받은 뒤 실행한다. 런타임은 레거시 코퍼스를 그대로 쓴다.`);
  process.exit(2);
}

let pkg: unknown;
try {
  pkg = loadPackage(input);
} catch (err) {
  console.error(`[docent:corpus] 입력을 읽지 못했다: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}

// v4 큐레이션 형식(schemaVersion 1.3, corpusVersion)은 명시적 변환 계층을 거친다 — 내용은 바꾸지 않는다.
if (isV4Package(pkg)) {
  console.log(`[docent:corpus] v4 패키지 ${pkg.corpusVersion} (schemaVersion ${pkg.schemaVersion}) → 내부 형식으로 변환`);
  pkg = fromV4(pkg);
}
const { report, snapshot, privateStats } = buildSnapshot(pkg);
const group = (xs: typeof report.errors) => Object.entries(xs.reduce<Record<string, number>>((a, x) => ({ ...a, [x.code]: (a[x.code] ?? 0) + 1 }), {}));
console.log(`[docent:corpus] errors ${report.errors.length} · warnings ${report.warnings.length}`);
for (const [code, n] of group(report.errors)) console.log(`  ERROR ${code} ×${n}`);
for (const [code, n] of group(report.warnings)) console.log(`  warn  ${code} ×${n}`);
for (const e of report.errors.slice(0, 40)) console.log(`   - ${e.at}: ${e.message}`);
if (!snapshot) process.exit(1);

// 비공개 집계는 콘솔에만(공개 스냅샷에는 싣지 않는다).
console.log(`[docent:corpus] 스냅샷: 엔티티 ${snapshot.entities.length} · 조각 ${snapshot.chunks.length} (제외: 비공개 ${privateStats?.notPublic ?? 0}, deprecated ${snapshot.excluded.deprecated}, 중복 ${snapshot.excluded.duplicateContent}, 비공개 이름 언급 보류 ${privateStats?.withheld.length ?? 0}: ${(privateStats?.withheld ?? []).map((w) => w.id).join(", ") || "-"}) · sourceHash ${snapshot.sourceHash.slice(0, 12)}`);
if (checkOnly) process.exit(0);

const out = path.join(root, SNAPSHOT_SOURCE_PATH);
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(snapshot, null, 1)}\n`);
console.log(`[docent:corpus] 썼다 → ${SNAPSHOT_SOURCE_PATH}. 다음: npm run docent:embed → npm run docent:eval`);
