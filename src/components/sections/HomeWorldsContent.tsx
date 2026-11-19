"use client";
import { useEffect } from "react";
import { ImmersiveProjectFlow } from "@/components/sections/ImmersiveProjectFlow/ImmersiveProjectFlow";
import { JourneyIndex } from "@/components/sections/JourneyIndex/JourneyIndex";
import { WorldHost } from "@/features/world/runtime/WorldHost";
import { firstStopOf } from "@/features/world/runtime/sceneStepper";
import type { JourneyId } from "@/data/journeys";

/** Coming back from a journey page (/#journeys, /#lab, /#contact): these anchors live in this lazily
 *  hydrated chunk, so the router's own hash scroll runs before they exist. Land on them once mounted. */
function useHomeAnchor(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const hash = location.hash;
    if (!/^#(journeys|lab|contact)$/.test(hash)) return;
    const timer = window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>(hash); if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const y = hash === "#journeys" ? top : hash === "#lab" ? firstStopOf("lab")?.y ?? top - 72 : top - 72;
      window.__lenis?.scrollTo(y, { immediate: true, force: true }); window.scrollTo(0, y);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [enabled]);
}

export default function HomeWorldsContent({ only }: { only?: JourneyId }) {
  useHomeAnchor(!only);
  // A project page: that one journey, nothing else.
  if (only) return <WorldHost><ImmersiveProjectFlow only={only} /></WorldHost>;
  return <>
    {/* Project index: each sphere opens its own journey page. */}
    <JourneyIndex />
    {/* The personal gallery and its exit (Contact) stay on Home, after the index. */}
    <WorldHost><ImmersiveProjectFlow only="lab" /></WorldHost>
  </>;
}
