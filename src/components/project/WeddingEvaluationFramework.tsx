import { MotionBlock } from "@/components/ui/MotionBlock";
import { weddingEvaluationAxes } from "@/data/weddingResearch";

export function WeddingEvaluationFramework() {
  return (
    <div className="space-y-10">
      <div className="max-w-[840px]">
        <MotionBlock>
          <p className="small-label text-[#B98979]">Model Evaluation Framework</p>
          <h2 className="mt-6 text-[44px] font-bold leading-[0.95] tracking-[-0.04em] text-[#111827] md:text-[72px]">
            모델을 사용하기 전에
            <br />
            평가 기준부터 정의했습니다.
          </h2>
          <p className="mt-8 text-[18px] leading-[1.8] text-slate-600">
            좋은 모델을 찾는 것이 아니라 웨딩드레스 문제를 해결할 수 있는 모델인지
            검증했습니다.
          </p>
        </MotionBlock>
      </div>

      <div className="flex snap-x gap-5 overflow-x-auto pb-2">
        {weddingEvaluationAxes.map((axis, index) => (
          <MotionBlock key={axis.title} delay={index * 0.05} className="shrink-0">
            <article className="flex h-[240px] w-[220px] flex-col justify-between rounded-[28px] border border-[#E5E7EB] bg-white/80 p-6 backdrop-blur transition-transform duration-200 hover:-translate-y-1">
              <div>
                <p className="small-label text-[#B98979]">{axis.step}</p>
                <h3 className="mt-5 text-2xl font-semibold leading-tight text-[#111827]">
                  {axis.title}
                </h3>
              </div>
              <p className="text-[15px] leading-7 text-slate-600">
                {axis.description}
              </p>
            </article>
          </MotionBlock>
        ))}
      </div>
    </div>
  );
}
