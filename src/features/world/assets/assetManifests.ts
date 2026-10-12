import { productEvidence } from "@/components/sections/ImmersiveProjectFlow/armiJourney/experienceData";
import { districtRegistry } from "../registry/districtRegistry";
import type { DistrictAssetManifest, WorldAsset } from "../types/contracts";
const webp = (src: string) => src.replace(/\.png$/, ".webp"); // WebP twins of the frozen evidence paths

const armiAssets: readonly WorldAsset[] = [
  { assetId: "armi/routing-v015", type: "model", url: "/models/armi/v015/ARMI_v015_Web_Clean.glb", districtId: "armi", preloadPriority: "adjacent", fallbackAssetId: "armi/tablet-poster", lifecyclePolicy: { retain: "session", eviction: "explicit" } },
  { assetId: "armi/tablet-poster", type: "image", url: webp(productEvidence.poster), districtId: "armi", preloadPriority: "critical", lifecyclePolicy: { retain: "adjacent", eviction: "when-unreferenced" } },
  { assetId: "armi/tablet-return-poster", type: "image", url: webp(productEvidence.returnPoster), districtId: "armi", preloadPriority: "adjacent", fallbackAssetId: "armi/tablet-poster", lifecyclePolicy: { retain: "adjacent", eviction: "when-unreferenced" } },
  { assetId: "armi/tablet-video", type: "video", url: productEvidence.video, districtId: "armi", preloadPriority: "on-demand", fallbackAssetId: "armi/tablet-poster", lifecyclePolicy: { retain: "active-only", eviction: "when-unreferenced" } },
];

// Empty planned manifests reserve ownership; they do not invent assets or loaders.
export const districtAssetManifests: readonly DistrictAssetManifest[] = districtRegistry.map((district) => ({
  manifestId: district.assetManifestId, districtId: district.districtId,
  publishState: district.districtId === "armi" ? "published" : "planned", assets: district.districtId === "armi" ? armiAssets : [],
}));
