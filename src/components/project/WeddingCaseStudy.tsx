import type { ProjectDetail } from "@/types/portfolio";
import { MotionBlock } from "@/components/ui/MotionBlock";
import {
  weddingHeroChips,
  weddingReflection,
  weddingResearchQuestion,
  weddingTimeline,
  weddingVisualAnalysis,
} from "@/data/weddingResearch";
import { WeddingExpertPromptSystem } from "./WeddingExpertPromptSystem";
import { WeddingFailureMatrix } from "./WeddingFailureMatrix";
import { WeddingModelComparison } from "./WeddingModelComparison";
import { WeddingPivotSection } from "./WeddingPivotSection";
import { WeddingResearchImage } from "./WeddingResearchImage";

type WeddingCaseStudyProps = {
  project: ProjectDetail;
};

function TimelineStatus({ result }: { result: string }) {
  const tone =
    result === "Partial Success"
      ? "border-[rgba(185,137,121,0.28)] bg-[#FFF4EF] text-[#9A6E60]"
      : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-2 text-xs font-semibold ${tone}`}
    >
      {result}
    </span>
  );
}

export function WeddingCaseStudy({ project }: WeddingCaseStudyProps) {
  return (
    <>
      <section className="min-h-[88vh] max-w-[1100px] pt-32 pb-24 md:pt-44 md:pb-32">
        <MotionBlock>
          <p className="small-label text-[#B98979]">AI Research Case Study</p>
          <h1 className="mt-8 text-2xl font-semibold text-slate-500">
            {project.title}
          </h1>
          <h2 className="mt-8 max-w-[980px] text-[44px] font-bold leading-[0.95] tracking-[-0.04em] text-[#111827] md:text-[72px]">
            기술적으로 가능하다고
            <br />
            제품이 되는 것은 아닙니다.
          </h2>
          <p className="mt-10 max-w-[840px] text-[18px] leading-[1.8] text-slate-600">
            2D 이미지를 3D 웨딩드레스로 복원하기 위해 SMPL, PIFuHD, ICON,
            ECON 기반 모델을 직접 검토하고, 실패 원인을 분석한 뒤 제품
            방향을 전환했습니다.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            {weddingHeroChips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-[#E5E7EB] bg-white/80 px-4 py-3 text-sm font-semibold text-slate-600 backdrop-blur"
              >
                {chip}
              </span>
            ))}
          </div>
        </MotionBlock>
      </section>

      <section className="py-24 md:py-[160px]">
        <MotionBlock>
          <p className="small-label text-[#B98979]">Research Question</p>
          <h2 className="mt-6 max-w-[840px] text-[40px] font-bold leading-[0.95] tracking-[-0.04em] text-[#111827] md:text-[64px]">
            왜 3D 웨딩드레스였을까?
          </h2>
        </MotionBlock>
        <div className="mt-10 max-w-[840px] space-y-6">
          {weddingResearchQuestion.map((paragraph, index) => (
            <MotionBlock key={paragraph} delay={index * 0.06}>
              <p className="text-[18px] leading-[1.8] text-slate-600">
                {paragraph}
              </p>
            </MotionBlock>
          ))}
        </div>
      </section>

      <section className="py-24 md:py-[160px]">
        <MotionBlock>
          <p className="small-label text-[#B98979]">Model Research Timeline</p>
          <h2 className="mt-6 max-w-[920px] text-[40px] font-bold leading-[0.95] tracking-[-0.04em] text-[#111827] md:text-[64px]">
            2D → 3D Model Research Timeline
          </h2>
        </MotionBlock>
        <div className="mt-12 grid gap-6 xl:grid-cols-2">
          {weddingTimeline.map((item, index) => (
            <MotionBlock key={item.model} delay={index * 0.06}>
              <article className="h-full rounded-[32px] border border-[#E5E7EB] bg-white/75 p-8 backdrop-blur transition-transform duration-200 hover:-translate-y-1">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="small-label text-[#B98979]">Model</p>
                    <h3 className="mt-4 text-3xl font-semibold text-[#111827]">
                      {item.model}
                    </h3>
                    <p className="mt-2 text-base text-slate-500">{item.type}</p>
                  </div>
                  <TimelineStatus result={item.result} />
                </div>
                <div className="mt-8 space-y-5">
                  <div>
                    <p className="small-label text-slate-500">Core Assumption</p>
                    <p className="mt-3 text-[15px] leading-7 text-slate-600">
                      {item.coreAssumption}
                    </p>
                  </div>
                  <div>
                    <p className="small-label text-slate-500">Why Tried</p>
                    <p className="mt-3 text-[15px] leading-7 text-slate-600">
                      {item.whyTried}
                    </p>
                  </div>
                  <div>
                    <p className="small-label text-slate-500">Reason</p>
                    <p className="mt-3 text-[15px] leading-7 text-slate-600">
                      {item.reason}
                    </p>
                  </div>
                </div>
              </article>
            </MotionBlock>
          ))}
        </div>
      </section>

      <section className="py-24 md:py-[160px]">
        <MotionBlock>
          <p className="small-label text-[#B98979]">Quantitative Comparison</p>
          <h2 className="mt-6 max-w-[920px] text-[40px] font-bold leading-[0.95] tracking-[-0.04em] text-[#111827] md:text-[64px]">
            정량 지표와 제품 적합도를 함께 비교했습니다.
          </h2>
        </MotionBlock>
        <div className="mt-12">
          <WeddingModelComparison />
        </div>
      </section>

      <section className="py-24 md:py-[160px]">
        <MotionBlock>
          <p className="small-label text-[#B98979]">ECON Visual Analysis</p>
          <h2 className="mt-6 max-w-[980px] text-[40px] font-bold leading-[0.95] tracking-[-0.04em] text-[#111827] md:text-[64px]">
            달라붙는 드레스는 가능했지만,
            <br />
            부피가 있는 드레스는 실패했습니다.
          </h2>
        </MotionBlock>
        <MotionBlock delay={0.08} className="mt-12 max-w-[1280px]">
          <WeddingResearchImage
            src={weddingVisualAnalysis.imageSrc}
            alt={weddingVisualAnalysis.imageAlt}
          />
          <p className="mt-6 max-w-[980px] text-[16px] leading-8 text-slate-600">
            {weddingVisualAnalysis.caption}
          </p>
        </MotionBlock>
        <div className="mt-10 grid gap-6 xl:grid-cols-2">
          <MotionBlock delay={0.12}>
            <article className="rounded-[32px] border border-[#E5E7EB] bg-white/75 p-8 backdrop-blur transition-transform duration-200 hover:-translate-y-1">
              <p className="small-label text-[#B98979]">Why It Worked</p>
              <h3 className="mt-5 text-3xl font-semibold text-[#111827]">
                {weddingVisualAnalysis.successTitle}
              </h3>
              <p className="mt-5 text-[18px] leading-[1.8] text-slate-600">
                {weddingVisualAnalysis.successBody}
              </p>
            </article>
          </MotionBlock>
          <MotionBlock delay={0.18}>
            <article className="rounded-[32px] border border-[#E5E7EB] bg-white/75 p-8 backdrop-blur transition-transform duration-200 hover:-translate-y-1">
              <p className="small-label text-[#B98979]">Why It Failed</p>
              <h3 className="mt-5 text-3xl font-semibold text-[#111827]">
                {weddingVisualAnalysis.failureTitle}
              </h3>
              <p className="mt-5 text-[18px] leading-[1.8] text-slate-600">
                {weddingVisualAnalysis.failureBody}
              </p>
            </article>
          </MotionBlock>
        </div>
      </section>

      <section className="py-24 md:py-[160px]">
        <MotionBlock>
          <p className="small-label text-[#B98979]">Failure Analysis Matrix</p>
          <h2 className="mt-6 max-w-[980px] text-[40px] font-bold leading-[0.95] tracking-[-0.04em] text-[#111827] md:text-[64px]">
            모델별 실패 원인 매트릭스
          </h2>
          <p className="mt-6 text-[18px] leading-[1.8] text-slate-600">
            각 모델을 &quot;웨딩드레스 3D 가상 피팅&quot; 관점에서 다시 평가했습니다.
          </p>
        </MotionBlock>
        <div className="mt-12">
          <WeddingFailureMatrix />
        </div>
      </section>

      <section className="py-24 md:py-[160px]">
        <MotionBlock>
          <p className="small-label text-[#B98979]">Product Decision Pivot</p>
          <h2 className="mt-6 max-w-[980px] text-[40px] font-bold leading-[0.95] tracking-[-0.04em] text-[#111827] md:text-[64px]">
            기술을 고집하지 않기로 결정했습니다.
          </h2>
        </MotionBlock>
        <div className="mt-12">
          <WeddingPivotSection />
        </div>
      </section>

      <section className="py-24 md:py-[160px]">
        <MotionBlock>
          <p className="small-label text-[#B98979]">Multi-Agent Prompt Engineering</p>
          <h2 className="mt-6 max-w-[980px] text-[40px] font-bold leading-[0.95] tracking-[-0.04em] text-[#111827] md:text-[64px]">
            하나의 AI보다
            <br />
            5명의 전문가가 더 정확했습니다.
          </h2>
          <p className="mt-8 max-w-[840px] text-[18px] leading-[1.8] text-slate-600">
            3D 복원을 중단한 뒤, 추천 품질을 높이기 위해 하나의 프롬프트에
            모든 판단을 맡기지 않고 5개의 전문가 역할로 판단 기준을
            분리했습니다.
          </p>
        </MotionBlock>
        <div className="mt-12">
          <WeddingExpertPromptSystem />
        </div>
      </section>

      <section className="py-24 md:py-[160px]">
        <MotionBlock>
          <p className="small-label text-[#B98979]">Technical Reflection</p>
          <h2 className="mt-6 max-w-[980px] text-[40px] font-bold leading-[0.95] tracking-[-0.04em] text-[#111827] md:text-[64px]">
            실패한 기술에서
            <br />
            더 많은 것을 배웠습니다.
          </h2>
        </MotionBlock>
        <div className="mt-10 max-w-[840px] space-y-6">
          {weddingReflection.map((paragraph, index) => (
            <MotionBlock key={paragraph} delay={index * 0.06}>
              <p className="text-[18px] leading-[1.8] text-slate-600">
                {paragraph}
              </p>
            </MotionBlock>
          ))}
        </div>
      </section>
    </>
  );
}
