import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { WorldLoader } from "@/components/sections/Loader/WorldLoader";
import { HomeWorlds } from "@/components/sections/HomeWorlds";
import { navItems } from "@/data/navigation";
import { isJourneyId, journeyOf, journeys } from "@/data/journeys";

export const dynamicParams = false;
export function generateStaticParams() { return journeys.map(j => ({ id: j.id })); }

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!isJourneyId(id)) return {};
  const j = journeyOf(id);
  return { title: `${j.name} 여정`, description: j.lede };
}

/** One project's 3D journey on its own page (split out of Home: one project per visit). */
export default async function JourneyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isJourneyId(id)) notFound();
  return (
    <main>
      <SiteHeader items={navItems} />
      {/* ARMI's world is the heaviest first screen: the loader reports its real readiness. */}
      {id === "armi" && <WorldLoader />}
      <HomeWorlds only={id} />
    </main>
  );
}
