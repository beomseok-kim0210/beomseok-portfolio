import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProjectVideoFrame } from "@/components/ui/ProjectVideoFrame";
import { SplitHeadline } from "@/components/ui/SplitHeadline";
import { ShowcaseMotion } from "@/components/sections/HomeShowcase/ShowcaseMotion";

export function HomeArmiShowcase() {
  return (
    <section
      id="projects"
      className="scene-shell flex min-h-screen flex-col items-center justify-center bg-[#000814] px-5 py-12 text-white md:py-16"
    >
      <ShowcaseMotion className="w-full text-center">
        <p className="cinematic-label text-white/55">Healthcare AI</p>
        <h2 className="mt-5 font-display text-[clamp(44px,4.5vw,68px)] font-[700] leading-[0.9] tracking-[-0.05em]">
          ARMI
        </h2>
        <SplitHeadline
          lines={["가장 가까운 곳에서", "가장 필요한 순간에"]}
          className="mx-auto mt-4 max-w-[860px] text-[clamp(20px,2vw,30px)] font-medium leading-[1.4] tracking-normal opacity-75"
        />
      </ShowcaseMotion>

      <ShowcaseMotion preset="media" className="mt-6 w-full max-w-[1060px]">
        <ProjectVideoFrame
          theme="armi"
          title="ARMI"
          eyebrow="Live Product Demo"
          duration="03:42"
          videoSrc="/videos/ARMI_intro.mp4"
        />
      </ShowcaseMotion>

      <ShowcaseMotion delay={0.25} className="mt-6 text-center">
        <Link
          href="/projects/armi"
          className="inline-flex h-[48px] items-center gap-2 rounded-full bg-white px-6 text-[14px] font-semibold text-[#111827] transition-transform hover:-translate-y-0.5"
        >
          View ARMI Case Study <ArrowRight className="h-4 w-4" />
        </Link>
      </ShowcaseMotion>
    </section>
  );
}
