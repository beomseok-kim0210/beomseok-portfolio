import type { WorldSegment, WorldItinerary, ResolvedSegment } from "../types/contracts";

export const worldSegments: readonly WorldSegment[] = [
  { segmentId: "arrival", kind: "arrival", scrollWeight: 1, anchor: "#world-arrival", publishState: "published" },
  { segmentId: "world-spine", kind: "spine", scrollWeight: 1, anchor: "#world-spine", publishState: "published" },
  { segmentId: "armi", kind: "district", districtId: "armi", scrollWeight: 4, anchor: "#armi", publishState: "published" },
  { segmentId: "armi-to-hangarae", kind: "transit", scrollWeight: 1, anchor: "#armi-to-hangarae", publishState: "published" },
  { segmentId: "hangarae", kind: "district", districtId: "hangarae", scrollWeight: 3, anchor: "#hangarae", publishState: "published" },
  { segmentId: "hangarae-to-wedding", kind: "transit", scrollWeight: 1, anchor: "#hangarae-to-wedding", publishState: "published" },
  { segmentId: "wedding", kind: "district", districtId: "wedding", scrollWeight: 3, anchor: "#wedding", publishState: "published" },
  { segmentId: "wedding-to-wing", kind: "transit", scrollWeight: 1, anchor: "#wedding-to-wing", publishState: "published" },
  { segmentId: "experimental-wing", kind: "wing", districtId: "experimental-wing", scrollWeight: 1, anchor: "#experimental-wing", publishState: "published" },
  { segmentId: "digital-docent", kind: "district", districtId: "digital-docent", scrollWeight: 2, anchor: "#digital-docent", publishState: "published" },
  { segmentId: "bcos", kind: "district", districtId: "bcos", scrollWeight: 2, anchor: "#bcos", publishState: "published" },
  { segmentId: "crime-scene", kind: "district", districtId: "crime-scene", scrollWeight: 2, anchor: "#crime-scene", publishState: "published" },
  // Future projects are an extension point, not a fake project or district today.
  { segmentId: "future-projects", kind: "spine", scrollWeight: 1, anchor: "#future-projects", publishState: "planned" },
  { segmentId: "world-exit", kind: "exit", scrollWeight: 1, anchor: "#world-exit", publishState: "published" },
  { segmentId: "contact", kind: "contact", scrollWeight: 1, anchor: "#contact", publishState: "published" },
];

/** Derive links and cumulative traversal units after publication filtering. */
export function resolveWorldItinerary(entries: readonly WorldSegment[]): WorldItinerary {
  const ids = new Set<string>();
  for (const entry of entries) {
    if (!entry.segmentId || ids.has(entry.segmentId)) throw new Error(`Duplicate/empty segment ID: ${entry.segmentId}`);
    ids.add(entry.segmentId);
    if (!Number.isFinite(entry.scrollWeight) || entry.scrollWeight <= 0) throw new Error(`Invalid scroll weight: ${entry.segmentId}`);
    if ((entry.kind === "district" || entry.kind === "wing") && !entry.districtId) throw new Error(`Missing district ID: ${entry.segmentId}`);
  }
  const published = entries.filter((entry) => entry.publishState === "published");
  if (!published.length) throw new Error("World itinerary must contain a published segment");
  let cursor = 0;
  const segments: ResolvedSegment[] = published.map((entry, index) => {
    const previousSegmentId = published[index - 1]?.segmentId ?? null;
    const nextSegmentId = published[index + 1]?.segmentId ?? null;
    const startPosition = cursor;
    cursor += entry.scrollWeight;
    if (!Number.isFinite(cursor) || cursor <= startPosition) throw new Error("World itinerary weight overflow/precision loss");
    return {
      ...entry, previousSegmentId, nextSegmentId,
      preloadAdjacentSegmentIds: [previousSegmentId, nextSegmentId].filter((id): id is string => id !== null),
      startPosition, endPosition: cursor,
    };
  });
  return { segments, totalWeight: cursor };
}

export const worldItinerary = resolveWorldItinerary(worldSegments);
