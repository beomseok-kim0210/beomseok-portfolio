import { MotionBlock } from "@/components/ui/MotionBlock";
import { weddingResearchInsight } from "@/data/weddingResearch";

function ComparisonMark({ result }: { result: "pass" | "fail" }) {
  return (
    <span
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold ${
        result === "pass"
          ? "bg-emerald-50 text-emerald-600"
          : "bg-rose-50 text-rose-500"
      }`}
    >
      {result === "pass" ? "✓" : "✕"}
    </span>
  );
}

export function WeddingResearchInsight() {
  return (
    <div className="space-y-12">
      <MotionBlock>
        <p className="small-label text-[#B98979]">Research Insight</p>
        <h2 className="mt-6 max-w-[980px] text-[44px] font-bold leading-[0.95] tracking-[-0.04em] text-[#111827] md:text-[72px]">
          문제는 모델의 성능이 아니었습니다.
        </h2>
      </MotionBlock>

      <div className="grid gap-8 xl:grid-cols-[0.85fr_1.3fr_0.85fr] xl:items-start">
        <MotionBlock>
          <article className="rounded-[32px] border border-[#E5E7EB] bg-white/75 p-8 backdrop-blur">
            <p className="small-label text-[#B98979]">Left Problem Space</p>
            <h3 className="mt-5 text-3xl font-semibold text-[#111827]">
              {weddingResearchInsight.leftTitle}
            </h3>
            <p className="project-body mt-5">
              {weddingResearchInsight.leftBody}
            </p>
          </article>
        </MotionBlock>

        <MotionBlock delay={0.06}>
          <article className="rounded-[36px] border border-[#E5E7EB] bg-white/80 p-8 backdrop-blur">
            <p className="small-label text-[#B98979]">Comparison Diagram</p>
            <div className="mt-8 space-y-4">
              {weddingResearchInsight.comparisons.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-[24px] border border-[#E5E7EB] bg-[#FFFCFB] px-5 py-4"
                >
                  <p className="text-lg font-semibold text-[#111827]">
                    {item.label}
                  </p>
                  <ComparisonMark result={item.result} />
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-[24px] bg-[#FFF4EF] p-6">
              <p className="project-body text-[#111827]">
                {weddingResearchInsight.mainInsight}
              </p>
            </div>
            <p className="project-body mt-6">
              {weddingResearchInsight.conclusion}
            </p>
          </article>
        </MotionBlock>

        <MotionBlock delay={0.12}>
          <article className="rounded-[32px] border border-[#E5E7EB] bg-white/75 p-8 backdrop-blur">
            <p className="small-label text-[#B98979]">Right Problem Space</p>
            <h3 className="mt-5 text-3xl font-semibold text-[#111827]">
              {weddingResearchInsight.rightTitle}
            </h3>
            <p className="project-body mt-5">
              {weddingResearchInsight.rightBody}
            </p>
          </article>
        </MotionBlock>
      </div>
    </div>
  );
}
