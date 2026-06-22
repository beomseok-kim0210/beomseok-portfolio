import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BeforeAfterFrame } from "@/components/ui/BeforeAfterFrame";
import { SplitHeadline } from "@/components/ui/SplitHeadline";
import { ShowcaseMotion } from "@/components/sections/HomeShowcase/ShowcaseMotion";

export function HomeWeddingShowcase() {
  return (
    <section className="scene-shell flex min-h-screen flex-col items-center justify-center bg-[#FFF9F7] px-5 py-12 text-[#111827] md:py-16">
      <ShowcaseMotion className="w-full text-center">
        <p className="cinematic-label text-[var(--wedding-accent)]">
          Choice Intelligence
        </p>
        <h2 className="mt-5 font-display text-[clamp(44px,4.5vw,68px)] font-[700] leading-[0.9] tracking-[-0.05em]">
          Wedding AI
        </h2>
        <SplitHeadline
          lines={["사람은", "자신에게 가장 어울리는 선택을", "얼마나 알고 있을까?"]}
          className="mx-auto mt-4 max-w-[860px] text-[clamp(20px,2vw,30px)] font-medium leading-[1.4] tracking-normal opacity-60"
        />
      </ShowcaseMotion>

      <ShowcaseMotion delay={0.15} className="mt-6 w-full max-w-[1060px]">
        <BeforeAfterFrame
          beforeSrc="/images/before_wedding.png"
          afterSrc="/images/after_wedding.png"
          beforePosition="center calc(50% + 5px)"
        />
      </ShowcaseMotion>

      <ShowcaseMotion delay={0.25} className="mt-6 text-center">
        <Link
          href="/projects/wedding"
          className="inline-flex h-[48px] items-center gap-2 rounded-full bg-[#111827] px-6 text-[14px] font-semibold text-white transition-transform hover:-translate-y-0.5"
        >
          View Case Study <ArrowRight className="h-4 w-4" />
        </Link>
      </ShowcaseMotion>
    </section>
  );
}
