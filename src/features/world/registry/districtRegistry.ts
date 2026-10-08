import type { DistrictDefinition } from "../types/contracts";

function district(
  districtId: string,
  tier: DistrictDefinition["tier"],
  projectId?: string,
  parentDistrictId?: string,
): DistrictDefinition {
  return {
    districtId, projectId, tier, parentDistrictId,
    visitorRoleId: `${districtId}/visitor`,
    landmarkId: `${districtId}/landmark`,
    lookdevProfileId: `${districtId}/lookdev`,
    sceneModuleId: `${districtId}/scene`,
    assetManifestId: `${districtId}/assets`,
    shotProfileId: `${districtId}/shots`,
    publishState: "published",
    fallbackMode: "static",
  };
}

// Published registry metadata describes the exhibition; scene references are reserved.
export const districtRegistry: readonly DistrictDefinition[] = [
  district("armi", "flagship", "armi"),
  district("hangarae", "flagship", "hangarae"),
  district("wedding", "flagship", "wedding"),
  district("experimental-wing", "wing"),
  district("digital-docent", "installation", "digital-docent", "experimental-wing"),
  district("bcos", "installation", "bcos", "experimental-wing"),
  district("crime-scene", "installation", "crime-scene", "experimental-wing"),
];
