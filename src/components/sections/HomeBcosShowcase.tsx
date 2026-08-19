import { ArrowUpRight } from "lucide-react";
import { SplitHeadline } from "@/components/ui/SplitHeadline";
import { ShowcaseMotion } from "@/components/sections/HomeShowcase/ShowcaseMotion";

// 앞뒤 Lab/Docent가 모두 어두운 톤이라 여기만 밝게 — ClawDev의 연장처럼 보이지 않게 한다.
const chain = [
  { stage: "INPUT", label: "Task Contract", note: "목표 · 범위 · 합격 기준 · 읽기/쓰기 경계" },
  { stage: "PROCESS", label: "Worker · Verify · Review", note: "구현 후 호스트가 검증하고 별도 세션이 판정" },
  { stage: "EVIDENCE", label: "Report · Run · Events", note: "성공만이 아니라 재시도와 실패도 남는다" },
];

const keywords = ["Task Contract", "Host Verification", "Independent Review", "Benchmark Harness"];

export function HomeBcosShowcase() {
  return (
    <section
      id="bcos"
      className="scene-shell flex min-h-screen flex-col items-center justify-center bg-[#F7F8FA] px-5 py-12 text-[#111827] md:py-16"
    >
      <ShowcaseMotion className="w-full text-center">
        <p className="cinematic-label text-blue-600">AI Engineering Protocol</p>
        <h2 className="mt-5 font-display text-[clamp(44px,4.5vw,68px)] font-[700] leading-[0.9] tracking-[-0.05em]">
          에이전트를 더 쓰는 것이
          <br />
          정말 더 나은 개발일까?
        </h2>
        <SplitHeadline
          lines={[
            "계획, 역할 분리, 독립 검토는 모두 추가 비용입니다.",
            "BCOS는 그 비용이 값을 하는지 Git에 증거로 남깁니다.",
          ]}
          className="mx-auto mt-4 max-w-[860px] text-[clamp(18px,1.8vw,26px)] font-medium leading-[1.4] tracking-normal text-slate-600"
        />
      </ShowcaseMotion>

      <ShowcaseMotion preset="media" className="mt-8 w-full max-w-[1060px]">
        <div className="grid gap-3 md:grid-cols-3">
          {chain.map(({ stage, label, note }) => (
            <div
              key={stage}
              className="rounded-[20px] border border-slate-200 bg-white px-6 py-7 text-left shadow-[0_18px_50px_rgba(15,23,42,0.05)]"
            >
              <p className="small-label text-blue-600">{stage}</p>
              <p className="mt-3 text-[17px] font-semibold leading-snug">{label}</p>
              <p className="mt-2 text-[14px] leading-relaxed text-slate-500">{note}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {keywords.map((keyword) => (
            <span
              key={keyword}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] text-slate-600"
            >
              {keyword}
            </span>
          ))}
        </div>
      </ShowcaseMotion>

      <ShowcaseMotion preset="cta" className="mt-8 text-center">
        <a
          href="https://github.com/beomseok-kim0210/bcos"
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex h-[48px] items-center gap-2 rounded-full bg-[#111827] px-6 text-[14px] font-semibold text-white transition-transform hover:-translate-y-0.5"
        >
          View on GitHub <ArrowUpRight className="h-4 w-4" />
        </a>
        <p className="mt-4 text-[13px] text-slate-500">
          v0.1.0 · Core Complete · Dogfood Ready · 아직 비교 실험 전입니다
        </p>
      </ShowcaseMotion>
    </section>
  );
}
