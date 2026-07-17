import type { Metadata } from "next";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { MotionBlock } from "@/components/ui/MotionBlock";
import { DocentExperience } from "@/features/docent/DocentExperience";
import { docentCopy } from "@/data/docent";
import { navItems } from "@/data/navigation";

export const metadata: Metadata = {
  title: "AI Docent",
  description:
    "Google GNM 파라메트릭 3D 헤드와 Claude API로 만든 AI 도슨트. 김범석의 프로젝트와 기술에 대해 직접 물어보세요.",
};

export default function DocentPage() {
  return (
    <main>
      <SiteHeader items={navItems} />

      <section className="scene-shell knowledge-hero-band min-h-screen">
        <div className="content-grid relative z-10 pb-24 pt-36 md:pt-44">
          <MotionBlock>
            <p className="cinematic-label text-blue-400">{docentCopy.label}</p>
            <h1 className="cinematic-title mt-6 max-w-[16ch] whitespace-pre-line text-white">
              {docentCopy.heading}
            </h1>
            <p className="subtitle mt-7 max-w-[56ch] text-slate-300">
              {docentCopy.subheading}
            </p>
          </MotionBlock>

          <MotionBlock delay={0.15} className="mt-12">
            <DocentExperience />
          </MotionBlock>

          <MotionBlock delay={0.2} className="mt-10">
            <p className="text-xs leading-relaxed text-slate-500">
              이 도슨트의 얼굴은 Google이 오픈소스로 공개한 GNM 파라메트릭 헤드
              모델에서 Python으로 생성한 것이며, 6가지 표정 모프타겟이 답변의
              감정에 따라 실시간으로 반응합니다. AI 뉴스에서 접한 기술을 실제로
              구현해 본 프로젝트입니다.
            </p>
          </MotionBlock>
        </div>
      </section>
    </main>
  );
}
