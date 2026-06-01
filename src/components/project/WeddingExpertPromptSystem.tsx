import { MotionBlock } from "@/components/ui/MotionBlock";
import {
  weddingExperts,
  weddingPromptMethods,
  weddingPromptProcess,
} from "@/data/weddingResearch";

export function WeddingExpertPromptSystem() {
  return (
    <div className="space-y-10">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {weddingExperts.map((expert, index) => (
          <MotionBlock key={expert.title} delay={index * 0.05}>
            <article className="h-full rounded-[32px] border border-[#E5E7EB] bg-white/75 p-7 backdrop-blur transition-transform duration-200 hover:-translate-y-1">
              <p className="small-label text-[#B98979]">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-5 text-2xl font-semibold text-[#111827]">
                {expert.title}
              </h3>
              <p className="mt-4 text-[15px] leading-7 text-slate-600">
                {expert.description}
              </p>
            </article>
          </MotionBlock>
        ))}
      </div>

      <MotionBlock delay={0.14}>
        <div className="rounded-[32px] border border-[#E5E7EB] bg-white/78 p-8 backdrop-blur">
          <p className="small-label text-[#B98979]">Process</p>
          <div className="mt-6 grid gap-4 lg:grid-cols-5">
            {weddingPromptProcess.map((step, index) => (
              <div
                key={step}
                className="rounded-[24px] border border-[#E5E7EB] bg-[#FFFCFB] p-5"
              >
                <p className="small-label text-slate-500">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <p className="mt-4 text-lg font-semibold leading-7 text-[#111827]">
                  {step}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="rounded-[24px] bg-[#FFF4EF] p-6">
              <p className="text-lg leading-8 text-slate-700">
                각 전문가 역할은 별도의 Markdown 파일로 관리했고, 관련 논문과
                도메인 자료를 참고하여 판단 기준을 다르게 설계했습니다.
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
