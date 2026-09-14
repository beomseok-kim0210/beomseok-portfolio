// Vercel 라우트 → RunPodVoiceProvider → 실제 RunPod 엔드포인트.
//
// 실제 서버 코드(src/app/api/docent/voice/route.ts)를 그대로 import 해서 부른다.
// dev 서버를 띄우지 않는 이유: 키를 .env.local 에 쓰지 않기 위해서다 — 키는 이
// 프로세스의 환경에만 있고, 파일에도 응답에도 남지 않는다.
//
//   node --import ./tests/alias-hook.mjs runpod/p3/vercel-path.mjs
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const EVIDENCE_DIR = "D:/dd-runpod-evidence/2026-09-11-p3-runpod-paid";
const st = JSON.parse(readFileSync(path.join(EVIDENCE_DIR, "p3-state.json"), "utf8"));
const m = /^\s*apikey\s*=\s*(['"]?)(.+?)\1\s*$/im.exec(readFileSync(path.join(homedir(), ".runpod", "config.toml"), "utf8"));
const KEY = m[2].trim();

process.env.DOCENT_VOICE_BACKEND = "runpod";
process.env.RUNPOD_ENDPOINT_ID = st.endpointId;
process.env.RUNPOD_API_KEY = KEY;
process.env.RUNPOD_TIMEOUT_MS = "240000";
// 로컬 워커 설정이 있어도 무시되어야 한다 — 선택은 DOCENT_VOICE_BACKEND 가 한다.

const { POST } = await import("../../src/app/api/docent/voice/route.ts");

const t0 = Date.now();
const res = await POST(new Request("http://localhost/api/docent/voice", {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-vercel-forwarded-for": "203.0.113.77" },
  body: JSON.stringify({ text: "안녕하세요, 디지털 도슨트입니다." }),
}));
const ms = Date.now() - t0;
const text = await res.text();
const headers = Object.fromEntries(res.headers.entries());

// 비밀 경계: 응답 본문·헤더 어디에도 키가 없어야 한다.
const leaks = { bodyHasKey: text.includes(KEY), headersHaveKey: JSON.stringify(headers).includes(KEY) };

let body; try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 300) }; }
let verify = null;
if (body.audio?.base64) {
  const audio = Buffer.from(body.audio.base64, "base64");
  const sha = createHash("sha256").update(audio).digest("hex");
  verify = { threeWayEqual: sha === body.identity.canonicalSha256 && sha === body.identity.lamSourceSha256 && sha === body.identity.responseSha256,
             synthesisCount: body.identity.synthesisCount, audioBytes: audio.length, frames: body.timeline.frameCount };
}
const out = { at: new Date().toISOString(), httpStatus: res.status, endToEndMs: ms, leaks,
  provider: body.provider, engine: body.engine, error: body.error, stage: body.stage, fallback: body.fallback,
  diagnostics: body.diagnostics ? { coldStart: body.diagnostics.coldStart, runpodJobId: body.diagnostics.runpodJobId ? "<id>" : null,
    serverlessExecutionMs: body.diagnostics.serverlessExecutionMs, serverlessQueueMs: body.diagnostics.serverlessQueueMs,
    synthesisMs: body.diagnostics.synthesisMs, inferenceMs: body.diagnostics.inferenceMs, totalPrepMs: body.diagnostics.totalPrepMs,
    gpu: body.diagnostics.gpu ?? null } : null,
  verify };
writeFileSync(path.join(EVIDENCE_DIR, "vercel-path.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
