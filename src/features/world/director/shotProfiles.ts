import type { DistrictShotProfile, DistrictShot } from "../types/contracts";
import { districtRegistry } from "../registry/districtRegistry";

export function validateShotProfile(profile: DistrictShotProfile): void {
  const ids = new Set<string>();
  let end = 0;
  if (!profile.shots.length) throw new Error(`Empty shot profile: ${profile.profileId}`);
  for (const shot of profile.shots) {
    if (!shot.shotId || ids.has(shot.shotId)) throw new Error(`Duplicate/empty shot ID: ${shot.shotId}`);
    ids.add(shot.shotId);
    if (!Number.isFinite(shot.localStart) || !Number.isFinite(shot.localEnd)
      || shot.localStart !== end || shot.localEnd <= shot.localStart || shot.localEnd > 1) {
      throw new Error(`Shots must partition district-local [0,1]: ${profile.profileId}/${shot.shotId}`);
    }
    end = shot.localEnd;
  }
  if (end !== 1) throw new Error(`Incomplete shot profile: ${profile.profileId}`);
}

/** Provisional equal spans for contract evaluation, NOT a V1 timing migration. */
function plannedProfile(districtId: string, shotIds: readonly string[]): DistrictShotProfile {
  return {
    profileId: `${districtId}/shots`, districtId, publishState: "planned",
    shots: shotIds.map((shotId, index): DistrictShot => ({
      shotId, localStart: index / shotIds.length, localEnd: (index + 1) / shotIds.length,
      desktopCameraProfileId: `${districtId}/${shotId}/camera-desktop`,
      mobileCameraProfileId: `${districtId}/${shotId}/camera-mobile`,
      narrativeReferenceId: `${districtId}/${shotId}/narrative`,
      requiredAssetIds: districtId === "armi" && ["entry", "voice", "tablet-approach", "portal", "exit"].includes(shotId)
        ? ["armi/tablet-video", shotId === "exit" ? "armi/tablet-return-poster" : "armi/tablet-poster"] : [],
      reducedMotion: districtId === "armi" && ["entry", "exit"].includes(shotId) ? "product-media" : "still",
    })),
  };
}

export const armiFoundationShotIds = ["entry", "voice", "tablet-approach", "portal", "routing-reveal", "observe-decision", "exit"] as const;
export const districtShotProfiles: readonly DistrictShotProfile[] = districtRegistry.map((district) =>
  plannedProfile(district.districtId, district.districtId === "armi" ? armiFoundationShotIds : ["overview"]),
);
