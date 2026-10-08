import type { DistrictAssetManifest, DistrictDefinition, DistrictShotProfile, ProjectCatalogEntry, WorldSegment } from "../types/contracts";
import { resolveWorldItinerary } from "../itinerary/worldItinerary";
import { validateShotProfile } from "../director/shotProfiles";

function unique<T>(entries: readonly T[], id: (entry: T) => string, label: string): Map<string, T> {
  const result = new Map<string, T>();
  for (const entry of entries) {
    const key = id(entry);
    if (!key || result.has(key)) throw new Error(`Duplicate/empty ${label} ID: ${key}`);
    result.set(key, entry);
  }
  return result;
}

/** Authoring-time graph integrity checks. No loaders, renderer or mutable global state. */
export function validateWorldFoundation(
  catalog: readonly ProjectCatalogEntry[],
  registry: readonly DistrictDefinition[],
  segments: readonly WorldSegment[],
  profiles: readonly DistrictShotProfile[],
  manifests: readonly DistrictAssetManifest[],
): void {
  const projects = unique(catalog, (entry) => entry.projectId, "project");
  const districts = unique(registry, (entry) => entry.districtId, "district");
  const shotProfiles = unique(profiles, (entry) => entry.profileId, "shot profile");
  const assetManifests = unique(manifests, (entry) => entry.manifestId, "asset manifest");
  const assets = unique(manifests.flatMap((entry) => [...entry.assets]), (entry) => entry.assetId, "asset");
  const itinerary = resolveWorldItinerary(segments);
  for (const district of registry) {
    if (district.projectId && !projects.has(district.projectId)) throw new Error(`Unknown project: ${district.projectId}`);
    const parent = district.parentDistrictId ? districts.get(district.parentDistrictId) : undefined;
    if (district.parentDistrictId && !parent) throw new Error(`Unknown parent district: ${district.parentDistrictId}`);
    if (district.tier === "installation" && parent?.tier !== "wing") throw new Error(`Installation needs wing parent: ${district.districtId}`);
    const ancestors = new Set([district.districtId]);
    let ancestor = parent;
    while (ancestor) {
      if (ancestors.has(ancestor.districtId)) throw new Error(`District parent cycle: ${district.districtId}`);
      ancestors.add(ancestor.districtId);
      ancestor = ancestor.parentDistrictId ? districts.get(ancestor.parentDistrictId) : undefined;
    }
    const profile = shotProfiles.get(district.shotProfileId);
    const manifest = assetManifests.get(district.assetManifestId);
    if (!profile || profile.districtId !== district.districtId) throw new Error(`Missing/mismatched shot profile: ${district.shotProfileId}`);
    if (!manifest || manifest.districtId !== district.districtId) throw new Error(`Missing/mismatched asset manifest: ${district.assetManifestId}`);
  }
  for (const segment of itinerary.segments) {
    if (!segment.districtId) continue;
    const district = districts.get(segment.districtId);
    if (!district || district.publishState !== "published") throw new Error(`Unpublished/unknown itinerary district: ${segment.districtId}`);
    if (district.projectId && projects.get(district.projectId)?.worldParticipation === "excluded") {
      throw new Error(`Excluded project in exhibition: ${district.projectId}`);
    }
    if ((segment.kind === "wing") !== (district.tier === "wing")) throw new Error(`Segment/district tier mismatch: ${segment.segmentId}`);
  }
  for (const profile of profiles) {
    if (!districts.has(profile.districtId)) throw new Error(`Unknown shot owner: ${profile.districtId}`);
    validateShotProfile(profile);
    for (const shot of profile.shots) {
      for (const assetId of shot.requiredAssetIds) {
        if (assets.get(assetId)?.districtId !== profile.districtId) throw new Error(`Unknown/foreign shot asset: ${assetId}`);
      }
    }
  }
  for (const manifest of manifests) {
    if (!districts.has(manifest.districtId)) throw new Error(`Unknown manifest owner: ${manifest.districtId}`);
    for (const asset of manifest.assets) {
      if (asset.districtId !== manifest.districtId || !asset.url) throw new Error(`Invalid asset ownership/path: ${asset.assetId}`);
      const seen = new Set([asset.assetId]);
      let next = asset.fallbackAssetId;
      while (next) {
        const fallback = assets.get(next);
        if (!fallback || fallback.districtId !== asset.districtId) throw new Error(`Unknown/foreign fallback asset: ${next}`);
        if (seen.has(next)) throw new Error(`Asset fallback cycle: ${asset.assetId}`);
        seen.add(next);
        next = fallback.fallbackAssetId;
      }
    }
  }
}
