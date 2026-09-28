import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Crosshair, Fingerprint, MessageSquareText, Search, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { MotionBlock } from "@/components/ui/MotionBlock";
import { CrimeSceneDevlog } from "@/features/playground/CrimeSceneDevlog";
import { CrimeSceneLaunchButton } from "@/features/playground/CrimeSceneLaunchButton";
import { navItems } from "@/data/navigation";

export const metadata: Metadata = {
  title: "Crime Scene Playground",
  description:
    "3D 공간을 탐색하고 단서를 모아 AI 용의자를 심문한 뒤 최종 추리를 완성하는 웹 크라임씬.",
};

const investigationBeats = [
  {
    icon: Search,
    title: "현장을 탐색합니다",
    body: "3D 공간을 직접 걸으며 사물과 장소를 조사하고 사건의 조각을 수집합니다.",
  },
  {
    icon: MessageSquareText,
    title: "용의자를 심문합니다",
    body: "정해진 선택지에 갇히지 않고, 의심되는 지점을 자신의 문장으로 질문합니다.",
  },
  {
    icon: ShieldCheck,
    title: "증거를 제시합니다",
    body: "수집한 단서를 주장과 연결해 진술의 모순을 좁혀 갑니다.",
  },
  {
    icon: Crosshair,
    title: "마지막 추리를 완성합니다",
    body: "알리바이와 물증을 함께 판단해 범인을 지목하고 사건의 결말을 확인합니다.",
  },
] as const;

export default function PlaygroundPage() {
  return (
    <main>
      <SiteHeader items={navItems} />

      <section className="scene-shell knowledge-hero-band min-h-screen">
        <div className="content-grid relative z-10 pb-24 pt-32 md:pt-40">
          <MotionBlock className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="cinematic-label text-blue-400">PLAYGROUND</p>
              <h1 className="mt-6 max-w-[12ch] font-display text-[clamp(52px,7vw,96px)] font-bold leading-[0.9] tracking-[-0.055em] text-white">
                현장을 걷고,
                <br />의심을 증명하세요.
              </h1>
              <p className="mt-7 max-w-[58ch] text-base leading-8 text-slate-300 md:text-lg">
                3D 사건 현장을 탐색해 단서를 모으고, 용의자에게 자유롭게 AI 심문을 이어가세요.
                결정적인 증거를 제시한 뒤, 마지막 추리로 범인을 지목합니다.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <CrimeSceneLaunchButton />
                <Link
                  href="/projects/crime-scene"
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 px-6 text-sm font-semibold text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-blue-300"
                >
                  프로젝트 보기 <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                체험하기는 별도 게임 앱으로 이동합니다. 브라우저의 뒤로 가기로 돌아올 수 있습니다.
              </p>
            </div>

            <div aria-hidden="true" className="relative mx-auto aspect-[4/5] w-full max-w-[430px] overflow-hidden rounded-[36px] border border-white/10 bg-[#070C18] shadow-[0_40px_100px_rgba(0,0,0,0.45)]">
              <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(96,165,250,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(96,165,250,0.16)_1px,transparent_1px)] [background-size:38px_38px]" />
              <div className="absolute -right-20 -top-16 h-64 w-64 rounded-full bg-blue-500/25 blur-3xl" />
              <div className="absolute inset-x-10 top-12 flex items-center justify-between text-[10px] font-bold tracking-[0.26em] text-blue-300/70">
                <span>CASE 100</span><span>23:47</span>
              </div>
              <div className="absolute inset-x-10 top-[23%] h-px rotate-[-16deg] bg-red-400/45" />
              <div className="absolute left-[15%] top-[28%] w-[42%] rotate-[-5deg] rounded-xl border border-white/10 bg-white/[0.08] p-4 shadow-2xl backdrop-blur">
                <div className="h-20 rounded-lg bg-[radial-gradient(circle_at_60%_40%,rgba(96,165,250,0.3),rgba(15,23,42,0.9))]" />
                <div className="mt-3 h-1.5 w-3/4 rounded-full bg-white/20" />
                <div className="mt-2 h-1.5 w-1/2 rounded-full bg-white/10" />
              </div>
              <div className="absolute right-[13%] top-[47%] w-[38%] rotate-[7deg] rounded-xl border border-amber-200/15 bg-[#131A2A] p-4 shadow-2xl">
                <Crosshair className="h-7 w-7 text-amber-200/70" />
                <div className="mt-5 h-1.5 w-full rounded-full bg-white/15" />
                <div className="mt-2 h-1.5 w-2/3 rounded-full bg-white/10" />
              </div>
              <div className="absolute bottom-[12%] left-1/2 flex h-24 w-24 -translate-x-1/2 items-center justify-center rounded-full border border-blue-300/25 bg-blue-400/10 shadow-[0_0_48px_rgba(59,130,246,0.24)]">
                <Fingerprint className="h-10 w-10 text-blue-200/80" />
              </div>
            </div>
          </MotionBlock>

          <div className="mt-28 grid gap-px overflow-hidden rounded-[32px] border border-white/10 bg-white/10 md:grid-cols-2">
            {investigationBeats.map((beat, index) => {
              const Icon = beat.icon;
              return (
                <MotionBlock key={beat.title} delay={index * 0.06} className="bg-[#0B1120] p-7 md:p-9">
                  <Icon aria-hidden="true" className="h-6 w-6 text-blue-300" />
                  <h2 className="mt-8 text-2xl font-semibold text-white">{beat.title}</h2>
                  <p className="mt-4 text-sm leading-7 text-slate-400">{beat.body}</p>
                </MotionBlock>
              );
            })}
          </div>

          <CrimeSceneDevlog />
        </div>
      </section>
    </main>
  );
}
