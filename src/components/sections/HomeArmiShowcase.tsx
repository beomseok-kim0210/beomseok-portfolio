import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProjectVideoFrame } from "@/components/ui/ProjectVideoFrame";
import { SplitHeadline } from "@/components/ui/SplitHeadline";
import { ShowcaseMotion } from "@/components/sections/HomeShowcase/ShowcaseMotion";

export function HomeArmiShowcase() {
  return (
    <section
      id="projects"
      className="scene-shell flex min-h-screen items-center bg-[#000814] px-5 py-24 text-white md:py-40"
    >
      <ShowcaseMotion className="mx-auto w-full text-center">
        <p className="cinematic-label !text-[40px] !leading-none !tracking-[0.04em] text-white/55">
          Healthcare AI
        </p>
        <h2 className="mt-8 text-[clamp(72px,7vw,132px)] font-[780] leading-[0.9] tracking-[-0.05em]">
          ARMI
        </h2>
        <SplitHeadline
          lines={["가장 가까운 곳에서", "가장 필요한 순간에"]}
          className="mx-auto mt-6 max-w-[1180px] text-[clamp(48px,5vw,92px)] font-bold leading-[1.02] tracking-normal"
        />
        <div className="mx-auto mt-16 w-[min(1400px,88vw)]">
          <ProjectVideoFrame
            theme="armi"
            title="ARMI"
            eyebrow="Live Product Demo"
            duration="03:42"
            videoSrc="/videos/ARMI_intro.mp4"
          />
        </div>
        <Link
          href="/projects/armi"
          className="mt-12 inline-flex h-[52px] items-center gap-2 rounded-full bg-white px-7 text-[15px] font-semibold text-[#111827] transition-transform hover:-translate-y-0.5"
        >
          View ARMI Case Study <ArrowRight className="h-4 w-4" />
        </Link>
      </ShowcaseMotion>
    </section>
  );
}
