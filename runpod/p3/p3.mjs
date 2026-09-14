#!/usr/bin/env node
// P3 — RunPod Serverless 유료 검증 드라이버.
//
// 하는 일: 템플릿/엔드포인트 생성, 콜드·웜 요청 실행과 측정, 과금 조회,
// scale-to-zero 관측, 정리. 모든 증거는 EVIDENCE_DIR 에 JSON 으로 남긴다.
//
// 하지 않는 일: API 키를 출력·로그·파일에 남기는 것. 키는 환경변수
// RUNPOD_API_KEY 또는 ~/.runpod/config.toml 에서 읽어 Authorization 헤더로만 쓴다.
//
// 예산: 누적 과금이 SPEND_STOP_USD 를 넘을 것 같으면 어떤 잡도 보내지 않는다.
//
//   node runpod/p3/p3.mjs auth
//   node runpod/p3/p3.mjs create   --image ghcr.io/<user>/dd-voice:p3 --auth digital-docent-ghcr
//   node runpod/p3/p3.mjs health
//   node runpod/p3/p3.mjs run --label cold-1 [--text "..."]
//   node runpod/p3/p3.mjs watch-zero
//   node runpod/p3/p3.mjs billing
//   node runpod/p3/p3.mjs delete
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const REST = "https://rest.runpod.io/v1";
const JOBS = "https://api.runpod.ai/v2";
const EVIDENCE_DIR = process.env.P3_EVIDENCE_DIR ?? "D:/dd-runpod-evidence/2026-09-11-p3-runpod-paid";
const STATE_FILE = path.join(EVIDENCE_DIR, "p3-state.json");
const BUDGET_USD = Number(process.env.P3_BUDGET_USD ?? 1.0);
/** 이 값을 넘길 것 같으면 잡을 보내지 않는다. 상한 1.00 에 여유를 둔다. */
const SPEND_STOP_USD = Number(process.env.P3_SPEND_STOP_USD ?? 0.8);
const DEFAULT_TEXT = "안녕하세요, 디지털 도슨트입니다.";

mkdirSync(EVIDENCE_DIR, { recursive: true });

/* ------------------------------------------------------------------ auth */

