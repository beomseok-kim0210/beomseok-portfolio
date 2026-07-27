import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SplitHeadline } from "@/components/ui/SplitHeadline";
import { ShowcaseMotion } from "@/components/sections/HomeShowcase/ShowcaseMotion";

// 홈에는 WebGL 캔버스를 추가로 띄우지 않는다 — CSS 애니메이션 얼굴로 티저만.
export function HomeDocentShowcase() {
  return (
    <section
      id="docent"
      className="scene-shell flex min-h-screen flex-col items-center justify-center bg-[#0b1120] px-5 py-12 text-white md:py-16"
    >
      <ShowcaseMotion className="w-full text-center">
        <p className="cinematic-label text-blue-300">AI Docent</p>
        <h2 className="mt-5 font-display text-[clamp(44px,4.5vw,68px)] font-[700] leading-[0.9] tracking-[-0.05em]">
          포트폴리오에게
          <br />
          직접 물어보세요
        </h2>
        <SplitHeadline
          lines={[
            "Google GNM 3D 헤드가 Claude의 답변에 맞춰",
            "표정으로 반응하는 인터랙티브 도슨트입니다.",
          ]}
          className="mx-auto mt-4 max-w-[860px] text-[clamp(18px,1.8vw,26px)] font-medium leading-[1.4] tracking-normal opacity-60"
        />
      </ShowcaseMotion>

      <ShowcaseMotion preset="media" className="mt-8 w-full max-w-[420px]">
        <div className="relative mx-auto flex aspect-square w-full items-center justify-center rounded-[36px] border border-white/10 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.18),rgba(11,17,32,0.4))]">
          {/* CSS 전용 얼굴: 눈 깜빡임 + 은은한 플로팅 */}
          <div
            className="relative h-44 w-36 rounded-[46%] bg-gradient-to-b from-[#e2c4ad] to-[#d9b49a] shadow-[0_30px_80px_rgba(0,0,0,0.35)]"
            style={{ animation: "docentFloat 5s ease-in-out infinite" }}
          >
            <div className="absolute left-[26%] top-[38%] h-3 w-3 rounded-full bg-[#1f2937]" style={{ animation: "docentBlink 4.6s infinite" }} />
            <div className="absolute right-[26%] top-[38%] h-3 w-3 rounded-full bg-[#1f2937]" style={{ animation: "docentBlink 4.6s infinite" }} />
            <div className="absolute bottom-[24%] left-1/2 h-2 w-8 -translate-x-1/2 rounded-full bg-[#b98a6e]" />
          </div>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-white/[0.07] px-4 py-1.5 text-xs text-slate-300">
            &ldquo;ARMI가 뭔가요?&rdquo;
          </div>
        </div>
      </ShowcaseMotion>

      <ShowcaseMotion delay={0.25} className="mt-8 text-center">
        <Link
          href="/playground"
          className="inline-flex h-[48px] items-center gap-2 rounded-full bg-white px-6 text-[14px] font-semibold text-[#111827] transition-transform hover:-translate-y-0.5"
        >
          Playground에서 만나기 <ArrowRight className="h-4 w-4" />
        </Link>
      </ShowcaseMotion>
    </section>
  );
}
