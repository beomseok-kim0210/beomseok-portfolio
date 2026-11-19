"use client";
import dynamic from "next/dynamic";
import type { JourneyId } from "@/data/journeys";

/**
 * The project index and the 3D journeys hydrate from their own chunk, after the first screen: three.js
 * math, the world adapters and their GSAP timelines stay out of the first-load bundle. Still
 * server-rendered. Home mounts the index + personal gallery; /journeys/<id> mounts one project.
 */
const Worlds = dynamic(() => import("./HomeWorldsContent"));
export function HomeWorlds({ only }: { only?: JourneyId }) { return <Worlds only={only} />; }
