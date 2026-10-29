"use client";
import dynamic from "next/dynamic";

/**
 * The project index and the 3D journeys hydrate from their own chunk, after Hero: three.js math,
 * the world adapters and their GSAP timelines stay out of the first-load bundle, so the first
 * screen paints and answers input sooner. Still server-rendered. One chunk on purpose — the index
 * and the journeys must create their ScrollTriggers in this order (pins measure each other).
 */
const Worlds = dynamic(() => import("./HomeWorldsContent"));
export function HomeWorlds() { return <Worlds />; }
