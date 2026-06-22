import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SplitHeadline } from "@/components/ui/SplitHeadline";
import { ShowcaseMotion } from "@/components/sections/HomeShowcase/ShowcaseMotion";

const nodes = [
  ["PM", 50, 14],
  ["Backend", 21, 32],
  ["Frontend", 78, 34],
  ["AI", 32, 68],
  ["Infra", 56, 52],
  ["Test", 76, 78],
] as const;

export function HomeLabShowcase() {
  return (
    <section
      id="lab"
      className="scene-shell flex min-h-screen flex-col items-center justify-center bg-[#111827] px-5 py-12 text-white md:py-16"
    >
      <ShowcaseMotion className="w-full text-center">
        <p className="cinematic-label text-blue-300">AI Lab</p>
        <h2 className="mt-5 font-display text-[clamp(44px,4.5vw,68px)] font-[700] leading-[0.9] tracking-[-0.05em]">
          Claw Dev
        </h2>
        <SplitHeadline
          lines={[
            "AI Agent는",
            "혼자 동작하는 도구가 아니라",
            "협업하는 구조가 될 수 있을까?",
          ]}
          className="mx-auto mt-4 max-w-[860px] text-[clamp(20px,2vw,30px)] font-medium leading-[1.4] tracking-normal opacity-60"
        />
      </ShowcaseMotion>

      <ShowcaseMotion preset="media" className="mt-6 w-full max-w-[1060px]">
        <div className="relative aspect-[16/9] w-full rounded-[28px] border border-white/10 bg-white/[0.04]">
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
            {nodes.flatMap((from, i) =>
              nodes.slice(i + 1).map((to) => (
                <line
                  key={`${from[0]}-${to[0]}`}
                  x1={from[1]}
                  y1={from[2]}
                  x2={to[1]}
                  y2={to[2]}
                  stroke="rgba(148,163,184,0.28)"
                  strokeWidth="0.25"
                />
              )),
            )}
          </svg>
          {nodes.map(([label, x, y], index) => (
            <div
              key={label}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white px-4 py-3 text-xs font-bold text-[#111827] shadow-[0_20px_70px_rgba(0,0,0,0.22)]"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                animation: `labPulse ${3 + index * 0.2}s ease-in-out infinite`,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </ShowcaseMotion>

      <ShowcaseMotion delay={0.25} className="mt-6 text-center">
        <Link
          href="/projects/claw-dev"
          className="inline-flex h-[48px] items-center gap-2 rounded-full bg-white px-6 text-[14px] font-semibold text-[#111827] transition-transform hover:-translate-y-0.5"
        >
          View AI Lab <ArrowRight className="h-4 w-4" />
        </Link>
      </ShowcaseMotion>
    </section>
  );
}
