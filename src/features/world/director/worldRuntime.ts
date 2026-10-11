import { resolveWorldItinerary, worldSegments } from "../itinerary/worldItinerary";
import { districtRegistry } from "../registry/districtRegistry";
import { evaluateWorld, positionForSegment } from "./evaluateWorld";
import { adaptArmiRuntime, armiRuntimeProfile, armiProductionProfile } from "../adapters/armiRuntime";
import type { TraversalDirection, WorldDirectorState, WorldRenderMode } from "../types/contracts";
import type { ArmiProductionAsset } from "../adapters/armiV015";
import { hangaraeRuntimeProfile } from "../adapters/hangaraeAnimatic";

// A projection of published metadata onto currently mounted DOM bindings.
// ARMI compatibility and the Hangarae animatic are mounted DOM districts.
const armiItinerary = resolveWorldItinerary(worldSegments.filter(segment => segment.segmentId === "armi"));
// Transit reserves traversal units only; it does not invent a DOM scroll track.
export const adoptedWorldItinerary = resolveWorldItinerary(worldSegments.filter(segment => ["armi", "armi-to-hangarae", "hangarae"].includes(segment.segmentId)));
export function worldPositionForDomProgress(segmentId: string, localProgress: number) {
  return positionForSegment(adoptedWorldItinerary, segmentId, localProgress);
}
/** Pure DOM range adapter for direct navigation/refresh; no event history. */
export function worldPositionForScroll(scroll: number, start: number, end: number, segmentId = "armi") {
  if (![scroll, start, end].every(Number.isFinite) || end <= start) throw new Error("Invalid mounted DOM range");
  return worldPositionForDomProgress(segmentId, (scroll - start) / (end - start));
}
export function evaluateRuntime(position: number, direction: TraversalDirection, renderMode: WorldRenderMode) {
  // Keep the exact ARMI endpoint at 4 owned by ARMI, as in the adopted V1 path.
  return evaluateWorld({ position, direction, renderMode }, position <= 4 ? armiItinerary : adoptedWorldItinerary, districtRegistry, [renderMode === "webgl" ? armiProductionProfile : armiRuntimeProfile, hangaraeRuntimeProfile]);
}
export function createWorldRuntime() {
  const progress = { current: 0 }; // Explicit ARMI-local legacy clock; never World-normalized.
  const hangaraeProgress = { current: 0 };
  const state = { current: evaluateRuntime(0, "stationary", "static") };
  const listeners = new Set<() => void>();
  const semanticListeners = new Set<() => void>();
  let position = 0;
  return {
    progress, state,
    hangaraeProgress,
    hangaraeViewport: { current: null as HTMLElement | null },
    armiAsset: { current: null as ArmiProductionAsset | null },
    armiReview: { current: null as string | null },
    subscribeFrame(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    subscribeSemantic(listener: () => void) { semanticListeners.add(listener); return () => { semanticListeners.delete(listener); }; },
    publish(nextPosition: number, renderMode: WorldRenderMode) {
      const direction = nextPosition > position ? "forward" : nextPosition < position ? "reverse" : "stationary";
      position = nextPosition;
      const previous = state.current;
      const next = evaluateRuntime(position, direction, renderMode);
      state.current = next;
      if (next.districtId === "armi") progress.current = adaptArmiRuntime(next).legacyJourneyProgress;
      if (next.districtId === "hangarae") hangaraeProgress.current = next.localProgress;
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
