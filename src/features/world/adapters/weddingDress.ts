import { BufferAttribute, BufferGeometry, Color, CylinderGeometry, DoubleSide, LatheGeometry, MeshPhysicalMaterial, Vector2, type Material } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { WdModelId } from "./weddingAtelier";

/*
 * Procedural ball gown on a dress form. One topology (rings × segments) so every candidate's
 * documented failure can be a morph target of the same input dress:
 *   PIFuHD → the surface tears open (discard by per-vertex tear value)
 *   PaMIR  → the skirt volume is under-represented (shrinks toward the body)
 *   ECON   → the skirt volume comes back as if cut in half (the real output's failure)
 *   SMPL   → the garment cannot be represented at all (dissolves; the body remains)
 *   ICON   → never reproduced (environment failure; shown as a flickering wire ghost)
 * These are illustrations of the record, not reconstruction outputs.
 */

/* Ball gown profile: neckline → hem (y metres, radius). */
const PROFILE: [number, number][] = [
  [1.315, .148], [1.29, .162], [1.25, .166], [1.2, .152], [1.15, .138], [1.1, .128], [1.05, .124], [1.02, .128],
  [.99, .17], [.95, .235], [.9, .3], [.83, .36], [.75, .415], [.66, .46], [.56, .5], [.46, .535], [.36, .565],
  [.26, .59], [.17, .612], [.09, .632], [.035, .648], [.012, .655],
];
const WAIST_Y = 1.0;
const SEG = 120, RINGS = 72;

function hash(x: number, y: number) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x: number, y: number) => vnoise(x, y) * .55 + vnoise(x * 2.1, y * 2.1) * .3 + vnoise(x * 4.3, y * 4.3) * .15;
const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Resample the profile at `RINGS` points by arc length so folds are even. */
function sampleProfile(): [number, number][] {
  const lens = [0];
  for (let i = 1; i < PROFILE.length; i++) lens.push(lens[i - 1] + Math.hypot(PROFILE[i][0] - PROFILE[i - 1][0], PROFILE[i][1] - PROFILE[i - 1][1]));
  const total = lens[lens.length - 1], out: [number, number][] = [];
  for (let r = 0; r < RINGS; r++) {
    const s = total * r / (RINGS - 1); let i = lens.findIndex(l => l >= s); if (i <= 0) i = 1;
    const t = (s - lens[i - 1]) / (lens[i] - lens[i - 1] || 1);
    out.push([PROFILE[i - 1][0] + (PROFILE[i][0] - PROFILE[i - 1][0]) * t, PROFILE[i - 1][1] + (PROFILE[i][1] - PROFILE[i - 1][1]) * t]);
  }
  return out;
}
const RING = sampleProfile();

type Shape = (theta: number, y: number, r: number, skirt: number) => [number, number, number];
/** The real dress: folds deepen toward the hem, slight train at the back, sweetheart neckline. */
const inputShape: Shape = (th, y, r, skirt) => {
  const fold = skirt * (.026 * Math.sin(13 * th + 1.7 * y) + .014 * Math.sin(29 * th - 4 * y + 1.3) + .012 * (fbm(th * 3, y * 4) - .5));
  const train = skirt * smooth(.5, 0, y) * .1 * Math.max(0, -Math.cos(th)) ** 2;
  const depth = skirt ? .9 + .1 * skirt : .74;
  const R = r * (1 + fold * 1.3) + train;
  return [Math.sin(th) * R, y, Math.cos(th) * R * depth - (skirt ? 0 : .01)];
};
const failShapes: Record<"econ" | "pamir" | "pifuhd", Shape> = {
  // Half the skirt volume is missing (the back half is discarded by tear); what remains sags flatter.
  econ: (th, y, r, skirt) => {
    const [x, , z] = inputShape(th, y, r, skirt);
    const sag = skirt * .03 * (fbm(th * 2 + 3, y * 3) - .5);
    return [x * (1 - .08 * skirt) + sag, y - skirt * .015 * vnoise(th * 5, 1), z * (1 - .22 * skirt)];
  },
  // Volume under-represented: SMPL-conditioned surface hugs the body.
  pamir: (th, y, r, skirt) => {
    const body = .2 + (1 - y) * .03, R = skirt ? body + (r - body) * .38 : r;
    return inputShape(th, y, R, skirt * .6);
  },
  // Pixel-aligned implicit surface: noisy, with torn edges (tears handled by discard).
  pifuhd: (th, y, r, skirt) => {
    const [x, yy, z] = inputShape(th, y, r, skirt), j = skirt * .035 * (vnoise(th * 9, y * 9) - .5);
    return [x * (1 + j), yy + skirt * .03 * (vnoise(th * 7 + 5, 2) - .5) * smooth(.2, 0, y), z * (1 + j)];
  },
};

