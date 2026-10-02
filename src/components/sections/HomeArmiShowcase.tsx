import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SplitHeadline } from "@/components/ui/SplitHeadline";
import { ShowcaseMotion } from "@/components/sections/HomeShowcase/ShowcaseMotion";
import { ArmiSystemVisual } from "@/components/sections/HomeShowcase/SystemVisuals";

const flow = ["VOICE", "STT", "LANGGRAPH", "TOOL / STATE", "ACTION"];

export function HomeArmiShowcase() {
  return (
    <section
      id="armi"
      className="scene-shell relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#02060d] px-5 py-16 text-white md:py-24"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#a8d934]/50 to-transparent" />

      <ShowcaseMotion className="w-full text-center">
        <p className="cinematic-label text-[#a8d934]">Healthcare AI / 01</p>
        <h2 className="mt-5 font-display text-[clamp(52px,5.4vw,82px)] font-[700] leading-[0.86] tracking-[-0.055em]">
          ARMI
        </h2>
        <SplitHeadline
          lines={["Voice becomes a decision.", "Decision becomes action."]}
          className="mx-auto mt-5 max-w-[920px] text-[clamp(22px,2.2vw,34px)] font-medium leading-[1.25] tracking-[-0.025em] text-white/75"
        />
        <p className="mx-auto mt-5 max-w-[660px] text-[14px] leading-7 text-white/42 md:text-[15px]">
          환자의 자연어 요청을 단순 응답으로 끝내지 않고, 기억과 도구 호출을 거쳐 실제 로봇 행동까지 연결한 에이전트 시스템입니다.
        </p>
      </ShowcaseMotion>

      <ShowcaseMotion preset="media" className="mt-9 w-full max-w-[1120px]">
        <ArmiSystemVisual />
      </ShowcaseMotion>

      <ShowcaseMotion delay={0.18} className="mt-7 w-full max-w-[1120px]">
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 font-mono text-[9px] tracking-[0.12em] text-white/35 sm:text-[10px]">
          {flow.map((item, index) => (
            <span key={item} className="inline-flex items-center gap-2">
              <span className={index === 2 ? "text-[#d7ff70]" : "text-white/55"}>{item}</span>
              {index < flow.length - 1 && <span className="text-[#a8d934]/55">→</span>}
            </span>
          ))}
        </div>
      </ShowcaseMotion>

      <ShowcaseMotion delay={0.25} className="mt-7 text-center">
        <Link
          href="/projects/armi"
          className="inline-flex h-[48px] items-center gap-2 rounded-full bg-[#d7ff70] px-6 text-[14px] font-semibold text-[#11170a] transition-transform hover:-translate-y-0.5"
        >
          Explore ARMI System <ArrowRight className="h-4 w-4" />
        </Link>
      </ShowcaseMotion>
    </section>
  );
}
