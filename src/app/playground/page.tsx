import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { MotionBlock } from "@/components/ui/MotionBlock";
import { DocentExperience } from "@/features/docent/DocentExperience";
import { DocentDevlog } from "@/features/playground/DocentDevlog";
import { ReflexGame } from "@/features/playground/ReflexGame";
import { docentCopy } from "@/data/docent";
import { navItems } from "@/data/navigation";

export const metadata: Metadata = {
  title: "AI Playground",
  description:
    "AI 뉴스에서 접한 기술을 직접 구현해 보는 실험실 — GNM 3D 도슨트, 그리고 Claude로 만든 미니 게임.",
};

export default function PlaygroundPage() {
  return (
    <main>
      <SiteHeader items={navItems} />

      <section className="scene-shell knowledge-hero-band min-h-screen">
        <div className="content-grid relative z-10 pb-24 pt-36 md:pt-44">
          {/* ─── 히어로 ─── */}
          <MotionBlock className="text-center">
            <p className="cinematic-label text-blue-400">Research → Production</p>
            <h1 className="cinematic-title mx-auto mt-6 max-w-[20ch] text-white">
              AI 리서치에서
              <br className="hidden md:block" /> 실제 적용까지.
            </h1>
            <p className="subtitle mx-auto mt-6 max-w-[56ch] text-slate-300">
              매일 큐레이션하는 AI 리서치·릴리스 중 프로덕션에 적용할 기술을
              선별하고, 실제로 동작하는 구현물로 옮깁니다. 대표 사례는 오픈소스
              파라메트릭 3D 헤드 모델(GNM)을 활용한 AI 도슨트입니다.
            </p>
          </MotionBlock>

          {/* ─── 도슨트 체험 ─── */}
          <MotionBlock delay={0.12} className="mt-16">
            <div className="mb-6">
              <p className="cinematic-label text-blue-400">{docentCopy.label}</p>
              <h2 className="mt-3 font-display text-2xl font-semibold text-white md:text-3xl">
                포트폴리오에게 직접 물어보세요
              </h2>
              <p className="mt-3 max-w-[56ch] text-sm text-slate-400 md:text-base">
                {docentCopy.subheading}
              </p>
            </div>
            <DocentExperience />
          </MotionBlock>

          {/* ─── 개발기 ─── */}
          <MotionBlock delay={0.15} className="mt-24">
            <div className="mb-10 text-center">
              <p className="cinematic-label text-blue-400">Devlog</p>
              <h2 className="mx-auto mt-3 max-w-[24ch] font-display text-2xl font-semibold text-white md:text-3xl">
                구현 및 개선 과정
              </h2>
              <p className="mx-auto mt-3 max-w-[48ch] text-sm text-slate-400">
                오픈소스 발표부터 실제 적용까지, 날짜별 의사결정과 한계를 그대로
                기록했습니다.
              </p>
            </div>
            <DocentDevlog />
          </MotionBlock>

          {/* ─── 미니 게임 ─── */}
          <MotionBlock delay={0.15} className="mt-24">
            <div className="mb-6 text-center">
              <p className="cinematic-label text-blue-400">Prompt-built Demo</p>
              <h2 className="mx-auto mt-3 max-w-[24ch] font-display text-2xl font-semibold text-white md:text-3xl">
                한 번의 프롬프트로 만든 미니 게임
              </h2>
              <p className="mx-auto mt-3 max-w-[52ch] text-sm text-slate-400">
                텍스트 지시만으로 게임까지 만들어내는 흐름을 확인할 수 있도록,
                Claude로 프로토타이핑한 데모를 그대로 얹었습니다.
              </p>
            </div>
            <ReflexGame />
          </MotionBlock>

          {/* ─── 돌아가기 ─── */}
          <MotionBlock delay={0.2} className="mt-16 text-center">
            <Link
              href="/#lab"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-white/20 px-6 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" /> Lab으로 돌아가기
            </Link>
          </MotionBlock>
        </div>
      </section>
    </main>
  );
}
