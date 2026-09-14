// P3 과금 재조회 — 창을 P3 실행일(2026-09-11) 포함으로 넓히고, 그룹/버킷/필터 조합을 전부 시도.
// 읽기 전용. 워커를 깨우지 않는다. 키는 헤더로만.
import { readFileSync, writeFileSync } from "node:fs"; import path from "node:path"; import { homedir } from "node:os";
const m = /^\s*apikey\s*=\s*(['"]?)(.+?)\1\s*$/im.exec(readFileSync(path.join(homedir(), ".runpod", "config.toml"), "utf8")); const key = m[2].trim();
const H = { Authorization: `Bearer ${key}` };
const st = JSON.parse(readFileSync("D:/dd-runpod-evidence/2026-09-11-p3-runpod-paid/p3-state.json", "utf8"));
const out = { at: new Date().toISOString(), queries: [] };
const start = "2026-09-10T00:00:00Z", end = new Date().toISOString();
const combos = [];
for (const bucketSize of ["hour", "day", "week", "month"]) {
  for (const grouping of [undefined, "endpointId", "gpuTypeId", "podId"]) {
    for (const withEp of [false, true]) combos.push({ bucketSize, grouping, withEp });
  }
}
for (const c of combos) {
  const p = new URLSearchParams({ bucketSize: c.bucketSize, startTime: start, endTime: end });
  if (c.grouping) p.set("grouping", c.grouping);
  if (c.withEp) p.set("endpointId", st.endpointId);
  const r = await fetch(`https://rest.runpod.io/v1/billing/endpoints?${p}`, { headers: H });
  const body = await r.text(); let j; try { j = JSON.parse(body); } catch { j = body.slice(0, 200); }
  out.queries.push({ ...c, status: r.status, rows: Array.isArray(j) ? j.length : j, sample: Array.isArray(j) ? j.slice(0, 3) : undefined });
}
// 다른 청구 리소스도 본다 — 컨테이너 디스크가 pods/networkvolumes 쪽으로 잡힐 수 있다
for (const res of ["pods", "networkvolumes"]) {
  const p = new URLSearchParams({ bucketSize: "day", startTime: start, endTime: end });
  const r = await fetch(`https://rest.runpod.io/v1/billing/${res}?${p}`, { headers: H });
  const body = await r.text(); let j; try { j = JSON.parse(body); } catch { j = body.slice(0, 200); }
  out.queries.push({ resource: res, status: r.status, rows: Array.isArray(j) ? j.length : j, sample: Array.isArray(j) ? j.slice(0, 3) : undefined });
}
writeFileSync(`D:/dd-runpod-evidence/2026-09-11-p3-runpod-paid/billing-wide-${Date.now()}.json`, JSON.stringify(out, null, 2));
const hits = out.queries.filter((q) => typeof q.rows === "number" && q.rows > 0);
console.log(`queries: ${out.queries.length}, non-empty: ${hits.length}`);
for (const q of out.queries) console.log(`  ${String(q.status).padEnd(4)} ${(q.resource ?? q.bucketSize).padEnd(14)} ${String(q.grouping ?? "-").padEnd(11)} ep=${q.withEp ?? "-"} rows=${JSON.stringify(q.rows)}`);
for (const h of hits) console.log(JSON.stringify(h, null, 1).replace(new RegExp(st.endpointId, "g"), "<endpointId>"));
