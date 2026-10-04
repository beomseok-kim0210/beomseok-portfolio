import { CatmullRomCurve3, Vector3 } from "three";

/** Spatial art direction only. Coordinates are not ARMI telemetry. */
const curve = (points: number[][]) => new CatmullRomCurve3(points.map(p => new Vector3(...p as [number, number, number])), false, "centripetal");
export const cameraPath = curve([
  [0, .6, 12], [-.5, .4, 10.5], [-.9, .1, 8],
  [-.5, -.25, 5], [.1, -.35, 2.5], [.3, -.4, .8],
  [.25, -.4, -.6], [-.4, -.35, -3.2], [-1.4, .15, -7],
]);
export const lookPath = curve([
  [1.6, .25, 0], [1.2, .1, -.3], [.9, -.1, -.5],
  [.45, -.6, -.8], [.3, -.4, -1.5], [.2, -.4, -2.7],
  [-.3, -.5, -5], [-1.2, .1, -8], [-1.5, .2, -12],
]);
export const requestPath = curve([
  [-3.5, -.8, 7.5], [-2.5, -.3, 5.5], [-.6, -.55, 2.2],
  [.28, -.95, .25], [.2, -.8, -1.4], [-.5, -.3, -4], [-1.4, .2, -9],
]);
export function travelProgress(progress: number) {
  // Stay with the voice before approach; cross the surface only during ENTER.
  const smooth = (a: number, b: number) => {
    const t = Math.max(0, Math.min(1, (progress-a)/(b-a)));
    return t*t*(3-2*t);
  };
  if (progress < .4) return .12 * smooth(.12,.4);
  if (progress < .7) return .12 + .45 * smooth(.4,.7);
  return .57 + .43 * smooth(.7,1);
}
