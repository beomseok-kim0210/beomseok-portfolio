import {
  BoxGeometry, BufferGeometry, CanvasTexture, Color, CylinderGeometry, DoubleSide, Group, LatheGeometry, Mesh, MeshBasicMaterial,
  MeshPhysicalMaterial, MeshStandardMaterial, PlaneGeometry, RepeatWrapping, SRGBColorSpace, TorusGeometry, Vector2, type Material,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/*
 * 04 Personal Gallery — builders for the room's materials and the three works.
 * Everything here is procedural (no new assets): the only mesh loaded is the docent head, reused as marble.
 */
export const G = {
  wall: "#f3f2ef", ceiling: "#f6f5f2", plinth: "#f7f6f3", floor: "#e4e1db", ink: "#17181b", paper: "#fbfaf7",
  steel: "#1c1d20", oak: "#a98763", brass: "#b8913c", felt: "#2a2b2f", kraft: "#c6a56f",
};
export const FONT = `Pretendard, "Pretendard Variable", system-ui, -apple-system, "Segoe UI", sans-serif`;
export const MONO = `ui-monospace, "JetBrains Mono", "SFMono-Regular", Menlo, monospace`;

/* ── Canvas helpers ─────────────────────────────────────────────────────── */
function canvas(w: number, h: number) { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")!] as const; }
/** A canvas texture that redraws once web fonts are ready (prints use the site's Pretendard). */
function drawn(w: number, h: number, draw: (x: CanvasRenderingContext2D, w: number, h: number) => void, srgb = true) {
  const [c, x] = canvas(w, h); draw(x, w, h);
  const t = new CanvasTexture(c); if (srgb) t.colorSpace = SRGBColorSpace; t.anisotropy = 8;
  document.fonts?.ready.then(() => { x.clearRect(0, 0, w, h); draw(x, w, h); t.needsUpdate = true; });
  return t;
}
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

/** Polished concrete: soft blotches + fine aggregate; also used as the roughness map. */
export function concreteTexture() {
  seed = 7;
  const [c, x] = canvas(1024, 1024);
  x.fillStyle = "#d2cfc9"; x.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 260; i++) {
    const r = 30 + rnd() * 160, px = rnd() * 1024, py = rnd() * 1024, l = 160 + rnd() * 70;
    const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, `rgba(${l},${l - 2},${l - 6},.10)`); g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2);
  }
  for (let i = 0; i < 26000; i++) { const l = 120 + rnd() * 120; x.fillStyle = `rgba(${l},${l},${l - 4},${.08 + rnd() * .12})`; x.fillRect(rnd() * 1024, rnd() * 1024, 1 + rnd() * 1.6, 1 + rnd() * 1.6); }
  // Saw-cut joints every ~2.4 m (texture repeats 4 × per 10 m).
  x.strokeStyle = "rgba(90,88,84,.35)"; x.lineWidth = 2; x.beginPath(); x.moveTo(0, 1); x.lineTo(1024, 1); x.moveTo(1, 0); x.lineTo(1, 1024); x.stroke();
  const t = new CanvasTexture(c); t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(16, 10); t.anisotropy = 8; t.colorSpace = SRGBColorSpace;
  return t;
}

