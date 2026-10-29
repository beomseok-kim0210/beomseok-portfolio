"use client";
import { ImmersiveProjectFlow } from "@/components/sections/ImmersiveProjectFlow/ImmersiveProjectFlow";
import { JourneyIndex } from "@/components/sections/JourneyIndex/JourneyIndex";
import { WorldHost } from "@/features/world/runtime/WorldHost";

export default function HomeWorldsContent() {
  return <>
    {/* Project index: the space from which each 3D world is entered (owns --world-gate). */}
    <JourneyIndex />
    <WorldHost><ImmersiveProjectFlow /></WorldHost>
  </>;
}
