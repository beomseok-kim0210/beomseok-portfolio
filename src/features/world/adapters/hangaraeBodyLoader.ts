import { BufferGeometry, Vector3 } from "three";
import { buildBodySurfaceAsync, type BodyPart } from "./hangaraeBody";
import { hgBasePose, hgLowerRig, hgUpperRig } from "./hangaraeAnimatic";

export type BodyAsset = { geometry: BufferGeometry; points: Float32Array };
type Spec = { joints: Vector3[]; m: number; part: BodyPart; clip?: { below?: number; above?: number } };
const cache = new Map<string, Promise<BodyAsset>>();
let queue: Promise<unknown> = Promise.resolve();

/** Polygonise a body once per key; builds run one after another, time-sliced on the main thread. */
export function loadBody(key: string, spec: Spec): Promise<BodyAsset> {
  const hit = cache.get(key); if (hit) return hit;
  const promise = queue.then(() => buildBodySurfaceAsync(spec.joints, spec.m, spec.part, spec.clip)).then(s => ({ geometry: s.geometry, points: s.points }));
  queue = promise.catch(() => undefined);
  cache.set(key, promise);
  return promise;
}

/** Shared body specs so the DOM layer can start polygonising before the 3D scene mounts. */
export function hangaraeBodySpecs(compact: boolean) {
  const J = (rig: [number, number, number][]) => rig.map(([x, y, z]) => new Vector3(x, y, z)), deep = hgBasePose(compact, 1);
  return {
    upper: { key: "upper", spec: { joints: J(hgUpperRig), m: 1, part: "upper" as const, clip: { below: .93 } } },
    lower: { key: "lower", spec: { joints: J(hgLowerRig), m: 1, part: "lower" as const, clip: { above: 1.07 } } },
    hero: { key: "hero", spec: { joints: J(hgLowerRig), m: 1, part: "full" as const } },
    base: { key: `base-${compact}`, spec: { joints: deep, m: deep[5].distanceTo(deep[6]) / .38, part: "full" as const } },
  };
}
export function prewarmHangaraeBodies(compact: boolean) {
  const s = hangaraeBodySpecs(compact);
  for (const k of ["hero", "upper", "lower", "base"] as const) void loadBody(s[k].key, s[k].spec);
}
