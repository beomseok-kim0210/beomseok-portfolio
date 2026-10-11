import { BufferAttribute, BufferGeometry, MeshBasicMaterial, Vector3 } from "three";
import { MarchingCubes } from "three/addons/objects/MarchingCubes.js";

/* A stylised human surface built from the 21 rig joints: anatomical primitives (head, neck,
 * trapezius, chest, deltoids, arms, hands, pelvis, glutes, thighs, calves, feet) blended with a
 * smooth minimum and polygonised once with marching cubes. Explanatory figure, not a body scan. */

type Prim =
  | { t: "cone"; a: number[]; b: number[]; r1: number; r2: number; k: number }
  | { t: "ell"; c: number[]; r: number[]; ax?: number[][]; k: number };

function smin(a: number, b: number, k: number) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * .25; }
function sdCone(px: number, py: number, pz: number, p: Extract<Prim, { t: "cone" }>) {
  const [ax, ay, az] = p.a, bx = p.b[0] - ax, by = p.b[1] - ay, bz = p.b[2] - az, qx = px - ax, qy = py - ay, qz = pz - az;
  const h = Math.max(0, Math.min(1, (qx * bx + qy * by + qz * bz) / (bx * bx + by * by + bz * bz)));
  const dx = qx - bx * h, dy = qy - by * h, dz = qz - bz * h;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - (p.r1 + (p.r2 - p.r1) * h);
}
function sdEll(px: number, py: number, pz: number, p: Extract<Prim, { t: "ell" }>) {
  let x = px - p.c[0], y = py - p.c[1], z = pz - p.c[2];
  if (p.ax) { const [u, v, w] = p.ax; const lx = x * u[0] + y * u[1] + z * u[2], ly = x * v[0] + y * v[1] + z * v[2], lz = x * w[0] + y * w[1] + z * w[2]; x = lx; y = ly; z = lz; }
  const [rx, ry, rz] = p.r, ax = x / rx, ay = y / ry, az = z / rz, bx = ax / rx, by = ay / ry, bz = az / rz;
  const k0 = Math.sqrt(ax * ax + ay * ay + az * az), k1 = Math.sqrt(bx * bx + by * by + bz * bz);
  return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(rx, ry, rz);
}
const v = (p: Vector3) => [p.x, p.y, p.z];
const lerp = (a: Vector3, b: Vector3, t: number) => a.clone().lerp(b, t);

