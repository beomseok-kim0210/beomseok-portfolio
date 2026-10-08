import type { DistrictDefinition, DistrictShotProfile, TraversalDirection, WorldDirectorState, WorldItinerary, WorldRenderMode } from "../types/contracts";
import { validateShotProfile } from "./shotProfiles";

export interface WorldEvaluationInput {
  /** Absolute traversal weight units. A future DOM adapter supplies this position. */
  readonly position: number;
  /** Direction is descriptive; it never changes segment or shot selection. */
  readonly direction: TraversalDirection;
  readonly renderMode: WorldRenderMode;
}

export function evaluateWorld(
  input: WorldEvaluationInput,
  itinerary: WorldItinerary,
  registry: readonly DistrictDefinition[],
  profiles: readonly DistrictShotProfile[],
): WorldDirectorState {
  if (!Number.isFinite(input.position)) throw new Error("World position must be finite");
  if (!itinerary.segments.length || !Number.isFinite(itinerary.totalWeight) || itinerary.totalWeight <= 0) {
    throw new Error("World itinerary must be resolved and nonempty");
  }
  const position = Math.max(0, Math.min(itinerary.totalWeight, input.position));
  // Half-open intervals: an exact seam belongs to the next segment in either direction.
  const segment = itinerary.segments.find((entry) => position < entry.endPosition)
    ?? itinerary.segments[itinerary.segments.length - 1];
  const localProgress = Math.max(0, Math.min(1, (position - segment.startPosition) / segment.scrollWeight));
  let shotId: string | null = null;
  let shotProgress: number | null = null;
  if (segment.districtId) {
    const district = registry.find((entry) => entry.districtId === segment.districtId);
    if (!district) throw new Error(`Unknown district: ${segment.districtId}`);
    const profile = profiles.find((entry) => entry.profileId === district.shotProfileId);
    if (!profile || profile.districtId !== district.districtId) throw new Error(`Missing/mismatched shot profile: ${district.shotProfileId}`);
    validateShotProfile(profile);
    // Compare seams in the same absolute units as positionForSegment. Subtracting
    // a segment offset first can round an exact shot seam into the preceding shot.
    const shot = profile.shots.find((entry) => position < segment.startPosition + entry.localEnd * segment.scrollWeight)
      ?? profile.shots[profile.shots.length - 1];
    shotId = shot.shotId;
    const shotStart = segment.startPosition + shot.localStart * segment.scrollWeight;
    const shotEnd = segment.startPosition + shot.localEnd * segment.scrollWeight;
    if (shotEnd <= shotStart) throw new Error("Shot span is below traversal position precision");
    shotProgress = Math.max(0, Math.min(1, (position - shotStart) / (shotEnd - shotStart)));
  }
  return {
    segmentId: segment.segmentId, districtId: segment.districtId ?? null,
    localProgress, shotId, shotProgress, direction: input.direction, renderMode: input.renderMode,
  };
}

/** Direct navigation uses segment identity and its own local progress, never a global ratio. */
export function positionForSegment(itinerary: WorldItinerary, segmentId: string, localProgress = 0): number {
  if (!Number.isFinite(localProgress)) throw new Error("Segment progress must be finite");
  const segment = itinerary.segments.find((entry) => entry.segmentId === segmentId);
  if (!segment) throw new Error(`Unknown published segment: ${segmentId}`);
  return segment.startPosition + Math.max(0, Math.min(1, localProgress)) * segment.scrollWeight;
}
