"use client";
import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { observeScrollLayout } from "../observeScrollLayout";
import { entryPhase } from "./experienceData";

/** One scroll clock. Frame-critical consumers read the ref, not React state. */
export function useArmiScrollDirector(section: RefObject<HTMLElement | null>, progress: RefObject<number>, onPhase: (phase: number) => void) {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    let previous = -1;
    const clock = { value: 0 };
    const publish = () => {
      progress.current = clock.value;
      if (previous !== entryPhase(clock.value)) {
        previous = entryPhase(clock.value);
        onPhase(previous);
      }
    };
    const context = gsap.context(() => {
      gsap.to(clock, { value: 1, ease: "none", onUpdate: publish,
        scrollTrigger: { trigger: section.current, start: "top 72px", end: "bottom bottom", scrub: .4, invalidateOnRefresh: true,
          onRefresh: self => { clock.value = self.progress; publish(); } },
      });
    }, section);
    const stop = observeScrollLayout(section.current);
    return () => { stop(); context.revert(); };
  }, [section, progress, onPhase]);
}

