import { resolveWorldItinerary, worldSegments } from "../itinerary/worldItinerary";
import { districtRegistry } from "../registry/districtRegistry";
import { evaluateWorld, positionForSegment } from "./evaluateWorld";
import { adaptArmiRuntime, armiRuntimeProfile } from "../adapters/armiRuntime";
import type { TraversalDirection, WorldDirectorState, WorldRenderMode } from "../types/contracts";

// A projection of published metadata onto currently mounted DOM bindings.
// Only ARMI is adopted in 1B. Unbuilt districts have no synthetic scroll tracks.
export const adoptedWorldItinerary = resolveWorldItinerary(worldSegments.filter(segment => segment.segmentId === "armi"));
export function worldPositionForDomProgress(segmentId: string, localProgress: number) {
  return positionForSegment(adoptedWorldItinerary, segmentId, localProgress);
}
/** Pure DOM range adapter for direct navigation/refresh; no event history. */
export function worldPositionForScroll(scroll: number, start: number, end: number, segmentId = "armi") {
  if (![scroll, start, end].every(Number.isFinite) || end <= start) throw new Error("Invalid mounted DOM range");
  return worldPositionForDomProgress(segmentId, (scroll - start) / (end - start));
}
export function evaluateRuntime(position: number, direction: TraversalDirection, renderMode: WorldRenderMode) {
  return evaluateWorld({ position, direction, renderMode }, adoptedWorldItinerary, districtRegistry, [armiRuntimeProfile]);
}
export function createWorldRuntime() {
  const progress = { current: 0 }; // Explicit ARMI-local legacy clock; never World-normalized.
  const state = { current: evaluateRuntime(0, "stationary", "static") };
  const listeners = new Set<() => void>();
  const semanticListeners = new Set<() => void>();
  let position = 0;
  return {
    progress, state,
    subscribeFrame(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    subscribeSemantic(listener: () => void) { semanticListeners.add(listener); return () => { semanticListeners.delete(listener); }; },
    publish(nextPosition: number, renderMode: WorldRenderMode) {
      const direction = nextPosition > position ? "forward" : nextPosition < position ? "reverse" : "stationary";
      position = nextPosition;
      const previous = state.current;
      const next = evaluateRuntime(position, direction, renderMode);
      state.current = next;
      progress.current = adaptArmiRuntime(next).legacyJourneyProgress;
      if (semanticKey(previous) !== semanticKey(next)) semanticListeners.forEach(listener => listener());
      listeners.forEach(listener => listener());
      return next;
    },
  };
}
function semanticKey(state: WorldDirectorState) {
  return `${state.segmentId}/${state.districtId}/${state.shotId}/${state.renderMode}`;
}
export type WorldRuntime = ReturnType<typeof createWorldRuntime>;
