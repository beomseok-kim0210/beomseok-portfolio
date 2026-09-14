// 로컬 백엔드 end-to-end: 실제 라우트 → voiceWorkers (실제 Supertonic + LAM 워커, 워밍업 포함).
//
// dev 서버를 띄우지 않고 라우트를 직접 부른다. 워커는 이 프로세스가 새로 띄우므로
// 첫 요청이 곧 "콜드 워커의 첫 요청" 이다 — LAM 워밍업이 요청 밖으로 나갔는지 여기서
// 드러난다. 무료, 로컬 GPU.
//
//   node --import ./tests/alias-hook.mjs runpod/p3/local-path.mjs
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const EVIDENCE_DIR = "D:/dd-runpod-evidence/2026-09-11-p3-runpod-paid";
// .env.local 의 DD_* 만 읽는다 (값은 경로들뿐이다). RunPod 키는 이 시험과 무관하다.
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = /^(DD_[A-Z_]+)=(.*)$/.exec(line);
  if (m) process.env[m[1]] = m[2].trim();
}
process.env.DOCENT_VOICE_BACKEND = "local";
delete process.env.RUNPOD_API_KEY;

const { POST } = await import("../../src/app/api/docent/voice/route.ts");
const { GET: HEALTH } = await import("../../src/app/api/docent/voice/health/route.ts");
const { voiceBackendHealth } = await import("../../src/lib/docent/voiceWorkers.ts");

const req = (ip) => new Request("http://localhost/api/docent/voice", {
  method: "POST", headers: { "Content-Type": "application/json", "x-vercel-forwarded-for": ip },
  body: JSON.stringify({ text: "안녕하세요, 디지털 도슨트입니다." }) });

async function one(label, ip) {
  const t0 = Date.now();
  const res = await POST(req(ip));
  const ms = Date.now() - t0;
  const body = await res.json();
  let verify = null;
  if (body.audio?.base64) {
    const audio = Buffer.from(body.audio.base64, "base64");
    const sha = createHash("sha256").update(audio).digest("hex");
    verify = { threeWayEqual: sha === body.identity.canonicalSha256 && sha === body.identity.lamSourceSha256 && sha === body.identity.responseSha256,
               synthesisCount: body.identity.synthesisCount, audioBytes: audio.length, frames: body.timeline.frameCount, sha8: sha.slice(0, 8) };
  }
  return { label, httpStatus: res.status, endToEndMs: ms, provider: body.provider, error: body.error, stage: body.stage,
           synthesisMs: body.diagnostics?.synthesisMs, inferenceMs: body.diagnostics?.inferenceMs, totalPrepMs: body.diagnostics?.totalPrepMs, verify };
}

const first = await one("first-request-on-fresh-workers", "203.0.113.31");
const second = await one("second-request", "203.0.113.32");
const third = await one("third-request", "203.0.113.33");
const h = voiceBackendHealth();
const health = { supertonic: { state: h.supertonic.state, modelLoadMs: h.supertonic.modelLoadMs, warmupMs: h.supertonic.warmupMs, restarts: h.supertonic.restarts },
                 lam: { state: h.lam.state, modelLoadMs: h.lam.modelLoadMs, warmupMs: h.lam.warmupMs, restarts: h.lam.restarts } };
const healthHttp = await (await HEALTH()).json();
const out = { at: new Date().toISOString(), first, second, third, health, healthRoute: { status: healthHttp.status, lamWarmupMs: healthHttp.lam?.warmupMs } };
writeFileSync(path.join(EVIDENCE_DIR, "local-path-warmup.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
process.exit(0);
