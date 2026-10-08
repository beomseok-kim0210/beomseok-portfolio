import { routingAnchors } from "./armiRouting";

/** Editorial coordinates, never sensor values or a model keypoint schema. */
export type Point = readonly [number, number];
export type TransitionPoint = {
  id: string;
  armiPosition: Point;
  neutralPosition: Point;
  poseTarget: Point;
};

// Preserve the EXISTING illustrative pose in HomeShowcase/SystemVisuals.tsx.
// The repo documents 18 model keypoints but does not provide their schema.
// Do not add invented anatomical joints to reach that count.
const illustrativePose: readonly Point[] = [
  [50, 15], [50, 27], [38, 34], [31, 49], [26, 65],
  [62, 34], [69, 49], [74, 65], [43, 55], [41, 73],
  [39, 91], [57, 55], [59, 73], [61, 91],
];
export const illustrativeBones = [
  [0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [5, 6], [6, 7],
  [1, 8], [8, 9], [9, 10], [1, 11], [11, 12], [12, 13], [8, 11],
] as const;

// Identity belongs to the transition geometry, not VOICE/Redis/etc.
export const transitionPoints: readonly TransitionPoint[] = illustrativePose.map((point, i) => ({
  id: `transition-${i}`,
  armiPosition: routingAnchors[i],
  neutralPosition: [670 + (i % 5) * 108 + Math.floor(i / 5) * 34, 240 + Math.floor(i / 5) * 140 + (i % 2) * 36],
  poseTarget: [910 + (point[0] - 50) * 6.3, 110 + point[1] * 5.6],
}));

export const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const phase = (p: number, start: number, end: number) => clamp((p - start) / (end - start));
export const smooth = (n: number) => n * n * (3 - 2 * n);
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
export const mixPoint = (a: Point, b: Point, p: number): Point => [lerp(a[0], b[0], p), lerp(a[1], b[1], p)];

export function pointAt(point: TransitionPoint, progress: number, index: number): Point {
  const split = smooth(phase(progress, .2 + index * .004, .55 + index * .003));
  const align = smooth(phase(progress, .55 + index * .004, .75 + index * .004));
  const intermediate = mixPoint(point.armiPosition, point.neutralPosition, split);
  const result = mixPoint(intermediate, point.poseTarget, align);
  // A coherent curved path rather than random drift; endpoints remain exact.
  return [result[0], result[1] - Math.sin(split * Math.PI) * (38 + (index % 3) * 12) * (1 - align)];
}

export function mixColor(from: readonly number[], to: readonly number[], p: number) {
  return `rgb(${from.map((n, i) => Math.round(lerp(n, to[i], p))).join(',')})`;
}

export function stageColors(progress: number) {
  const light = smooth(phase(progress, .32, .82));
  const color = smooth(phase(progress, .35, .78));
  return {
    background: mixColor([6, 10, 12], [244, 242, 236], light),
    // Keep labels legible through the middle-gray field; blending foreground
    // and background together creates an illegible equal-luminance midpoint.
    ink: progress < .58 ? "#eff1e3" : "#181d28",
    muted: progress < .58 ? "#c0c9c7" : "#454e60",
    accent: color < .5
      ? mixColor([210, 240, 89], [176, 181, 175], color * 2)
      : mixColor([176, 181, 175], [65, 77, 207], (color - .5) * 2),
  };
}
