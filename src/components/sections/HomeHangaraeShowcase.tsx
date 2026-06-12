import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProjectVideoFrame } from "@/components/ui/ProjectVideoFrame";
import { SplitHeadline } from "@/components/ui/SplitHeadline";
import { ShowcaseMotion } from "@/components/sections/HomeShowcase/ShowcaseMotion";

export function HomeHangaraeShowcase() {
  return (
    <section className="scene-shell flex min-h-screen items-center bg-[#F6FFFB] px-5 py-24 text-[#111827] md:py-40">
      <ShowcaseMotion className="mx-auto w-full text-center">
        <p className="cinematic-label text-[var(--hangarae-accent)]">
          Rehabilitation AI
        </p>
        <h2 className="mt-5 text-[clamp(44px,4.5vw,68px)] font-[780] leading-[0.9] tracking-[-0.05em]">
          행가래
        </h2>
        <SplitHeadline
          lines={["환자들의 집으로 가는 걸음을", "더욱 가볍고 안전하게"]}
          className="mx-auto mt-4 max-w-[860px] text-[clamp(20px,2vw,30px)] font-medium leading-[1.4] tracking-normal opacity-60"
        />
        <div className="mx-auto mt-14 w-[min(980px,88vw)] md:scale-[1.06]">
          <ProjectVideoFrame
            theme="hangarae"
            title="행가래"
            eyebrow="Live Product Demo"
            duration="03:42"
            videoSrc="/videos/행가래_intro.mp4"
          />
        </div>
        <Link
          href="/projects/hangarae"
          className="mt-20 inline-flex h-[52px] items-center gap-2 rounded-full bg-[#111827] px-7 text-[15px] font-semibold text-white transition-transform hover:-translate-y-0.5"
        >
          View Case Study <ArrowRight className="h-4 w-4" />
        </Link>
      </ShowcaseMotion>
    </section>
  );
}
