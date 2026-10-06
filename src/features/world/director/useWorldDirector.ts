"use client";
import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { observeScrollLayout } from "@/components/sections/ImmersiveProjectFlow/observeScrollLayout";
import { armiLegacyPhase } from "../adapters/armiRuntime";
import { worldPositionForDomProgress, type WorldRuntime } from "./worldRuntime";
import type { WorldRenderMode } from "../types/contracts";

export function useWorldDirector(section: RefObject<HTMLElement | null>, runtime: WorldRuntime, onPhase: (phase: number) => void, renderMode: WorldRenderMode) {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const clock = { value: runtime.progress.current };
    let previous = -1;
    const publish = () => {
      const state = runtime.publish(worldPositionForDomProgress("armi", clock.value), renderMode);
      const phase = armiLegacyPhase(state.shotId);
      if (previous !== phase) { previous = phase; onPhase(phase); }
      // Diagnostics expose current refs without React updates on scroll frames.
      if (section.current) {
        section.current.dataset.worldSegment = state.segmentId;
        section.current.dataset.worldDistrict = state.districtId ?? "";
        section.current.dataset.worldShot = state.shotId ?? "";
        section.current.dataset.worldProgress = String(state.localProgress);
      }
    };
    const context = gsap.context(() => {
      gsap.fromTo(clock, { value: 0 }, { value: 1, ease: "none", onUpdate: publish,
        scrollTrigger: { trigger: section.current, start: "top 72px", end: "bottom bottom",
          scrub: renderMode === "reduced-motion" ? true : .4, invalidateOnRefresh: true,
          onRefresh: self => { clock.value = self.progress; publish(); } },
      });
    }, section);
    const stop = observeScrollLayout(section.current);
    return () => { stop(); context.revert(); };
  }, [section, runtime, onPhase, renderMode]);
}