function apiKey() {
  if (process.env.RUNPOD_API_KEY) return process.env.RUNPOD_API_KEY.trim();
  const toml = path.join(homedir(), ".runpod", "config.toml");
  if (existsSync(toml)) {
    // TOML 은 작은따옴표 문자열도 허용한다. 따옴표 종류를 가리지 않고 벗긴다 —
    // 큰따옴표만 벗기면 작은따옴표가 키의 일부로 나가 조용한 401 이 된다.
    const m = /^\s*apikey\s*=\s*(['"]?)(.+?)\1\s*$/im.exec(readFileSync(toml, "utf8"));
    if (m) return m[2].trim();
  }
  throw new Error("no RunPod API key: set RUNPOD_API_KEY or ~/.runpod/config.toml");
}
const KEY = apiKey();
const H = { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function rest(method, p, body) {
  const res = await fetch(REST + p, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 500) }; }
  if (!res.ok) throw new Error(`${method} ${p} -> HTTP ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  return json;
}
async function jobs(method, p, body) {
  const res = await fetch(JOBS + p, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 500) }; }
  return { status: res.status, json };
}

/* ----------------------------------------------------------------- state */

function loadState() { return existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, "utf8")) : {}; }
function saveState(s) { writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); }
function save(name, obj) {
  const f = path.join(EVIDENCE_DIR, name);
  writeFileSync(f, typeof obj === "string" ? obj : JSON.stringify(obj, null, 2));
  return f;
}
const now = () => new Date().toISOString();
const args = process.argv.slice(2);
const cmd = args[0];
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };

/* --------------------------------------------------------------- billing */

async function billingNow(endpointId) {
  // 과금 조회. 엔드포인트별 timeBilledMs 와 amount(USD).
  const start = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const q = new URLSearchParams({ bucketSize: "hour", grouping: "endpointId", startTime: start });
  const rows = await rest("GET", `/billing/endpoints?${q}`);
  const mine = (Array.isArray(rows) ? rows : []).filter((r) => !endpointId || r.endpointId === endpointId);
  const usd = mine.reduce((a, r) => a + (r.amount || 0), 0);
  const ms = mine.reduce((a, r) => a + (r.timeBilledMs || 0), 0);
  return { rows: mine, totalUsd: +usd.toFixed(6), totalBilledMs: ms, at: now() };
}

async function guardSpend(endpointId) {
  const b = await billingNow(endpointId);
  console.log(`spend so far: USD ${b.totalUsd} (${b.totalBilledMs} ms billed)`);
  if (b.totalUsd >= SPEND_STOP_USD) {
    throw new Error(`STOP: cumulative spend USD ${b.totalUsd} >= ${SPEND_STOP_USD} (hard limit ${BUDGET_USD})`);
  }
  return b;
}

/* ---------------------------------------------------------------- commands */

async function cmdAuth() {
  const eps = await rest("GET", "/endpoints");
  const cra = await rest("GET", "/containerregistryauth");
  console.log(`auth OK · endpoints=${eps.length} · registryAuths=${cra.map((c) => c.name).join(", ") || "(none)"}`);
}

async function cmdCreate() {
  const image = opt("image");
  const authName = opt("auth", "digital-docent-ghcr");
  const name = opt("name", "dd-voice-p3");
  if (!image) throw new Error("--image required");
  const cfg = JSON.parse(readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..", "endpoint-config.json"), "utf8"));
  const env = Object.fromEntries(Object.entries(cfg.env).filter(([k]) => !k.startsWith("_")));

  const cras = await rest("GET", "/containerregistryauth");
  const cra = cras.find((c) => c.name === authName);
  if (!cra) throw new Error(`container registry auth '${authName}' not found; have: ${cras.map((c) => c.name).join(", ")}`);

  const state = loadState();
  if (!state.templateId) {
    const tpl = await rest("POST", "/templates", {
      name,
      imageName: image,
      containerRegistryAuthId: cra.id,
      isServerless: true,
      category: "NVIDIA",
      containerDiskInGb: cfg.containerDiskGb,
      env,
      ports: [],
    });
    state.templateId = tpl.id;
    state.templateCreatedAt = now();
    saveState(state);
    save("01-template.json", { ...tpl, env: "<see endpoint-config.json>" });
    console.log(`template created: ${tpl.id}`);
  }
  if (!state.endpointId) {
    const body = {
      name,
      templateId: state.templateId,
      computeType: "GPU",
      gpuTypeIds: ["NVIDIA RTX A4000", "NVIDIA RTX 2000 Ada Generation",
                   "NVIDIA RTX 4000 Ada Generation", "NVIDIA RTX A4500"],
      gpuCount: 1,
      workersMin: cfg.minWorkers,
      workersMax: cfg.maxWorkers,
      idleTimeout: cfg.idleTimeoutSeconds,
      executionTimeoutMs: cfg.executionTimeoutSeconds * 1000,
      flashboot: cfg.flashBoot,
      scalerType: cfg.scalerType,
      scalerValue: cfg.scalerValue,
      allowedCudaVersions: ["12.1", "12.2", "12.3", "12.4", "12.5", "12.6", "12.7", "12.8", "12.9", "13.0"],
    };
    const ep = await rest("POST", "/endpoints", body);
    state.endpointId = ep.id;
    state.endpointCreatedAt = now();
    saveState(state);
    save("02-endpoint.json", { request: body, response: ep });
    console.log(`endpoint created: ${ep.id}  workersMin=${ep.workersMin} workersMax=${ep.workersMax} idle=${ep.idleTimeout}`);
  }
  console.log(JSON.stringify({ templateId: state.templateId, endpointId: state.endpointId }));
}

async function cmdHealth() {
  const { endpointId } = loadState();
  const h = await jobs("GET", `/${endpointId}/health`);
  const ep = await rest("GET", `/endpoints/${endpointId}`);
  const out = { at: now(), health: h.json, workers: ep.workers ?? null };
  console.log(JSON.stringify(out));
  return out;
}

async function cmdRun() {
  const { endpointId } = loadState();
  if (!endpointId) throw new Error("no endpoint in state");
  const label = opt("label", `run-${Date.now()}`);
  const text = opt("text", DEFAULT_TEXT);
  // --then-warm N : 첫 잡이 COMPLETED 되는 즉시 N 개의 웜 잡을 연달아 보낸다.
  // idle timeout 이 5 s 라 후처리(해시·저장·과금 조회)를 하고 나면 워커가 이미
  // 없다. 그래서 제출을 먼저 하고 후처리는 뒤로 미룬다.
  const thenWarm = Number(opt("then-warm", "0")) || 0;
  const before = await guardSpend(endpointId);
  const healthBefore = await cmdHealth();
  const first = await runOne({ endpointId, label, text, before, healthBefore, deferPost: thenWarm > 0 });
  const chain = [first];
  for (let i = 1; i <= thenWarm; i += 1) {
    chain.push(await runOne({ endpointId, label: `${label.replace(/cold/, "warm")}-${i}`, text,
                              before: chain.at(-1).after, healthBefore: null, deferPost: i < thenWarm }));
  }
  for (const c of chain) await c.finish();
}

async function runOne({ endpointId, label, text, before, healthBefore, deferPost }) {

  const timeline = [];
  const mark = (ev, extra = {}) => { const e = { t: Date.now(), at: now(), ev, ...extra }; timeline.push(e); console.log(`  ${e.at} ${ev} ${JSON.stringify(extra)}`); };

  mark("submit");
  const sub = await jobs("POST", `/${endpointId}/run`, { input: { text, utteranceId: `p3-${label}` } });
  mark("submitted", { status: sub.status, id: sub.json.id, jobStatus: sub.json.status });
  if (sub.status !== 200 || !sub.json.id) throw new Error(`submit failed: ${JSON.stringify(sub.json)}`);
  const jobId = sub.json.id;

  let last = null; let final = null;
  const deadline = Date.now() + 300_000;
  while (Date.now() < deadline) {
    const st = await jobs("GET", `/${endpointId}/status/${jobId}`);
    const s = st.json.status;
    if (s !== last) { mark("status", { jobStatus: s }); last = s; }
    if (["COMPLETED", "FAILED", "CANCELLED", "TIMED_OUT"].includes(s)) { final = st.json; break; }
    await new Promise((r) => setTimeout(r, 1000));
  }
  mark("final", { jobStatus: final?.status, delayTime: final?.delayTime, executionTime: final?.executionTime });
  if (!final) throw new Error("job did not finish within 300 s");

  // 후처리는 지연 가능. 다음 웜 잡을 먼저 보내야 하기 때문이다.
  const after = deferPost ? null : await billingNow(endpointId);
  return {
    after,
    finish: async () => finishOne({ endpointId, label, text, jobId, final, timeline, before, after, healthBefore }),
  };
}

async function finishOne({ endpointId, label, text, jobId, final, timeline, before, after, healthBefore }) {
  const out = final.output || {};
  let verify = null;
  if (out.audio && out.identity) {
    const audio = Buffer.from(out.audio.base64, "base64");
    const sha = createHash("sha256").update(audio).digest("hex");
    verify = {
      responseSha256_clientRecomputed: sha,
      canonicalSha256: out.identity.canonicalSha256,
      lamSourceSha256: out.identity.lamSourceSha256,
      threeWayEqual: sha === out.identity.canonicalSha256 && sha === out.identity.lamSourceSha256,
      synthesisCount: out.identity.synthesisCount,
      audioBytes: audio.length, durationSeconds: out.audio.durationSeconds,
      frames: out.timeline?.frameCount, fps: out.timeline?.fps,
    };
    writeFileSync(path.join(EVIDENCE_DIR, `${label}.wav`), audio);
  }
  if (!after) after = await billingNow(endpointId);
  const record = {
    label, text, jobId, endpointId,
    clientMs: { submitToFinal: timeline.at(-1).t - timeline[0].t,
                submitToInProgress: (timeline.find((e) => e.jobStatus === "IN_PROGRESS")?.t ?? NaN) - timeline[0].t },
    runpod: { status: final.status, delayTime: final.delayTime, executionTime: final.executionTime },
    handler: out.diagnostics ?? null, error: out.error ? { code: out.error, stage: out.stage } : null,
    verify, healthBefore, timeline,
    billing: { before, after,
               deltaUsd: before && after ? +(after.totalUsd - before.totalUsd).toFixed(6) : null,
               deltaMs: before && after ? after.totalBilledMs - before.totalBilledMs : null },
  };
  save(`${label}-raw-status.json`, { ...final, output: final.output ? { ...final.output, audio: final.output.audio ? { ...final.output.audio, base64: "<omitted>" } : undefined } : undefined });
  const f = save(`${label}.json`, { ...record, outputSansAudio: { ...out, audio: out.audio ? { ...out.audio, base64: `<${out.audio.bytes} bytes, saved as ${label}.wav>` } : null, timeline: out.timeline ? { ...out.timeline, frames: `<${out.timeline.frameCount} frames>` } : null } });
  console.log(JSON.stringify({ label, status: final.status, delayTime: final.delayTime, executionTime: final.executionTime,
    coldStart: out.diagnostics?.coldStart, workerInitMs: out.diagnostics?.workerInitMs, gpu: out.diagnostics?.gpu,
    synthesisMs: out.diagnostics?.synthesisMs, inferenceMs: out.diagnostics?.inferenceMs, verify, error: record.error }, null, 2));
  console.log(`saved ${f}`);
}

async function cmdWatchZero() {
  const { endpointId } = loadState();
  const t0 = Date.now(); const samples = [];
  for (let i = 0; i < 90; i += 1) {
    const h = await jobs("GET", `/${endpointId}/health`);
    const w = h.json.workers || {};
    const running = (w.running || 0) + (w.idle || 0) + (w.initializing || 0) + (w.ready || 0);
    samples.push({ t: +((Date.now() - t0) / 1000).toFixed(1), at: now(), workers: w });
    console.log(`  +${samples.at(-1).t}s workers=${JSON.stringify(w)}`);
    if (running === 0 && i > 0) break;
    await new Promise((r) => setTimeout(r, 2000));
  }
  save(`watch-zero-${Date.now()}.json`, samples);
  console.log(JSON.stringify({ reachedZero: samples.at(-1).workers, seconds: samples.at(-1).t }));
}

async function cmdBilling() {
  const { endpointId } = loadState();
  const b = await billingNow(endpointId);
  save(`billing-${Date.now()}.json`, b);
  console.log(JSON.stringify(b, null, 2));
}

async function cmdDelete() {
  const state = loadState();
  if (state.endpointId) { await rest("DELETE", `/endpoints/${state.endpointId}`); console.log("endpoint deleted"); state.endpointDeletedAt = now(); }
  if (state.templateId && opt("template") === "yes") { await rest("DELETE", `/templates/${state.templateId}`); console.log("template deleted"); state.templateDeletedAt = now(); }
  saveState(state);
}

const table = { auth: cmdAuth, create: cmdCreate, health: cmdHealth, run: cmdRun, "watch-zero": cmdWatchZero, billing: cmdBilling, delete: cmdDelete };
if (!table[cmd]) { console.error(`usage: p3.mjs <${Object.keys(table).join("|")}>`); process.exit(2); }
table[cmd]().catch((e) => { console.error("ERROR:", String(e.message).replace(KEY, "<redacted>")); process.exit(1); });
