"use client";

import { ArrowRight } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { HeroEcosystem } from "@/components/ui/HeroEcosystem";
import { SplitHeadline } from "@/components/ui/SplitHeadline";

export function HeroSection() {
  const { scrollYProgress } = useScroll();
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.85]);
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.5]);
  const blur = useTransform(scrollYProgress, [0, 0.2], ["blur(0px)", "blur(6px)"]);

  return (
    <section
      id="hero"
      className="scene-shell min-h-[960px] bg-[#FAFAFA] pt-16"
    >
      <div className="content-grid grid min-h-[calc(100vh-64px)] items-center gap-12 py-20 lg:grid-cols-[0.6fr_0.4fr]">
        <motion.div style={{ scale, opacity, filter: blur }} className="origin-left">
          <p className="cinematic-label mb-10 text-blue-600">
            Frontend & AI Product Builder
          </p>
          <SplitHeadline
            lines={["기술보다", "사람에게 먼저 닿는", "AI를 만듭니다."]}
            className="cinematic-title max-w-[900px]"
          />
          <p className="mt-16 max-w-[620px] text-2xl font-normal leading-relaxed text-slate-600">
            음성 인터페이스, 실시간 UX, 생성형 AI를 활용해 사용자가 직접
            체감할 수 있는 제품 경험으로 연결합니다.
          </p>
          <div className="mt-12 flex flex-wrap gap-3">
            <Button href="#projects" icon={ArrowRight}>
              Enter the Story
            </Button>
            <Button href="/knowledge" variant="secondary">
              AI Knowledge
            </Button>
          </div>
        </motion.div>
        <HeroEcosystem />
      </div>
    </section>
  );
}
