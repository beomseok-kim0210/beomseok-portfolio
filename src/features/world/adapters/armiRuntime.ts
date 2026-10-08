import { Vector3 } from "three";
import { journeyFov, sampleJourney } from "@/components/sections/ImmersiveProjectFlow/armiJourney/goldenPaths";
import { ease, entryEnd, entryLocal, interval, journeyPhases } from "@/components/sections/ImmersiveProjectFlow/armiJourney/experienceData";
import { travelProgress } from "@/components/sections/ImmersiveProjectFlow/armiJourney/paths";
import type { DistrictShotProfile, WorldDirectorState } from "../types/contracts";
import type { ArmiLegacyEvaluation } from "./armiAdapter";

// Temporary V1 compatibility, NOT Phase 2 shot authoring. All numeric timing
// stays here; the catalog, registry and itinerary remain choreography-free.
const boundaries = [0, entryEnd * .18, entryEnd * .4, entryEnd * .7, entryEnd, .43, .60, .70, .84, .92, .985, 1];
export const armiRuntimeShotIds = ["entry", "voice", "tablet-approach", "portal", "legacy-stt", "routing-reveal", "observe-decision", "legacy-travel", "legacy-result", "legacy-return", "exit"] as const;
export const armiRuntimeProfile: DistrictShotProfile = {
  profileId: "armi/shots", districtId: "armi", publishState: "published",
  shots: armiRuntimeShotIds.map((shotId, i) => ({
    shotId, localStart: boundaries[i], localEnd: boundaries[i + 1],
    desktopCameraProfileId: "armi/v1-camera", mobileCameraProfileId: "armi/v1-camera-mobile",
    narrativeReferenceId: `armi/v1/${journeyPhases[i].id}`,
    requiredAssetIds: ["armi/tablet-poster", "armi/tablet-return-poster", "armi/tablet-video"],
    reducedMotion: i === 0 || i === 10 ? "product-media" : "still",
  })),
};
export function armiLegacyPhase(shotId: string | null) {
  const index = armiRuntimeShotIds.findIndex(id => id === shotId);
  if (index < 0) throw new Error(`Unknown ARMI compatibility shot: ${shotId}`);
  return index;
}
/** Implementation of the runtime bridge; planning-only 1A boundary stays intact. */
export function adaptArmiRuntime(state: WorldDirectorState): ArmiLegacyEvaluation {
  if (state.districtId !== "armi") throw new Error("ARMI adapter received another district");
  return { legacyJourneyProgress: state.localProgress, legacyPhaseId: journeyPhases[armiLegacyPhase(state.shotId)].id };
}
export function createArmiCameraSample() {
  return { position: new Vector3(), target: new Vector3(), up: new Vector3(), fov: 43, far: 180 };
}
export function sampleArmiCamera(p: number, compact: boolean, pointer: { x: number; y: number }, out = createArmiCameraSample()) {
  const t = travelProgress(entryLocal(p));
  sampleJourney(p, compact, out.position, out.target);
  if (!compact && t < .1) {
    out.position.x += pointer.x * .12 * (1 - t * 10);
    out.position.y += pointer.y * .07 * (1 - t * 10);
  }
  const bank = p <= .32 ? Math.sin(t * Math.PI * 2) * .025 : Math.sin(interval(p, .70, .84) * Math.PI * 2) * .035;
  out.up.set(compact ? 0 : bank, 1, 0);
  out.fov = journeyFov(p, compact);
  out.far = p <= .32 ? 75 : 180;
  return out;
}
export function sampleArmiLookdev(p: number, compact: boolean) {
  const open = ease(interval(p, .32, .43)) * (1 - ease(interval(p, .95, .985)));
  return {
    fogNear: 12 + open * 32, fogFar: 42 + open * 108,
    direct: p <= .32 || p >= .965,
    bloomStrength: (compact ? .23 : .36) * ease(interval(p, .32, .43)) * (1 - ease(interval(p, .92, .965))),
  };
}
