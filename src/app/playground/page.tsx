import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { MotionBlock } from "@/components/ui/MotionBlock";
import { ReflexGame } from "@/features/playground/ReflexGame";
import { navItems } from "@/data/navigation";

export const metadata: Metadata = {
  title: "AI Playground",
  description:
    "Claude로 프로토타이핑한 플레이 가능한 인터랙티브 데모 — 네온 닷지.",
};

export default function PlaygroundPage() {
  return (
    <main className="knowledge-hero-band min-h-screen">
      <SiteHeader items={navItems} />

      <section className="scene-shell">
        <div className="content-grid relative z-10 pb-24 pt-32 md:pt-40">
          <MotionBlock className="text-center">
            <p className="cinematic-label text-blue-400">AI Playground</p>
            <h1 className="cinematic-title mx-auto mt-6 max-w-[16ch] text-white">
              한 번의 프롬프트로 시작한 플레이 가능한 데모.
            </h1>
            <p className="subtitle mx-auto mt-6 max-w-[52ch] text-slate-300">
              최근 AI 모델은 텍스트 지시만으로 게임까지 만들어냅니다. 그 흐름을
              직접 확인할 수 있도록, Claude로 프로토타이핑한 미니 게임을 사이트에
              그대로 얹었습니다.
            </p>
          </MotionBlock>

          <MotionBlock delay={0.12} className="mt-12">
            <ReflexGame />
          </MotionBlock>

          <MotionBlock delay={0.2} className="mt-10 text-center">
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