export type BodyPart = "full" | "upper" | "lower";
/** J: 21 joints (any unit, y up, body facing +z). m: units per metre. */
export function bodyPrimitives(J: Vector3[], m: number, part: BodyPart) {
  const P: Prim[] = [], R = (x: number) => x * m;
  const up = new Vector3(0, 1, 0), fwd = new Vector3(0, 0, 1);
  const sh = lerp(J[5], J[6], .5), hip = lerp(J[11], J[12], .5), shHalf = J[5].distanceTo(J[6]) / 2, hipHalf = J[11].distanceTo(J[12]) / 2;
  const head = lerp(J[3], J[4], .5).addScaledVector(up, R(.035));
  const neckBase = sh.clone().addScaledVector(up, R(.03)).addScaledVector(fwd, R(-.012));
  const cone = (a: Vector3, b: Vector3, r1: number, r2: number, k = .03) => P.push({ t: "cone", a: v(a), b: v(b), r1: R(r1), r2: R(r2), k: R(k) });
  const ell = (c: Vector3, r: number[], k = .03, ax?: Vector3[]) => P.push({ t: "ell", c: v(c), r: r.map(R), k: R(k), ax: ax?.map(v) });
  if (part !== "lower") {
    ell(head, [.079, .104, .094], .02);
    ell(head.clone().addScaledVector(up, R(-.058)).addScaledVector(fwd, R(.028)), [.058, .05, .062], .035);
    cone(neckBase, head.clone().addScaledVector(up, R(-.07)).addScaledVector(fwd, R(-.012)), .05, .043, .035);
    const chest = sh.clone().addScaledVector(up, R(-.12)).addScaledVector(fwd, R(.008));
    ell(chest, [shHalf / m * .92, .15, .105], .06);
    ell(lerp(sh, hip, .62).addScaledVector(fwd, R(.006)), [shHalf / m * .7, .14, .088], .07);
    for (const s of [-1, 1]) {
      const side = new Vector3(s, 0, 0), shoulder = s < 0 ? J[5] : J[6], elbow = s < 0 ? J[7] : J[8], wrist = s < 0 ? J[9] : J[10];
      ell(chest.clone().addScaledVector(side, R(.07)).addScaledVector(up, R(.045)).addScaledVector(fwd, R(.072)), [.076, .044, .022], .03);
      cone(neckBase, shoulder.clone().addScaledVector(up, R(.012)), .048, .04, .045);
      ell(shoulder.clone().addScaledVector(side, R(.012)).addScaledVector(up, R(.005)), [.06, .062, .058], .035);
      cone(shoulder, elbow, .047, .037, .03);
      ell(lerp(shoulder, elbow, .42), [.046, .046, .046], .045);
      cone(elbow, wrist, .04, .026, .025);
      ell(lerp(elbow, wrist, .22), [.043, .043, .043], .035);
      const dir = wrist.clone().sub(elbow).normalize(), lat = new Vector3().crossVectors(dir, Math.abs(dir.y) > .9 ? fwd : up).normalize(), nrm = new Vector3().crossVectors(lat, dir);
      ell(wrist.clone().addScaledVector(dir, R(.075)), [.044, .078, .02], .02, [lat, dir, nrm]);
      cone(wrist.clone().addScaledVector(dir, R(.02)).addScaledVector(lat, R(.03 * s)), wrist.clone().addScaledVector(dir, R(.075)).addScaledVector(lat, R(.052 * s)), .014, .011, .018);
    }
  }
  if (part !== "upper") {
    ell(hip.clone().addScaledVector(up, R(.045)), [hipHalf / m * 1.18, .085, .085], .05);
    for (const s of [-1, 1]) {
      const h = s < 0 ? J[11] : J[12], knee = s < 0 ? J[13] : J[14], ankle = s < 0 ? J[15] : J[16], heel = s < 0 ? J[17] : J[19], toe = s < 0 ? J[18] : J[20];
      ell(h.clone().addScaledVector(fwd, R(-.04)).addScaledVector(up, R(.005)), [.056, .056, .042], .035);
      cone(h.clone().add(new Vector3(0, R(-.03), 0)), knee, .064, .046, .035);
      ell(lerp(h, knee, .42).addScaledVector(fwd, R(.01)), [.058, .11, .06], .04);
      ell(knee, [.05, .052, .05], .03);
      cone(knee, ankle, .05, .029, .03);
      ell(lerp(knee, ankle, .3).addScaledVector(fwd, R(-.02)), [.05, .09, .055], .04);
      ell(ankle, [.033, .03, .033], .02);
      const dir = toe.clone().sub(heel), len = dir.length(); dir.normalize();
      const lat = new Vector3().crossVectors(up, dir).normalize(), nrm = new Vector3().crossVectors(dir, lat);
      ell(lerp(heel, toe, .5).addScaledVector(up, R(.012)), [.044, .03, len / m * .62], .025, [lat, nrm, dir]);
    }
  }
  return P;
}

type Boxed = Prim & { lo: number[]; hi: number[] };
function withBoxes(P: Prim[]): Boxed[] {
  return P.map(p => {
    if (p.t === "cone") { const r = Math.max(p.r1, p.r2); return { ...p, lo: [0, 1, 2].map(i => Math.min(p.a[i], p.b[i]) - r), hi: [0, 1, 2].map(i => Math.max(p.a[i], p.b[i]) + r) }; }
    const r = Math.max(...p.r); return { ...p, lo: p.c.map(c => c - r), hi: p.c.map(c => c + r) };
  });
}
/** Smooth union with box culling: a primitive farther than (current distance + blend) cannot change the result. */
function sdf(P: Boxed[], x: number, y: number, z: number) {
  let d = 1e9;
  for (const p of P) {
    const bx = Math.max(p.lo[0] - x, 0, x - p.hi[0]), by = Math.max(p.lo[1] - y, 0, y - p.hi[1]), bz = Math.max(p.lo[2] - z, 0, z - p.hi[2]);
    const box = Math.sqrt(bx * bx + by * by + bz * bz);
    if (box > d + p.k) continue;
    const di = p.t === "cone" ? sdCone(x, y, z, p) : sdEll(x, y, z, p as Extract<Prim, { t: "ell" }>);
    d = d > 1e8 ? di : smin(d, di, p.k);
  }
  return d;
}

