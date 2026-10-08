"use client";
import type { RefObject } from "react";
import { ArmiEnvironment } from "@/components/sections/ImmersiveProjectFlow/armiJourney/ArmiEnvironment";
import { ArmiSystemWorld } from "@/components/sections/ImmersiveProjectFlow/armiJourney/ArmiSystemWorld";
import { ArmiTabletPortal } from "@/components/sections/ImmersiveProjectFlow/armiJourney/ArmiTabletPortal";
import { ArmiVoiceSignal } from "@/components/sections/ImmersiveProjectFlow/armiJourney/ArmiVoiceSignal";

/** Preserved V1 content only. No Canvas, camera application or final render. */
export function ArmiDistrictScene({ progress, compact, video }: { progress: RefObject<number>; compact: boolean; video: HTMLVideoElement | null }) {
  return <>
    <ArmiEnvironment compact={compact} progress={progress}/>
    <ArmiSystemWorld compact={compact} progress={progress}/>
    <ArmiTabletPortal progress={progress} video={video}/>
    <ArmiVoiceSignal progress={progress} compact={compact}/>
  </>;
}
