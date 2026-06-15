"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { VaporizeStyledOnce } from "@/components/ui/VaporizeStyledOnce";

type Phase = "jisul" | "vaporizing" | "gyeongheom" | "fade_out";

const DURATION: Record<Phase, number> = {
  jisul: 3500,
  vaporizing: 2000, // onComplete가 먼저 오면 그때 전환, 이건 fallback
  gyeongheom: 7000,
  fade_out: 1200,
};
const NEXT: Record<Phase, Phase> = {
  jisul: "vaporizing",
  vaporizing: "gyeongheom",
  gyeongheom: "fade_out",
  fade_out: "jisul",
};

// "기술" 파란 bold + "을 기억하지 않습니다." 어두운 regular
const JISUL_SEGMENTS = [
  { text: "기술", color: "rgb(29, 78, 216)", fontWeight: 900 },
  { text: "을 기억하지 않습니다.", color: "rgb(17, 24, 39)", fontWeight: 520 },
];

export function HeroSection() {
  const [phase, setPhase] = useState<Phase>("jisul");
  const [canvasReady, setCanvasReady] = useState(false);
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const [fontSize, setFontSize] = useState(48);

  // h1의 실제 렌더링된 폰트 크기를 읽어 캔버스에 전달
  useEffect(() => {
    const update = () => {
      if (h1Ref.current) {
        const fs = parseFloat(getComputedStyle(h1Ref.current).fontSize);
        if (fs > 0) setFontSize(fs);
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // vaporizing 이외 phase는 타이머로 전환
  useEffect(() => {
    if (phase === "vaporizing") return; // onComplete가 처리
    const t = setTimeout(() => setPhase(NEXT[phase]), DURATION[phase]);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <section
      id="hero"
      className="scene-shell flex min-h-screen items-center bg-[#FAFAFA] px-5 py-24"
    >
      <motion.div
        initial={{ opacity: 0, y: 40, filter: "blur(12px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-[1100px] text-center"
      >
        <motion.h1
          ref={h1Ref}
          initial={{ opacity: 1, filter: "blur(0px)" }}
          animate={
            phase === "fade_out"
              ? { opacity: 0, filter: "blur(16px)" }
              : { opacity: 1, filter: "blur(0px)" }
          }
          transition={{ duration: 1.0, ease: "easeInOut" }}
          className="mx-auto max-w-[1100px] text-[clamp(40px,4.5vw,68px)] font-[520] leading-[0.92] tracking-[-0.03em] text-[#111827]"
        >
          <span className="block">
            <span className="font-black text-blue-700">사람</span>은
          </span>

          {/* jisul + vaporizing: relative 컨테이너로 HTML과 canvas를 겹쳐서
              canvas가 준비될 때까지 HTML을 유지 → 깜빡임 없는 전환 */}
          {(phase === "jisul" || phase === "vaporizing") && (
            <span className="relative block">
              {/* HTML 레이어: canvas가 준비되기 전까지 visible */}
              <span
                className="block"
                style={{ visibility: canvasReady ? "hidden" : "visible" }}
              >
                <span className="font-black text-blue-700">기술</span>을 기억하지 않습니다.
              </span>

              {/* Canvas 레이어: 절대 위치, canvas 준비 후에만 visible */}
              {phase === "vaporizing" && (
                <span
                  className="absolute inset-0 block"
                  style={{ visibility: canvasReady ? "visible" : "hidden" }}
                >
                  <span className="mx-auto block h-full w-full">
                    <VaporizeStyledOnce
                      segments={JISUL_SEGMENTS}
                      fontSize={fontSize}
                      fontFamily="Pretendard, Inter, sans-serif"
                      spread={3}
                      density={7}
                      vaporizeDuration={1300}
                      onReady={() => setCanvasReady(true)}
                      onComplete={() => {
                        setPhase("gyeongheom");
                        setCanvasReady(false);
                      }}
                    />
                  </span>
                </span>
              )}
            </span>
          )}

          {/* gyeongheom + fade_out: "경험을 기억합니다." blur fade-in */}
          {(phase === "gyeongheom" || phase === "fade_out") && (
            <motion.span
              className="block"
              initial={{ opacity: 0, filter: "blur(18px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="font-black text-blue-700">경험</span>을 기억합니다.
            </motion.span>
          )}
        </motion.h1>

        <p className="cinematic-label mt-10 text-blue-600">
          Frontend & AI Product Builder
        </p>
        <p className="mx-auto mt-6 max-w-[600px] text-[15px] leading-[1.75] tracking-[-0.015em] text-slate-600 md:text-[17px]">
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
