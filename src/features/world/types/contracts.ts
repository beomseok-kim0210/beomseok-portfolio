import type { ProjectDetail, Project } from "@/types/portfolio";

// IDs remain open strings so future exhibitions do not require editing a global union.
export type ProjectId = string;
export type DistrictId = string;
export type SegmentId = string;
export type ShotId = string;
export type PublishState = "published" | "planned" | "hidden";
export type WorldRenderMode = "webgl" | "static" | "reduced-motion" | "fallback";
export type TraversalDirection = "forward" | "reverse" | "stationary";

export interface ProjectCatalogEntry {
  readonly projectId: ProjectId;
  readonly routeSlug: string;
  readonly href: string;
  readonly title: string;
  readonly category: string;
  readonly projectType: "solo" | "team";
  readonly dataReference: { readonly sourceId: string; readonly key: string };
  readonly summaryReference?: { readonly sourceId: string; readonly key: Project["key"] };
  readonly mediaReference?: Readonly<ProjectDetail["media"]>;
  readonly worldParticipation: "main" | "experimental" | "excluded";
}

export interface DistrictDefinition {
  readonly districtId: DistrictId;
  readonly projectId?: ProjectId;
  readonly tier: "flagship" | "wing" | "installation";
  readonly parentDistrictId?: DistrictId;
  readonly visitorRoleId: string;
  readonly landmarkId: string;
  readonly lookdevProfileId: string;
  // Reserved identifiers, NOT imports or promises that scenes already exist.
  readonly sceneModuleId: string;
  readonly assetManifestId: string;
  readonly shotProfileId: string;
  readonly publishState: PublishState;
  readonly fallbackMode: Exclude<WorldRenderMode, "webgl">;
}

export type SegmentKind = "arrival" | "spine" | "district" | "transit" | "wing" | "exit" | "contact";
export interface WorldSegment {
  readonly segmentId: SegmentId;
  readonly kind: SegmentKind;
  readonly districtId?: DistrictId;
  /** Positive local traversal weight; never a global normalized range. */
  readonly scrollWeight: number;
  readonly anchor: string;
  readonly publishState: PublishState;
}
export interface ResolvedSegment extends WorldSegment {
  readonly previousSegmentId: SegmentId | null;
  readonly nextSegmentId: SegmentId | null;
  readonly preloadAdjacentSegmentIds: readonly SegmentId[];
  /** Derived traversal units, not project choreography. */
  readonly startPosition: number;
  readonly endPosition: number;
}
export interface WorldItinerary {
  readonly segments: readonly ResolvedSegment[];
  readonly totalWeight: number;
}

export interface DistrictShot {
  readonly shotId: ShotId;
  /** Normalized ONLY within this district's shot profile. */
  readonly localStart: number;
  readonly localEnd: number;
  readonly desktopCameraProfileId: string;
  readonly mobileCameraProfileId: string;
  readonly narrativeReferenceId: string;
  readonly interactionReferenceId?: string;
  readonly requiredAssetIds: readonly string[];
  readonly lookdevProfileId?: string;
  readonly reducedMotion: "still" | "product-media" | "skip-motion";
}
export interface DistrictShotProfile {
  readonly profileId: string;
  readonly districtId: DistrictId;
  /** Planned means provisional authoring data, not live choreography. */
  readonly publishState: PublishState;
  readonly shots: readonly DistrictShot[];
}
export interface WorldDirectorState {
  readonly segmentId: SegmentId;
  readonly districtId: DistrictId | null;
  readonly localProgress: number;
  readonly shotId: ShotId | null;
  readonly shotProgress: number | null;
  readonly direction: TraversalDirection;
  readonly renderMode: WorldRenderMode;
}

export type AssetLifecycleState = "unloaded" | "loading" | "ready" | "active" | "retained" | "evicted" | "error";
export interface WorldAsset {
  readonly assetId: string;
  readonly type: "image" | "video" | "model" | "texture" | "audio";
  readonly url: string;
  readonly districtId: DistrictId;
  readonly preloadPriority: "critical" | "adjacent" | "on-demand";
  readonly variants?: { readonly desktop?: string; readonly mobile?: string };
  readonly fallbackAssetId?: string;
  readonly lifecyclePolicy: {
    readonly retain: "active-only" | "adjacent" | "session";
    readonly eviction: "when-unreferenced" | "explicit";
  };
}
export interface DistrictAssetManifest {
  readonly manifestId: string;
  readonly districtId: DistrictId;
  readonly publishState: PublishState;
  readonly assets: readonly WorldAsset[];
}
