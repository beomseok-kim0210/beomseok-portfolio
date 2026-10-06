import { productEvidence } from "@/components/sections/ImmersiveProjectFlow/armiJourney/experienceData";
import { districtRegistry } from "../registry/districtRegistry";
import type { DistrictAssetManifest, WorldAsset } from "../types/contracts";

const armiAssets: readonly WorldAsset[] = [
  { assetId: "armi/tablet-poster", type: "image", url: productEvidence.poster, districtId: "armi", preloadPriority: "critical", lifecyclePolicy: { retain: "adjacent", eviction: "when-unreferenced" } },
  { assetId: "armi/tablet-return-poster", type: "image", url: productEvidence.returnPoster, districtId: "armi", preloadPriority: "adjacent", fallbackAssetId: "armi/tablet-poster", lifecyclePolicy: { retain: "adjacent", eviction: "when-unreferenced" } },
  { assetId: "armi/tablet-video", type: "video", url: productEvidence.video, districtId: "armi", preloadPriority: "on-demand", fallbackAssetId: "armi/tablet-poster", lifecyclePolicy: { retain: "active-only", eviction: "when-unreferenced" } },
];

// Empty planned manifests reserve ownership; they do not invent assets or loaders.
export const districtAssetManifests: readonly DistrictAssetManifest[] = districtRegistry.map((district) => ({
  manifestId: district.assetManifestId, districtId: district.districtId,
  publishState: "planned", assets: district.districtId === "armi" ? armiAssets : [],
}));
