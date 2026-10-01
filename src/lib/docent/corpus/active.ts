/**
 * 런타임이 쓰는 코퍼스 출처를 고른다.
 *
 *   src/generated/docent-corpus.json 이 있고 검증을 통과하면 → 큐레이션 스냅샷(엔티티 등록부도 스냅샷의 것)
 *   없거나 깨졌으면                                         → 레거시 빌더(src/data, knowledge) — 지금의 동작
 *
 * DOCENT_CORPUS=legacy 로 스냅샷이 있어도 레거시를 강제할 수 있다(되돌리기). 테스트는 DOCENT_CORPUS_SNAPSHOT 으로
 * 다른 스냅샷 파일을 가리킬 수 있다. 서버 전용(fs). 결과는 인스턴스 메모리에 한 번 캐시한다.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { SNAPSHOT_SOURCE_PATH } from "./build";
import { CORPUS_SCHEMA_VERSION, type CorpusSnapshot } from "./schema";
import { validatePackage } from "./validate";

export type CorpusSource =
  | { kind: "snapshot"; snapshot: CorpusSnapshot; path: string }
  | { kind: "legacy"; reason: "forced" | "no_snapshot" | "invalid_snapshot"; errors?: string[] };

let cached: CorpusSource | null = null;

export function activeCorpusSource(env: Record<string, string | undefined> = process.env): CorpusSource {
  if (cached) return cached;
  cached = resolve(env);
  if (cached.kind === "snapshot") {
    console.info("[docent-corpus]", JSON.stringify({ source: "snapshot", packageId: cached.snapshot.packageId, chunks: cached.snapshot.chunks.length, sourceHash: cached.snapshot.sourceHash.slice(0, 12) }));
  } else if (cached.reason === "invalid_snapshot") {
    console.warn("[docent-corpus]", JSON.stringify({ source: "legacy", reason: cached.reason, errors: cached.errors }));
  }
  return cached;
}

function resolve(env: Record<string, string | undefined>): CorpusSource {
  if (env.DOCENT_CORPUS === "legacy") return { kind: "legacy", reason: "forced" };
  const file = env.DOCENT_CORPUS_SNAPSHOT || path.join(process.cwd(), SNAPSHOT_SOURCE_PATH);
  if (!existsSync(file)) return { kind: "legacy", reason: "no_snapshot" };
  try {
    const snap = JSON.parse(readFileSync(file, "utf8")) as CorpusSnapshot;
    if (snap?.kind !== "docent-corpus-snapshot" || snap.schemaVersion !== CORPUS_SCHEMA_VERSION) return { kind: "legacy", reason: "invalid_snapshot" };
    // 빌드 뒤 손으로 고친 스냅샷도 같은 규칙으로 다시 검사한다(공개 출처 형식·원 출처 위치 없음·비밀값·엔티티).
    const report = validatePackage({ schemaVersion: snap.schemaVersion, entities: snap.entities, chunks: snap.chunks }, { publicSnapshot: true });
    if (!report.ok) return { kind: "legacy", reason: "invalid_snapshot", errors: [...new Set(report.errors.map((e) => e.code))].slice(0, 8) };
    return { kind: "snapshot", snapshot: snap, path: file };
  } catch {
    return { kind: "legacy", reason: "invalid_snapshot" };
  }
}

/** 테스트용. */
export function resetActiveCorpusForTest(): void {
  cached = null;
}