export type BodySurface = { geometry: BufferGeometry; points: Float32Array; bounds: { min: Vector3; max: Vector3 } };
/** Polygonise the body. clip: keep y within [below, above] (same units as J). */
export function buildBodySurface(J: Vector3[], m: number, part: BodyPart, clip: { below?: number; above?: number } = {}, res = 72): BodySurface {
  const it = bodySurfaceSteps(J, m, part, clip, res); let r = it.next();
  while (!r.done) r = it.next();
  return r.value;
}
/** Same build, time-sliced: resolves after yielding to the event loop every ~8ms (no long tasks). */
export async function buildBodySurfaceAsync(J: Vector3[], m: number, part: BodyPart, clip: { below?: number; above?: number } = {}, res = 72): Promise<BodySurface> {
  const it = bodySurfaceSteps(J, m, part, clip, res); let t0 = performance.now(), r = it.next();
  while (!r.done) { if (performance.now() - t0 > 8) { await new Promise(done => setTimeout(done, 0)); t0 = performance.now(); } r = it.next(); }
  return r.value;
}
function* bodySurfaceSteps(J: Vector3[], m: number, part: BodyPart, clip: { below?: number; above?: number }, res: number): Generator<void, BodySurface> {
  const P = withBoxes(bodyPrimitives(J, m, part));
  const min = new Vector3(Infinity, Infinity, Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity);
  const use = part === "upper" ? J.slice(0, 13) : part === "lower" ? J.slice(11) : J;
  use.forEach(p => { min.min(p); max.max(p); });
  min.addScalar(-.16 * m); max.addScalar(.16 * m);
  if (clip.below !== undefined) min.y = Math.max(min.y, clip.below - .04 * m);
  if (clip.above !== undefined) max.y = Math.min(max.y, clip.above + .04 * m);
  const mc = new MarchingCubes(res, new MeshBasicMaterial(), false, false, 120000);
  mc.isolation = 0;
  const c = min.clone().add(max).multiplyScalar(.5), half = max.clone().sub(min).multiplyScalar(.5);
  const field = mc.field, size = res, hs = size / 2;
  const at = (xi: number, yi: number, zi: number) => {
    const x = c.x + (xi - hs) / hs * half.x, y = c.y + (yi - hs) / hs * half.y, z = c.z + (zi - hs) / hs * half.z;
    let d = sdf(P, x, y, z);
    if (clip.below !== undefined) d = Math.max(d, clip.below - y);
    if (clip.above !== undefined) d = Math.max(d, y - clip.above);
    return d;
  };
  // Coarse pass every 4 cells; exact evaluation only within a band around the surface.
  const S = 4, cs = Math.ceil(size / S) + 1, coarse = new Float32Array(cs * cs * cs);
  for (let z = 0; z < cs; z++) { for (let y = 0; y < cs; y++) for (let x = 0; x < cs; x++) coarse[(z * cs + y) * cs + x] = at(x * S, y * S, z * S); yield; }
  const band = Math.max(half.x, half.y, half.z) / hs * S * 1.9;
  for (let zi = 0; zi < size; zi++) { if (zi % 2 === 0) yield; for (let yi = 0; yi < size; yi++) for (let xi = 0; xi < size; xi++) {
    const edge = xi === 0 || yi === 0 || zi === 0 || xi >= size - 2 || yi >= size - 2 || zi >= size - 2;
    let d: number;
    if (edge) d = 1;
    else {
      const dc = coarse[((Math.round(zi / S)) * cs + Math.round(yi / S)) * cs + Math.round(xi / S)];
      d = Math.abs(dc) > band ? dc : at(xi, yi, zi);
    }
    field[zi * size * size + yi * size + xi] = -d;
  } }
  mc.update();
  const n = mc.count, pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = c.x + mc.positionArray[i * 3] * half.x; pos[i * 3 + 1] = c.y + mc.positionArray[i * 3 + 1] * half.y; pos[i * 3 + 2] = c.z + mc.positionArray[i * 3 + 2] * half.z;
    const nx = mc.normalArray[i * 3] / half.x, ny = mc.normalArray[i * 3 + 1] / half.y, nz = mc.normalArray[i * 3 + 2] / half.z, l = Math.hypot(nx, ny, nz) || 1;
    nor[i * 3] = nx / l; nor[i * 3 + 1] = ny / l; nor[i * 3 + 2] = nz / l;
  }
  mc.geometry.dispose(); (mc.material as MeshBasicMaterial).dispose();
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(pos, 3));
  geometry.setAttribute("normal", new BufferAttribute(nor, 3));
  geometry.computeBoundingSphere();
  // Even-ish surface sample for point clouds (every few vertices, de-duplicated by stride).
  const stride = Math.max(1, Math.floor(n / 4200)), points = new Float32Array(Math.ceil(n / stride) * 3);
  for (let i = 0, j = 0; i < n; i += stride, j++) { points[j * 3] = pos[i * 3]; points[j * 3 + 1] = pos[i * 3 + 1]; points[j * 3 + 2] = pos[i * 3 + 2]; }
  return { geometry, points, bounds: { min, max } };
}
