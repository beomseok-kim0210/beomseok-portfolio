import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SplitHeadline } from "@/components/ui/SplitHeadline";
import { ShowcaseMotion } from "@/components/sections/HomeShowcase/ShowcaseMotion";
import { HangaraeSpatialVisual } from "@/components/sections/HomeShowcase/SystemVisuals";

const flow = ["CAMERA", "POSE", "DEPTH", "3D COORDINATE", "FEEDBACK"];

export function HomeHangaraeShowcase() {
  return (
    <section
      id="hangarae"
      className="scene-shell relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#f4f3ee] px-5 py-16 text-[#15171b] md:py-24"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[120px] bg-gradient-to-b from-[#02060d] via-[#f4f3ee]/20 to-transparent opacity-20" />

      <ShowcaseMotion className="w-full text-center">
        <p className="cinematic-label text-indigo-600">Rehabilitation AI / 02</p>
        <h2 className="mt-5 font-display text-[clamp(52px,5.4vw,82px)] font-[700] leading-[0.86] tracking-[-0.055em]">
          행가래
        </h2>
        <SplitHeadline
          lines={["Camera sees pixels.", "The system measures movement."]}
          className="mx-auto mt-5 max-w-[920px] text-[clamp(22px,2.2vw,34px)] font-medium leading-[1.25] tracking-[-0.025em] text-slate-700"
        />
        <p className="mx-auto mt-5 max-w-[680px] text-[14px] leading-7 text-slate-500 md:text-[15px]">
          포즈 키포인트와 깊이 정보를 결합해 화면 속 관절을 3D 좌표로 바꾸고, 온디바이스 환경에서 실시간 운동 피드백으로 연결했습니다.
        </p>
      </ShowcaseMotion>

      <ShowcaseMotion preset="media" className="mt-9 w-full max-w-[1120px]">
        <HangaraeSpatialVisual />
      </ShowcaseMotion>

      <ShowcaseMotion delay={0.18} className="mt-7 w-full max-w-[1120px]">
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 font-mono text-[9px] tracking-[0.12em] text-slate-400 sm:text-[10px]">
          {flow.map((item, index) => (
            <span key={item} className="inline-flex items-center gap-2">
              <span className={index === 3 ? "text-indigo-600" : "text-slate-500"}>{item}</span>
              {index < flow.length - 1 && <span className="text-indigo-300">→</span>}
            </span>
          ))}
        </div>
      </ShowcaseMotion>

      <ShowcaseMotion delay={0.25} className="mt-7 text-center">
        <Link
          href="/projects/hangarae"
          className="inline-flex h-[48px] items-center gap-2 rounded-full bg-[#15171b] px-6 text-[14px] font-semibold text-white transition-transform hover:-translate-y-0.5"
        >
          Explore Spatial Pipeline <ArrowRight className="h-4 w-4" />
        </Link>
      </ShowcaseMotion>
    </section>
  );
}
