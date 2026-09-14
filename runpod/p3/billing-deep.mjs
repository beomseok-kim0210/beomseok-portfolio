import { readFileSync, writeFileSync } from "node:fs"; import path from "node:path"; import { homedir } from "node:os";
const m = /^\s*apikey\s*=\s*(['"]?)(.+?)\1\s*$/im.exec(readFileSync(path.join(homedir(), ".runpod", "config.toml"), "utf8")); const key = m[2].trim();
const H = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
const st = JSON.parse(readFileSync((process.env.P3_EVIDENCE_DIR ?? "D:/dd-runpod-evidence/2026-09-11-p3-runpod-paid") + "/p3-state.json", "utf8"));
const out = { at: new Date().toISOString() };
const g = await (await fetch("https://api.runpod.io/graphql", { method: "POST", headers: H, body: JSON.stringify({ query: "{ myself { clientBalance spendLimit currentSpendPerHr } }" }) })).json();
out.account = g.data?.myself ?? g.errors;
for (const [label, q] of [["hour-by-endpoint", { bucketSize: "hour", grouping: "endpointId" }], ["hour-by-gpu", { bucketSize: "hour", grouping: "gpuTypeId" }], ["day-all", { bucketSize: "day" }]]) {
  const p = new URLSearchParams({ ...q, startTime: new Date(Date.now() - 2 * 86400e3).toISOString() });
  const r = await fetch(`https://rest.runpod.io/v1/billing/endpoints?${p}`, { headers: H });
  out[label] = { status: r.status, rows: await r.json() };
}
writeFileSync(`D:/dd-runpod-evidence/2026-09-11-p3-runpod-paid/billing-deep-${Date.now()}.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 1).replace(new RegExp(st.endpointId, "g"), "<endpointId>"));
