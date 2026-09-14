// RunPod 자격증명 로딩 경로 진단. 키 값·일부·해시는 어떤 경우에도 출력하지 않는다.
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const candidates = [
  process.env.RUNPOD_API_KEY ? "env:RUNPOD_API_KEY" : null,
  path.join(homedir(), ".runpod", "config.toml"),
  "C:\\Users\\kbs02\\.runpod\\config.toml",
  "/mnt/c/Users/kbs02/.runpod/config.toml",
].filter(Boolean);

console.log("platform      :", process.platform, "| homedir:", homedir());
for (const c of candidates) {
  if (c.startsWith("env:")) { console.log("candidate     :", c, "→ set"); continue; }
  console.log("candidate     :", c, "→", existsSync(c) ? "exists" : "missing");
}

const file = path.join(homedir(), ".runpod", "config.toml");
const raw = readFileSync(file, "utf8");
const lines = raw.split(/\r?\n/);
const keyLines = lines.filter((l) => /^\s*apikey\s*=/i.test(l));
console.log("file read     :", file);
console.log("bytes         :", Buffer.byteLength(raw), "| lines:", lines.length, "| CRLF:", raw.includes("\r\n"), "| BOM:", raw.charCodeAt(0) === 0xfeff);
console.log("sections      :", lines.filter((l) => /^\s*\[/.test(l)).map((l) => l.trim()).join(", ") || "(none)");
console.log("keys present  :", lines.filter((l) => /^\s*[A-Za-z_]+\s*=/.test(l)).map((l) => l.split("=")[0].trim()).join(", "));
console.log("apikey lines  :", keyLines.length, keyLines.length > 1 ? "  ← 두 줄 이상! 첫 줄이 옛 키일 수 있음" : "");

// TOML 은 작은따옴표 문자열도 허용한다. 큰따옴표만 벗기면 작은따옴표가 키의 일부로
// 헤더에 실려 나가고, 그 결과는 조용한 401 이다 — 실제로 그랬다.
const m = /^\s*apikey\s*=\s*(['"]?)(.+?)\1\s*$/im.exec(raw);
const key = m ? m[2].trim() : "";
console.log("key non-empty :", key.length > 0, "| length:", key.length,
  "| has whitespace inside:", /\s/.test(key), "| has quote chars:", /["']/.test(key));

async function probe(label, url, init) {
  try {
    const res = await fetch(url, init);
    const body = (await res.text()).slice(0, 160).replace(/\s+/g, " ");
    console.log(`${label.padEnd(34)} HTTP ${res.status}  ${body}`);
  } catch (e) { console.log(`${label.padEnd(34)} ERR ${e.message}`); }
}
const bearer = { Authorization: `Bearer ${key}` };
console.log("header format : Authorization: Bearer <key>  (RunPod REST/Serverless 규격)");
await probe("REST  GET /v1/endpoints (Bearer)", "https://rest.runpod.io/v1/endpoints", { headers: bearer });
await probe("REST  GET /v1/endpoints (no auth)", "https://rest.runpod.io/v1/endpoints", {});
await probe("GraphQL POST (Bearer)", "https://api.runpod.io/graphql", { method: "POST", headers: { ...bearer, "Content-Type": "application/json" }, body: '{"query":"{ myself { id } }"}' });
await probe("Jobs  GET /v2/xxxx/health (Bearer)", "https://api.runpod.ai/v2/nonexistent-endpoint/health", { headers: bearer });
await probe("Jobs  GET /v2/xxxx/health (no auth)", "https://api.runpod.ai/v2/nonexistent-endpoint/health", {});
