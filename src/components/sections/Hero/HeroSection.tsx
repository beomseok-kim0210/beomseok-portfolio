"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";

export function HeroSection() {
  return (
    <section
      id="hero"
      className="scene-shell flex min-h-screen items-center bg-[#FAFAFA] px-5 py-24"
    >
      <motion.div
        initial={{ opacity: 0, y: 40, filter: "blur(12px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-[1320px] text-center"
      >
        <h1 className="mx-auto max-w-[1400px] text-[clamp(62px,6.4vw,118px)] font-[520] leading-[0.9] tracking-[-0.03em] text-[#111827]">
          <span className="block">
            <span className="font-black text-blue-700">사람</span>은 기술을 기억하지 않습니다.
          </span>
          <span className="block">
            <span className="font-black text-blue-700">경험을 기억</span>합니다.
          </span>
        </h1>
        <p className="cinematic-label mt-14 text-blue-600">
          Frontend & AI Product Builder
        </p>
        <p className="mx-auto mt-8 max-w-[820px] text-2xl leading-10 tracking-[-0.015em] text-slate-600 md:text-[2rem] md:leading-[3.1rem]">
          음성 인터페이스, 실시간 UX, 생성형 AI를
          <br className="hidden sm:block" />
          사용자가 체감하는 제품 경험으로 연결합니다.
        </p>
        <div className="mt-12 flex flex-wrap justify-center gap-3">
          <Button href="#projects">View Projects</Button>
          <Button href="/knowledge" variant="secondary">
            AI Knowledge
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