function build(shape: Shape) {
  const pos = new Float32Array(RINGS * (SEG + 1) * 3);
  let k = 0;
  for (let i = 0; i < RINGS; i++) {
    const [y, r] = RING[i], skirt = smooth(WAIST_Y + .02, WAIST_Y - .1, y);
    for (let s = 0; s <= SEG; s++) {
      const th = s / SEG * Math.PI * 2, [x, yy, z] = shape(th, y, r, skirt);
      // Sweetheart neckline: the top rings dip at the front centre and rise over each bust.
      const front = Math.max(0, Math.cos(th)), sweet = i < 3 ? (.02 * Math.abs(Math.sin(th * 2)) * front - .018 * front ** 6) * (1 - i / 3) : 0;
      pos[k++] = x; pos[k++] = yy + sweet; pos[k++] = z;
    }
  }
  return pos;
}
function indexAndUv(geo: BufferGeometry) {
  const idx: number[] = [], uv = new Float32Array(RINGS * (SEG + 1) * 2);
  for (let i = 0; i < RINGS; i++) for (let s = 0; s <= SEG; s++) { const n = i * (SEG + 1) + s; uv[n * 2] = s / SEG; uv[n * 2 + 1] = 1 - i / (RINGS - 1); }
  for (let i = 0; i < RINGS - 1; i++) for (let s = 0; s < SEG; s++) {
    const a = i * (SEG + 1) + s, b = a + SEG + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  geo.setIndex(idx); geo.setAttribute("uv", new BufferAttribute(uv, 2));
}
function normalsFor(geo: BufferGeometry, pos: Float32Array) {
  const tmp = new BufferGeometry(); tmp.setIndex(geo.getIndex()); tmp.setAttribute("position", new BufferAttribute(pos, 3)); tmp.computeVertexNormals();
  const n = tmp.getAttribute("normal") as BufferAttribute; tmp.dispose(); return n;
}

/** Per-vertex tear threshold: lower values open first (discard when aTear < uTear). */
function tearValues(model: WdModelId | "input") {
  const t = new Float32Array(RINGS * (SEG + 1));
  for (let i = 0; i < RINGS; i++) {
    const [y] = RING[i];
    for (let s = 0; s <= SEG; s++) {
      const th = s / SEG * Math.PI * 2, n = i * (SEG + 1) + s;
      if (model === "pifuhd") t[n] = .25 + .75 * smooth(0, .9, y) * .7 + .55 * fbm(th * 2.6, y * 5.5) - (y < .12 ? .3 : 0);
      else if (model === "smpl") t[n] = .05 + .9 * smooth(0, 1.32, y) + .12 * fbm(th * 3, y * 6);
      // ECON: the back half of the skirt is cut away from the very back toward the sides, with a ragged edge.
      else if (model === "econ") t[n] = y < WAIST_Y - .03 ? (Math.cos(th) < .02 ? .04 + .44 * (Math.cos(th) + 1) + .05 * (fbm(th * 4, y * 7) - .5) : 2) : 2;
      else t[n] = 2;
    }
  }
  return t;
}

export type DressGeometry = BufferGeometry;
/**
 * Dress for one candidate (or the real input). Morph target 0 = that candidate's failure.
 * Built once per model and reused: the noise-shaped build cost ~0.6s on a slow laptop each time the
 * atelier mounted. A disposed geometry only drops its GPU buffers, so reuse after unmount is safe.
 */
const dressCache = new Map<WdModelId | "input", DressGeometry>();
export function createDressGeometry(model: WdModelId | "input"): DressGeometry {
  let geo = dressCache.get(model);
  if (!geo) dressCache.set(model, geo = buildDressGeometry(model));
  return geo;
}
/** Builds the atelier's dresses in idle slots ahead of it (one per slot). */
export function prewarmDressGeometries(models: readonly (WdModelId | "input")[]) {
  const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
  const next = (i: number) => { if (i < models.length) idle(() => { createDressGeometry(models[i]); next(i + 1); }); };
  next(0);
}
function buildDressGeometry(model: WdModelId | "input"): DressGeometry {
  const geo = new BufferGeometry();
  indexAndUv(geo);
  const base = build(inputShape);
  geo.setAttribute("position", new BufferAttribute(base, 3));
  geo.setAttribute("normal", normalsFor(geo, base));
  geo.setAttribute("aTear", new BufferAttribute(tearValues(model), 1));
  if (model === "econ" || model === "pamir" || model === "pifuhd") {
    const fail = build(failShapes[model]);
    geo.morphAttributes.position = [new BufferAttribute(fail, 3)];
    geo.morphAttributes.normal = [normalsFor(geo, fail)];
  }
  geo.computeBoundingSphere();
  return geo;
}

/** ECON's success case: a fitted mermaid line (hugs the body, flares below the knee, short train). */
export function createMermaidGeometry() {
  const prof: [number, number][] = [[.0, .012], [.43, .02], [.40, .07], [.33, .16], [.24, .28], [.17, .4], [.135, .5], [.15, .62], [.175, .78], [.19, .9], [.16, .98], [.128, 1.03], [.14, 1.12], [.162, 1.22], [.158, 1.29], [.146, 1.315]];
  const g = new LatheGeometry(prof.map(([r, y]) => new Vector2(r, y)), 96);
  const p = g.getAttribute("position") as BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), th = Math.atan2(x, z), skirt = smooth(.5, .1, y);
    const fold = 1 + skirt * (.03 * Math.sin(11 * th + 3 * y) + .012 * (fbm(th * 3, y * 5) - .5));
    const train = skirt * .16 * Math.max(0, -Math.cos(th)) ** 2 * smooth(.25, 0, y);
    p.setXYZ(i, x * fold, y, z * fold * (y > .5 ? .8 : .92) - train);
  }
  g.computeVertexNormals();
  return g;
}

