// 워커 상태만 본다. env 는 RunPod 이 주입한 시크릿을 담고 있으므로 절대 출력하지 않는다.
import { readFileSync } from "node:fs"; import path from "node:path"; import { homedir } from "node:os";
const m = /^\s*apikey\s*=\s*(['"]?)(.+?)\1\s*$/im.exec(readFileSync(path.join(homedir(), ".runpod", "config.toml"), "utf8")); const key = m[2].trim();
const st = JSON.parse(readFileSync((process.env.P3_EVIDENCE_DIR ?? "D:/dd-runpod-evidence/2026-09-11-p3-runpod-paid") + "/p3-state.json", "utf8"));
const r = await fetch(`https://rest.runpod.io/v1/endpoints/${st.endpointId}?includeWorkers=true`, { headers: { Authorization: `Bearer ${key}` } });
const j = await r.json();
console.log(JSON.stringify({ at: new Date().toISOString(), version: j.version,
  workers: (j.workers || []).map((w) => ({ desiredStatus: w.desiredStatus, gpuSize: w.env?.RUNPOD_GPU_SIZE, costPerHr: w.costPerHr, lastStatusChange: w.lastStatusChange, lastStartedAt: w.lastStartedAt, image: w.imageName })) }, null, 1));
