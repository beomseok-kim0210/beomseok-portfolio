import { phase, smooth } from "./geometry";

// Viewport units: Hero .35, reading .65, handoff .9, settled arrival .25.
// Geometry never resumes an old Hero window after the Brief.
export function briefTimeline(raw: number) {
  const distance = Math.max(0, Math.min(1, raw)) * 2.15;
  const transition = phase(distance, 1, 1.9);
  const briefActive = distance >= .35 && transition < .4;
  return {
    progress: distance < .35 ? .18 * distance / .35 : .18 + .82 * smooth(phase(transition, .05, .92)),
    briefActive,
    transition,
    heroActive: distance < .35,
  };
}