/** Dress form: linen torso above the bodice (shoulders, neck cap) + brass stand + base. */
export function createFormGeometry() {
  const pts = [[.0, 1.0], [.13, 1.0], [.15, 1.15], [.166, 1.26], [.16, 1.335], [.135, 1.385], [.085, 1.415], [.056, 1.43], [.052, 1.48], [.058, 1.5], [.03, 1.52], [0, 1.523]]
    .map(([r, y]) => new Vector2(r, y));
  const torso = new LatheGeometry(pts, 72);
  const p = torso.getAttribute("position") as BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), w = 1 + .32 * smooth(1.22, 1.33, y) * (1 - smooth(1.37, 1.42, y));
    p.setX(i, p.getX(i) * w); p.setZ(i, p.getZ(i) * .76);
  }
  torso.computeVertexNormals();
  return torso;
}
export function createStandGeometry() {
  const pole = new CylinderGeometry(.011, .011, 1.0, 16); pole.translate(0, .5, 0);
  const base = new CylinderGeometry(.2, .23, .025, 48); base.translate(0, .0125, 0);
  const merged = mergeGeometries([pole, base]); pole.dispose(); base.dispose();
  return merged;
}
/** SMPL: a parametric body, no garment. Torso + hips + legs as one clay mannequin. */
export function createBodyGeometry() {
  const torso = createFormGeometry();
  const hips = new LatheGeometry([[.0, .78], [.15, .8], [.19, .9], [.135, 1.0], [0, 1.0]].map(([r, y]) => new Vector2(r, y)), 48);
  const hp = hips.getAttribute("position") as BufferAttribute; for (let i = 0; i < hp.count; i++) hp.setZ(i, hp.getZ(i) * .78);
  hips.computeVertexNormals();
  const leg = (x: number) => { const g = new CylinderGeometry(.068, .042, .76, 24); g.translate(x, .41, 0); return g; };
  const l = leg(-.088), r = leg(.088);
  const merged = mergeGeometries([torso.toNonIndexed(), hips.toNonIndexed(), l.toNonIndexed(), r.toNonIndexed()]);
  [torso, hips, l, r].forEach(g => g.dispose());
  merged.computeVertexNormals();
  return merged;
}

/* ── Materials ────────────────────────────────────────────────────────── */
export const SATIN = { color: new Color("#f6f1e8"), roughness: .36, sheen: 1, sheenRoughness: .42, sheenColor: new Color("#fff3e2") };
export const CLAY = { color: new Color("#b4b1ab"), roughness: .82, sheen: 0, sheenRoughness: 1, sheenColor: new Color("#000000") };
/** Fabric/clay material with a tear (discard) uniform and a 0..1 satin→clay blend driven per frame. */
export function createFabricMaterial() {
  const m = new MeshPhysicalMaterial({ color: SATIN.color.clone(), roughness: SATIN.roughness, sheen: 1, sheenRoughness: SATIN.sheenRoughness, sheenColor: SATIN.sheenColor.clone(), clearcoat: .08, clearcoatRoughness: .5, side: DoubleSide });
  const uTear = { value: 0 };
  m.onBeforeCompile = shader => {
    shader.uniforms.uTear = uTear;
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nattribute float aTear;\nvarying float vTear;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvTear = aTear;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uTear;\nvarying float vTear;")
      .replace("#include <clipping_planes_fragment>", "#include <clipping_planes_fragment>\nif (vTear < uTear) discard;");
  };
  m.customProgramCacheKey = () => "wd-fabric";
  return Object.assign(m, { userData: { uTear } }) as MeshPhysicalMaterial & { userData: { uTear: { value: number } } };
}
export function setClay(m: MeshPhysicalMaterial, t: number) {
  m.color.copy(SATIN.color).lerp(CLAY.color, t);
  m.roughness = SATIN.roughness + (CLAY.roughness - SATIN.roughness) * t;
  // Floors, not zero: three swaps the whole shader when sheen or clearcoat reaches 0 (USE_SHEEN /
  // USE_CLEARCOAT), and the mirror's reflection pass then compiled it synchronously mid-scroll.
  m.sheen = Math.max(1e-3, 1 - t); m.sheenRoughness = SATIN.sheenRoughness + (1 - SATIN.sheenRoughness) * t;
  m.clearcoat = Math.max(1e-3, .08 * (1 - t));
}
export function disposeAll(items: (Material | BufferGeometry)[]) { items.forEach(i => i.dispose()); }