/* ── Marble (DD bust) ───────────────────────────────────────────────────── */
/** Carrara marble: object-space turbulence veins over a warm white, slight polish. */
export function marbleMaterial(freq: number) {
  const m = new MeshPhysicalMaterial({ color: "#e4dfd7", roughness: .3, metalness: 0, clearcoat: .5, clearcoatRoughness: .25, sheen: .35, sheenColor: new Color("#fff6ea"), sheenRoughness: .7, envMapIntensity: .45 });
  m.onBeforeCompile = shader => {
    shader.uniforms.uFreq = { value: freq };
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vMarble;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvMarble = position;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vMarble; uniform float uFreq;
float mh(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float mn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(mix(mh(i), mh(i + vec3(1,0,0)), f.x), mix(mh(i + vec3(0,1,0)), mh(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(mh(i + vec3(0,0,1)), mh(i + vec3(1,0,1)), f.x), mix(mh(i + vec3(0,1,1)), mh(i + vec3(1,1,1)), f.x), f.y), f.z); }
float mf(vec3 p){ float a = .5, s = 0.; for (int k = 0; k < 5; k++) { s += a * mn(p); p *= 2.03; a *= .5; } return s; }`)
      .replace("#include <color_fragment>", `#include <color_fragment>
{ vec3 p = vMarble * uFreq; float t = mf(p * 1.7);
  float v = abs(sin((p.x * .8 + p.y * 1.3 + p.z * .4) * 1.6 + t * 6.));
  float vein = pow(1. - v, 6.) * .42 + pow(1. - v, 26.) * .32;
  float cloud = mf(p * .6) * .07;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.5, .51, .54), vein) - cloud * vec3(.5, .48, .45); }`);
  };
  m.customProgramCacheKey = () => `marble-${freq}`;
  return m;
}
/** Turned socle under the head: a short neck, a collar, a square-ish base turned round. */
export function socleGeometry(neckR: number, h: number) {
  const pts = [[0, 0], [neckR * 2.3, 0], [neckR * 2.3, .035], [neckR * 2.05, .05], [neckR * 1.55, .085], [neckR * 1.25, .12], [neckR * 1.18, .15], [neckR * 1.34, .165], [neckR * 1.34, .18], [neckR * 1.05, .2], [neckR, h * .8], [neckR * .98, h], [0, h]]
    .map(([r, y]) => new Vector2(r, y));
  return new LatheGeometry(pts, 96);
}

/* ── Prints (framed wall works) ─────────────────────────────────────────── */
type Ink = { paper: string; ink: string; muted: string; accent: string };
const INK: Ink = { paper: "#fbfaf6", ink: "#17181b", muted: "#6b6a66", accent: "#3f6f9e" };
function title(x: CanvasRenderingContext2D, no: string, name: string, sub: string, ink: Ink) {
  x.fillStyle = ink.accent; x.font = `600 22px ${MONO}`; x.fillText(no, 90, 112);
  x.fillStyle = ink.ink; x.font = `700 54px ${FONT}`; x.fillText(name, 90, 178);
  x.fillStyle = ink.muted; x.font = `500 26px ${FONT}`; x.fillText(sub, 90, 222);
  x.fillStyle = ink.ink; x.fillRect(90, 252, 1320, 2);
}
function node(x: CanvasRenderingContext2D, cx: number, cy: number, label: string, sub: string, ink: Ink, on = false) {
  x.beginPath(); x.arc(cx, cy, 15, 0, Math.PI * 2); x.fillStyle = on ? ink.accent : ink.paper; x.fill(); x.lineWidth = 3; x.strokeStyle = on ? ink.accent : ink.ink; x.stroke();
  x.textAlign = "center"; x.fillStyle = ink.ink; x.font = `700 25px ${FONT}`; x.fillText(label, cx, cy + 62);
  x.fillStyle = ink.muted; x.font = `500 19px ${FONT}`; sub.split("\n").forEach((l, i) => x.fillText(l, cx, cy + 94 + i * 26)); x.textAlign = "left";
}
function bigNumber(x: CanvasRenderingContext2D, px: number, py: number, value: string, label: string, ink: Ink, size = 132) {
  x.fillStyle = ink.ink; x.font = `300 ${size}px ${FONT}`; x.fillText(value, px, py);
  x.fillStyle = ink.muted; x.font = `600 22px ${MONO}`; x.fillText(label, px + 4, py + 44);
}
function foot(x: CanvasRenderingContext2D, text: string, ink: Ink) { x.fillStyle = ink.muted; x.font = `500 18px ${MONO}`; x.fillText(text, 90, 990); }

export function docentPrint() {
  const ink = { ...INK, accent: "#3f6f9e" };
  return drawn(1500, 1060, (x, w, h) => {
    x.fillStyle = ink.paper; x.fillRect(0, 0, w, h);
    title(x, "01 — DIGITAL DOCENT", "질문에서 얼굴까지", "현재 페이지는 힌트로만, 답은 검색 근거로만", ink);
    const xs = [170, 455, 750, 1045, 1330], y = 380;
    x.strokeStyle = ink.ink; x.lineWidth = 2; x.beginPath(); x.moveTo(xs[0], y); x.lineTo(xs[4], y); x.stroke();
    ["Question", "PageContext", "Hybrid RAG", "LLM", "Voice · Face"].forEach((l, i) => node(x, xs[i], y, l,
      ["방문자의 질문", "pathname · 섹션\n위치 힌트", "BM25 + Dense\nRRF 융합", "근거 grounding\n스트리밍", "Supertonic\nLAM 입모양"][i], ink, i === 2));
    // Retrieval quality: three bars, the measured Hit@k.
    const bx = 90, by = 640, bw = 760;
    x.fillStyle = ink.muted; x.font = `600 20px ${MONO}`; x.fillText("CURATED EVAL · PRODUCTION HYBRID", bx, by - 20);
    [["Hit@1", .647], ["Hit@3", .912], ["Hit@5", .980]].forEach(([l, v], i) => {
      const yy = by + 20 + i * 74; x.fillStyle = "#e7e4dd"; x.fillRect(bx + 120, yy, bw - 120, 34);
      x.fillStyle = i === 2 ? ink.accent : ink.ink; x.fillRect(bx + 120, yy, (bw - 120) * (v as number), 34);
      x.fillStyle = ink.ink; x.font = `600 22px ${MONO}`; x.fillText(l as string, bx, yy + 25);
      x.fillStyle = i === 2 ? "#fff" : "#fff"; x.font = `700 20px ${MONO}`; x.fillText((v as number).toFixed(3), bx + 132, yy + 24);
    });
    bigNumber(x, 960, 790, "0.980", "HIT@5", ink, 150);
    x.fillStyle = ink.ink; x.font = `500 24px ${FONT}`; x.fillText("embedding 장애 → BM25만으로 답변", 965, 900);
    foot(x, "BM25 · text-embedding-3-small · RRF · Supertonic · LAM · React Three Fiber", ink);
  });
}
export function bcosPrint() {
  const ink = { ...INK, accent: "#b07a1e" };
  return drawn(1500, 1060, (x, w, h) => {
    x.fillStyle = ink.paper; x.fillRect(0, 0, w, h);
    title(x, "02 — BCOS", "스스로 승인하지 않는 구조", "구현 세션과 리뷰 세션을 나누고, release는 Human이", ink);
    // Two sessions side by side with a hard boundary between them.
    const box = (px: number, label: string, sub: string, dark: boolean) => {
      x.fillStyle = dark ? ink.ink : ink.paper; x.strokeStyle = ink.ink; x.lineWidth = 3;
      x.fillRect(px, 330, 420, 220); x.strokeRect(px, 330, 420, 220);
      x.fillStyle = dark ? "#fbfaf6" : ink.ink; x.font = `700 34px ${FONT}`; x.fillText(label, px + 34, 400);
      x.fillStyle = dark ? "#c9c6bf" : ink.muted; x.font = `500 22px ${FONT}`; sub.split("\n").forEach((l, i) => x.fillText(l, px + 34, 448 + i * 32));
    };
    box(90, "Worker", "Codex 구현 세션\nTask Contract의 범위만", false);
    box(990, "Reviewer", "Claude 독립 리뷰 세션\n같은 Worker는 승인 불가", true);
    x.setLineDash([10, 10]); x.strokeStyle = ink.accent; x.lineWidth = 3; x.beginPath(); x.moveTo(750, 300); x.lineTo(750, 580); x.stroke(); x.setLineDash([]);
    x.textAlign = "center"; x.fillStyle = ink.accent; x.font = `700 22px ${MONO}`; x.fillText("NO SELF-APPROVAL", 750, 620);
    x.fillStyle = ink.ink; x.font = `600 24px ${FONT}`; x.fillText("Host verification → Human approval", 750, 452); x.textAlign = "left";
    x.strokeStyle = ink.ink; x.lineWidth = 2; x.beginPath(); x.moveTo(530, 440); x.lineTo(560, 440); x.moveTo(940, 440); x.lineTo(985, 440); x.stroke();
    bigNumber(x, 90, 860, "50/50", "ACCEPTANCE CRITERIA", ink, 140);
    bigNumber(x, 620, 860, "272/272", "TESTS · FINAL PRODUCT SCOPE", ink, 140);
    x.fillStyle = ink.accent; x.font = `700 30px ${MONO}`; x.fillText("T-015 APPROVED", 1150, 830);
    foot(x, "Task Contract · Worker · Host verification · Independent review · Event audit", ink);
  });
}
export function crimePrint() {
  const ink = { ...INK, accent: "#a8392f" };
  return drawn(1500, 1060, (x, w, h) => {
    x.fillStyle = ink.paper; x.fillRect(0, 0, w, h);
    title(x, "03 — CRIME SCENE", "심문의 경계", "모델은 비밀을 모르고, 서버가 판정합니다", ink);
    const col = (px: number, head: string, lines: string[], dark = false) => {
      x.fillStyle = dark ? ink.ink : "#f1efe9"; x.fillRect(px, 320, 380, 300);
      x.fillStyle = dark ? "#fbfaf6" : ink.ink; x.font = `700 28px ${FONT}`; x.fillText(head, px + 28, 372);
      x.font = `500 22px ${MONO}`; x.fillStyle = dark ? "#d2cfc8" : ink.muted; lines.forEach((l, i) => x.fillText(l, px + 28, 424 + i * 36));
    };
    col(90, "Server · truth", ["truth", "secret", "alibi", "clue state"], true);
    col(560, "Model output", ["{", "  answer,", "  concededTopicIds", "}"]);
    col(1030, "∩ whitelist", ["허용 주제와", "겹치는 것만", "상태 전이에 반영"]);
    x.fillStyle = ink.accent; x.font = `700 40px ${FONT}`; x.fillText("→", 485, 480); x.fillText("→", 955, 480);
    x.fillStyle = ink.accent; x.font = `600 20px ${MONO}`; x.fillText("NEVER SENT TO THE MODEL", 90, 660);
    bigNumber(x, 90, 860, "2/2", "FULL PLAYTHROUGHS · DIFFERENT ORDERS", ink, 140);
    bigNumber(x, 700, 860, "335", "SECRET-STRING BUNDLE AUDIT", ink, 140);
    foot(x, "React Three Fiber · Zustand · Structured LLM Output · Zod · Server-only story data", ink);
  });
}
/** Small wall plaque next to each print. */
export function plaqueTexture(no: string, name: string, year: string, medium: string) {
  return drawn(600, 400, (x, w, h) => {
    x.fillStyle = "#fdfcf9"; x.fillRect(0, 0, w, h);
    x.fillStyle = "#17181b"; x.font = `700 46px ${FONT}`; x.fillText(name, 40, 92);
    x.fillStyle = "#6b6a66"; x.font = `500 28px ${FONT}`; x.fillText(`김범석 · ${year}`, 40, 144);
    x.font = `500 21px ${FONT}`; const words = medium.split(" · "); let line = "", y = 214;
    for (const word of words) { const next = line ? `${line} · ${word}` : word; if (x.measureText(next).width > 520) { x.fillText(line, 40, y); y += 32; line = word; } else line = next; }
    if (line) x.fillText(line, 40, y);
    x.fillStyle = "#17181b"; x.font = `600 20px ${MONO}`; x.fillText(no, 40, 360);
  });
}
/** Vinyl lettering for the hall (black on white wall). */
export function vinylTexture(lines: { text: string; font: string; y: number; color?: string; spacing?: number }[], w: number, h: number) {
  return drawn(w, h, (x) => {
    x.clearRect(0, 0, w, h);
    for (const l of lines) {
      x.font = l.font; x.fillStyle = l.color ?? "#17181b";
      if (l.spacing) { let px = 0; const chars = [...l.text]; const total = chars.reduce((s, ch) => s + x.measureText(ch).width + l.spacing!, -l.spacing); px = (w - total) / 2; for (const ch of chars) { x.fillText(ch, px, l.y); px += x.measureText(ch).width + l.spacing; } }
      else { x.textAlign = "center"; x.fillText(l.text, w / 2, l.y); x.textAlign = "left"; }
    }
  });
}
/** Etched label on an acrylic panel (alpha only). */
export function etchTexture(no: string, word: string) {
  return drawn(512, 900, (x, w, h) => {
    x.clearRect(0, 0, w, h); x.fillStyle = "#fff";
    x.font = `600 44px ${MONO}`; x.fillText(no, 52, 110);
    x.font = `700 64px ${FONT}`; x.fillText(word, 52, 190);
    x.fillRect(52, 222, 140, 4);
    for (let i = 0; i < 9; i++) x.fillRect(52, 300 + i * 52, 160 + ((i * 97) % 220), 6);
  }, false);
}
/** Photo prints for the vitrine (abstract crime-scene shots: a room corner, a hallway, a desk). */
export function photoTexture(kind: number) {
  return drawn(256, 300, (x, w, h) => {
    x.fillStyle = "#f6f4ef"; x.fillRect(0, 0, w, h);
    const g = x.createLinearGradient(0, 18, 0, 236); g.addColorStop(0, ["#4b5563", "#3f3a35", "#2f3a3f"][kind]); g.addColorStop(1, ["#1f242b", "#1c1916", "#151b1e"][kind]);
    x.fillStyle = g; x.fillRect(16, 16, w - 32, 222);
    x.strokeStyle = "rgba(255,240,210,.35)"; x.lineWidth = 2; x.beginPath();
    if (kind === 0) { x.moveTo(128, 16); x.lineTo(128, 150); x.lineTo(16, 238); x.moveTo(128, 150); x.lineTo(240, 238); }
    else if (kind === 1) { x.moveTo(60, 238); x.lineTo(110, 90); x.lineTo(146, 90); x.lineTo(196, 238); x.moveTo(110, 90); x.lineTo(110, 40); x.moveTo(146, 90); x.lineTo(146, 40); }
    else { x.rect(60, 120, 140, 60); x.moveTo(70, 180); x.lineTo(70, 238); x.moveTo(190, 180); x.lineTo(190, 238); }
    x.stroke();
    x.fillStyle = "rgba(255,226,160,.5)"; x.beginPath(); x.arc([170, 128, 90][kind], [70, 70, 100][kind], 14, 0, 6.3); x.fill();
    x.fillStyle = "#3b3a37"; x.font = `500 18px ${MONO}`; x.fillText(`EVIDENCE ${String(kind + 1).padStart(2, "0")}`, 20, 272);
  });
}
export function fileTexture() {
  return drawn(512, 360, (x, w, h) => {
    x.fillStyle = "#c9a771"; x.fillRect(0, 0, w, h);
    x.fillStyle = "rgba(90,60,20,.08)"; for (let i = 0; i < 400; i++) x.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    x.fillStyle = "#f5efe2"; x.fillRect(60, 60, 280, 110);
    x.fillStyle = "#2b2420"; x.font = `700 40px ${MONO}`; x.fillText("CASE FILE", 82, 118);
    x.font = `500 22px ${MONO}`; x.fillText("CONFIDENTIAL", 84, 152);
    x.strokeStyle = "#a8392f"; x.lineWidth = 5; x.strokeRect(340, 230, 140, 70); x.fillStyle = "#a8392f"; x.font = `700 26px ${MONO}`; x.fillText("SEALED", 358, 276);
  });
}
export function tagTexture(text: string) {
  return drawn(160, 80, (x, w, h) => { x.fillStyle = "#f7f1e2"; x.fillRect(0, 0, w, h); x.fillStyle = "#2b2420"; x.font = `700 26px ${MONO}`; x.fillText(text, 18, 50); });
}
export function brassPlateTexture(text: string) {
  return drawn(256, 96, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, "#d8b56a"); g.addColorStop(.5, "#b8913c"); g.addColorStop(1, "#8a6a22");
    x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = "#3a2a10"; x.font = `700 40px ${MONO}`; x.textAlign = "center"; x.fillText(text, w / 2, 62);
  });
}

/* ── Works ──────────────────────────────────────────────────────────────── */
export function plinth(w: number, h: number, d: number, mat: Material) {
  const m = new Mesh(new RoundedBoxGeometry(w, h, d, 3, .01), mat); m.position.y = h / 2; m.castShadow = true; m.receiveShadow = true; return m;
}
/** A gallery frame: thin black aluminium, white mat, print, low-iron glass sheen. */
export function framedPrint(print: CanvasTexture, w: number, h: number) {
  const g = new Group(), t = .028, mat = .085;
  const alu = new MeshStandardMaterial({ color: "#121316", roughness: .38, metalness: .6 });
  const bars: [number, number, number, number][] = [[0, h / 2 + t / 2, w + 2 * t, t], [0, -h / 2 - t / 2, w + 2 * t, t], [-w / 2 - t / 2, 0, t, h], [w / 2 + t / 2, 0, t, h]];
  for (const [x, y, bw, bh] of bars) { const b = new Mesh(new BoxGeometry(bw, bh, .035), alu); b.position.set(x, y, .0175); b.castShadow = true; g.add(b); }
  const matBoard = new Mesh(new PlaneGeometry(w, h), new MeshStandardMaterial({ color: "#fbfaf7", roughness: .95 })); matBoard.position.z = .006; matBoard.receiveShadow = true; g.add(matBoard);
  const pr = new Mesh(new PlaneGeometry(w - 2 * mat, (w - 2 * mat) * 1060 / 1500), new MeshStandardMaterial({ map: print, roughness: .85 })); pr.position.z = .008; g.add(pr);
  const glass = new Mesh(new PlaneGeometry(w, h), new MeshPhysicalMaterial({ color: "#ffffff", roughness: .04, metalness: 0, transparent: true, opacity: .06, clearcoat: 1, depthWrite: false })); glass.position.z = .03; g.add(glass);
  return g;
}
/** BCOS: five acrylic sheets standing on an oak base; a light beam threads them in order. */
export function acrylicWork(etches: CanvasTexture[], high: boolean) {
  const g = new Group(), L = 2.3, base = new Mesh(new RoundedBoxGeometry(L + .3, .1, .62, 3, .012), new MeshStandardMaterial({ color: G.oak, roughness: .55 }));
  base.position.y = .05; base.castShadow = true; base.receiveShadow = true; g.add(base);
  const sheet = new RoundedBoxGeometry(.03, 1.2, .56, 2, .006);
  // Reflection-carried acrylic: a transmission material would re-render the whole room every frame.
  const acrylic = new MeshPhysicalMaterial({ color: "#eef6f3", roughness: .05, transparent: true, opacity: high ? .24 : .28, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: 1.5, depthWrite: false });
  const panels = etches.map((etch, i) => {
    const p = new Group(); p.position.set(-L / 2 + .15 + i * (L - .3) / 4, .1, 0);
    const s = new Mesh(sheet, acrylic); s.position.y = .6; s.castShadow = true; p.add(s);
    // Frosted etching on the visitor-facing side of the sheet.
    const e = new Mesh(new PlaneGeometry(.42, .42 * 900 / 512), new MeshStandardMaterial({ color: "#ffffff", alphaMap: etch, transparent: true, opacity: .8, roughness: .9, depthWrite: false, side: DoubleSide }));
    e.rotation.y = Math.PI / 2; e.position.set(.017, .72, 0); p.add(e);
    const edge = new Mesh(new BoxGeometry(.034, 1.2, .006), new MeshStandardMaterial({ color: "#d9e6e0", emissive: new Color("#f0be64"), emissiveIntensity: 0, roughness: .2 }));
    edge.position.set(0, .6, .281); p.add(edge);
    const edge2 = edge.clone(); edge2.material = edge.material; edge2.position.z = -.281; p.add(edge2);
    const foot = new Mesh(new BoxGeometry(.09, .025, .58), new MeshStandardMaterial({ color: "#2a2b2f", roughness: .4, metalness: .6 })); foot.position.y = .0125; p.add(foot);
    g.add(p); return { group: p, edge: edge.material as MeshStandardMaterial, rest: p.position.clone() };
  });
  const beamMat = new MeshBasicMaterial({ color: new Color("#ffd27a").multiplyScalar(2.2), toneMapped: false, transparent: true });
  const beam = new Mesh(new CylinderGeometry(.006, .006, 1, 12), beamMat); beam.rotation.z = Math.PI / 2; g.add(beam);
  const head = new Mesh(new CylinderGeometry(.02, .02, .02, 16), beamMat); head.rotation.z = Math.PI / 2; g.add(head);
  return { group: g, panels, beam, head, L, beamMat };
}
/** Crime Scene: a glass vitrine with evidence and a locked truth safe. */
export function vitrineWork(tex: { file: CanvasTexture; photos: CanvasTexture[]; tags: CanvasTexture[]; plate: CanvasTexture }, high: boolean) {
  const g = new Group(), W = 1.1, D = .74, H = .92, GH = .6;
  const top = H;
  const felt = new Mesh(new BoxGeometry(W - .04, .02, D - .04), new MeshStandardMaterial({ color: "#57534d", roughness: 1 })); felt.position.y = top + .01; felt.receiveShadow = true; g.add(felt);
  const bronze = new MeshStandardMaterial({ color: "#3a3127", roughness: .35, metalness: .8 });
  const rim = new Mesh(new BoxGeometry(W + .01, .03, D + .01), bronze); rim.position.y = top + .015; g.add(rim);
  // Low-iron glass: reflections carry it (transmission over the dark felt read as smoked glass).
  const glassMat = new MeshPhysicalMaterial({ color: "#f6fbfa", roughness: 0, metalness: 0, transparent: true, opacity: high ? .07 : .1, clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: 1.6, depthWrite: false });
  const panes: [number, number, number, number, number, number][] = [[0, GH / 2, D / 2, W, GH, .008], [0, GH / 2, -D / 2, W, GH, .008], [W / 2, GH / 2, 0, .008, GH, D], [-W / 2, GH / 2, 0, .008, GH, D], [0, GH, 0, W, .008, D]];
  for (const [x, y, z, w, h, d] of panes) { const m = new Mesh(new BoxGeometry(w, h, d), glassMat); m.position.set(x, top + .03 + y, z); g.add(m); }
  // Hairline bronze corner posts keep the case readable as an object.
  for (const [x, z] of [[W / 2, D / 2], [-W / 2, D / 2], [W / 2, -D / 2], [-W / 2, -D / 2]]) { const post = new Mesh(new BoxGeometry(.012, GH, .012), bronze); post.position.set(x, top + .03 + GH / 2, z); g.add(post); }
  const inside = new Group(); inside.position.y = top + .02; g.add(inside);
  const file = new Mesh(new BoxGeometry(.36, .018, .26), [new MeshStandardMaterial({ color: G.kraft, roughness: .9 }), new MeshStandardMaterial({ color: G.kraft, roughness: .9 }), new MeshStandardMaterial({ map: tex.file, roughness: .9 }), new MeshStandardMaterial({ color: "#a98a55" }), new MeshStandardMaterial({ color: G.kraft }), new MeshStandardMaterial({ color: G.kraft })]);
  file.position.set(-.22, .009, .1); file.rotation.y = .18; file.castShadow = true; file.receiveShadow = true; inside.add(file);
  tex.photos.forEach((ph, i) => {
    const p = new Mesh(new BoxGeometry(.1, .002, .118), [0, 0, 1, 0, 0, 0].map(k => k ? new MeshStandardMaterial({ map: ph, roughness: .6 }) : new MeshStandardMaterial({ color: "#f3f1ec" })));
    p.position.set(.06 + i * .085, .02 + i * .002, .17 - i * .03); p.rotation.y = -.25 + i * .22; p.castShadow = true; inside.add(p);
  });
  // Evidence bag with a red seal.
  const bag = new Mesh(new BoxGeometry(.16, .012, .22), new MeshPhysicalMaterial({ color: "#ffffff", roughness: .25, transparent: true, opacity: .35, clearcoat: 1 })); bag.position.set(-.3, .03, -.17); bag.rotation.y = -.3; inside.add(bag);
  const seal = new Mesh(new BoxGeometry(.16, .014, .03), new MeshStandardMaterial({ color: "#a8392f", roughness: .5 })); seal.position.set(-.3, .031, -.17); seal.rotation.y = -.3; seal.translateZ(-.09); inside.add(seal);
  const key = new Group(); const ring = new Mesh(new TorusGeometry(.018, .004, 8, 24), new MeshStandardMaterial({ color: G.brass, metalness: .9, roughness: .3 })); ring.rotation.x = Math.PI / 2;
  const shaft = new Mesh(new BoxGeometry(.06, .006, .008), ring.material); shaft.position.x = .045; key.add(ring, shaft); key.position.set(-.31, .036, -.16); key.rotation.y = .6; inside.add(key);
  // Magnifier.
  const mag = new Group(); const lensRim = new Mesh(new TorusGeometry(.045, .006, 10, 40), new MeshStandardMaterial({ color: "#1d1d1f", roughness: .3, metalness: .7 })); lensRim.rotation.x = Math.PI / 2;
  const lens = new Mesh(new CylinderGeometry(.044, .044, .003, 40), new MeshPhysicalMaterial({ color: "#ffffff", roughness: 0, transparent: true, opacity: .25, clearcoat: 1 }));
  const handle = new Mesh(new CylinderGeometry(.008, .009, .1, 12), new MeshStandardMaterial({ color: "#3b2a1c", roughness: .6 })); handle.rotation.z = Math.PI / 2; handle.position.x = .1;
  mag.add(lensRim, lens, handle); mag.position.set(.1, .012, -.05); mag.rotation.y = .9; inside.add(mag);
  // The truth safe: black steel, brass dial, engraved plate, a red "locked" light.
  const safe = new Group(); safe.position.set(.3, 0, -.12); safe.rotation.y = -.35; inside.add(safe);
  const steel = new MeshStandardMaterial({ color: "#1b1c1f", roughness: .32, metalness: .85 });
  const body = new Mesh(new RoundedBoxGeometry(.26, .24, .24, 3, .014), steel); body.position.y = .12; body.castShadow = true; safe.add(body);
  const door = new Mesh(new RoundedBoxGeometry(.21, .19, .012, 2, .004), new MeshStandardMaterial({ color: "#232428", roughness: .28, metalness: .9 })); door.position.set(0, .12, .124); safe.add(door);
  const dial = new Mesh(new CylinderGeometry(.03, .03, .014, 32), new MeshStandardMaterial({ color: G.brass, roughness: .28, metalness: .95 })); dial.rotation.x = Math.PI / 2; dial.position.set(-.03, .13, .136); safe.add(dial);
  const handleBar = new Mesh(new BoxGeometry(.05, .01, .012), dial.material); handleBar.position.set(.06, .13, .136); safe.add(handleBar);
  const plate = new Mesh(new PlaneGeometry(.1, .036), new MeshStandardMaterial({ map: tex.plate, metalness: .7, roughness: .35 })); plate.position.set(0, .06, .131); safe.add(plate);
  const ledMat = new MeshBasicMaterial({ color: new Color("#ff3b2f").multiplyScalar(2), toneMapped: false });
  const led = new Mesh(new CylinderGeometry(.006, .006, .004, 12), ledMat); led.rotation.x = Math.PI / 2; led.position.set(.07, .19, .132); safe.add(led);
  // Whitelist tags: two pass (lit), one is refused (stays dark).
  const tagGeo = new PlaneGeometry(.06, .03);
  const tags = tex.tags.map((t, i) => {
    const m = new MeshStandardMaterial({ map: t, roughness: .8, emissive: new Color("#fff1cf"), emissiveIntensity: 0, side: DoubleSide });
    const tag = new Mesh(tagGeo, m); tag.rotation.x = -Math.PI / 2 + .25; tag.position.set([-.12, .14, -.3][i], .03, [.24, .25, -.02][i]); tag.rotation.z = [.3, -.2, .5][i]; inside.add(tag);
    return { mesh: tag, mat: m, pass: i < 2 };
  });
  return { group: g, ledMat, led, tags, dial, H, top };
}
export function disposeTree(root: { traverse: (cb: (o: unknown) => void) => void }, keep: Set<BufferGeometry> = new Set()) {
  root.traverse(o => {
    const m = o as Mesh; if (m.geometry && !keep.has(m.geometry)) m.geometry.dispose();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    mats.forEach(mat => { const mm = mat as MeshStandardMaterial; mm.map?.dispose(); mm.alphaMap?.dispose(); mm.dispose(); });
  });
}
