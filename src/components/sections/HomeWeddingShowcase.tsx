import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BeforeAfterFrame } from "@/components/ui/BeforeAfterFrame";
import { SplitHeadline } from "@/components/ui/SplitHeadline";
import { ShowcaseMotion } from "@/components/sections/HomeShowcase/ShowcaseMotion";

export function HomeWeddingShowcase() {
  return (
    <section className="scene-shell flex min-h-screen items-center bg-[#FFF9F7] px-5 py-24 text-[#111827] md:py-40">
      <ShowcaseMotion className="mx-auto w-full text-center">
        <p className="cinematic-label !text-[40px] !leading-none !tracking-[0.04em] text-[var(--wedding-accent)]">
          Choice Intelligence
        </p>
        <h2 className="mt-8 text-[clamp(72px,7vw,132px)] font-[780] leading-[0.9] tracking-[-0.05em]">
          Wedding AI
        </h2>
        <SplitHeadline
          lines={["사람은", "자신에게 가장 어울리는 선택을", "얼마나 알고 있을까?"]}
          className="mx-auto mt-6 max-w-[1180px] text-[clamp(48px,5vw,92px)] font-bold leading-[1.02] tracking-normal"
        />
        <div className="mx-auto mt-16 w-[min(1400px,88vw)]">
          <BeforeAfterFrame
            beforeSrc="/images/before_wedding.png"
            afterSrc="/images/after_wedding.png"
            beforePosition="center calc(50% + 5px)"
          />
        </div>
        <Link
          href="/projects/wedding"
          className="mt-12 inline-flex h-[52px] items-center gap-2 rounded-full bg-[#111827] px-7 text-[15px] font-semibold text-white transition-transform hover:-translate-y-0.5"
        >
          View Case Study <ArrowRight className="h-4 w-4" />
        </Link>
      </ShowcaseMotion>
    </section>
  );
}
