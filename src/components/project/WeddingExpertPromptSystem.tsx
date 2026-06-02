import { ArrowDown, FileText } from "lucide-react";
import { MotionBlock } from "@/components/ui/MotionBlock";
import {
  weddingExperts,
  weddingPromptMethods,
} from "@/data/weddingResearch";

const promptFlow = [
  "User Input",
  "Body Expert.md",
  "Color Expert.md",
  "Design Expert.md",
  "Accessory Expert.md",
  "Style Expert.md",
  "Structured Recommendation",
];

export function WeddingExpertPromptSystem() {
  return (
    <div className="space-y-12">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {weddingExperts.map((expert, index) => (
          <MotionBlock key={expert.title} delay={index * 0.05}>
            <article className="h-full rounded-[32px] border border-[#E5E7EB] bg-white/75 p-7 backdrop-blur transition-transform duration-200 hover:-translate-y-1">
              <div className="flex items-start justify-between gap-4">
                <p className="small-label text-[#B98979]">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-[#FFF4EF] text-[#B98979]">
                  <FileText className="h-5 w-5" />
                </span>
              </div>
              <h3 className="mt-5 text-2xl font-semibold text-[#111827]">
                {expert.title}
              </h3>
              <p className="project-caption mt-4">
                {expert.description}
              </p>
              <p className="mt-5 text-sm font-medium text-slate-500">
                {expert.fileName}
              </p>
            </article>
          </MotionBlock>
        ))}
      </div>

      <MotionBlock delay={0.12}>
        <div className="rounded-[32px] border border-[#E5E7EB] bg-white/78 p-8 backdrop-blur">
          <p className="small-label text-[#B98979]">Expert Flow Diagram</p>
          <div className="mt-8 grid gap-4 lg:grid-cols-7">
            {promptFlow.map((step, index) => {
              const isMarkdown = step.endsWith(".md");
              return (
                <div key={step} className="flex flex-col items-center">
                  <div className="flex min-h-[112px] w-full items-center justify-center rounded-[24px] border border-[#E5E7EB] bg-[#FFFCFB] p-5 text-center">
                    <div>
                      {isMarkdown ? (
                        <span className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFF4EF] text-[#B98979]">
                          <FileText className="h-4 w-4" />
                        </span>
                      ) : null}
                      <p className={`font-semibold text-[#111827] ${isMarkdown ? "mt-4 text-sm" : "text-base"}`}>
                        {step}
                      </p>
                    </div>
                  </div>
                  {index < promptFlow.length - 1 ? (
                    <ArrowDown className="mt-3 h-4 w-4 text-slate-400 lg:hidden" />
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="rounded-[24px] bg-[#FFF4EF] p-6">
              <p className="project-body text-slate-700">
                각 전문가는 독립적인 Markdown 기반 지식 파일을 사용했다.
                관련 논문과 도메인 자료를 참고하여 판단 기준을 분리하였다.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {weddingPromptMethods.map((method) => (
                <span
                  key={method}
                  className="rounded-full border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-medium text-slate-600"
                >
                  {method}
                </span>
              ))}
            </div>
          </div>
        </div>
      </MotionBlock>
    </div>
  );
}
