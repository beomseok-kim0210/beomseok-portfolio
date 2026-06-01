import type { ProjectDetail } from "@/types/portfolio";
import { MotionBlock } from "@/components/ui/MotionBlock";
import {
  weddingHeroChips,
  weddingLearned,
  weddingResearchQuestion,
  weddingTimeline,
  weddingVisualAnalysis,
} from "@/data/weddingResearch";
import { WeddingEnvironmentChallenge } from "./WeddingEnvironmentChallenge";
import { WeddingEvaluationFramework } from "./WeddingEvaluationFramework";
import { WeddingExpertPromptSystem } from "./WeddingExpertPromptSystem";
import { WeddingFailureMatrix } from "./WeddingFailureMatrix";
import { WeddingModelComparison } from "./WeddingModelComparison";
import { WeddingPivotSection } from "./WeddingPivotSection";
import { WeddingResearchImage } from "./WeddingResearchImage";
import { WeddingResearchInsight } from "./WeddingResearchInsight";
import { WeddingResearchStats } from "./WeddingResearchStats";

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

function SectionHeading({
  label,
  title,
  body,
  maxWidth = "max-w-[980px]",
}: {
  label: string;
  title: string;
  body?: string;
  maxWidth?: string;
}) {
  return (
    <MotionBlock>
      <p className="small-label text-[#B98979]">{label}</p>
      <h2
        className={`mt-6 text-[44px] font-bold leading-[0.95] tracking-[-0.04em] text-[#111827] md:text-[72px] ${maxWidth}`}
      >
        {title.split(/\\n|\n/).map((line) => (
          <span key={line}>
            {line}
            <br />
          </span>
        ))}
      </h2>
      {body ? (
        <p className="mt-8 max-w-[840px] text-[18px] leading-[1.8] text-slate-600">
          {body}
        </p>
      ) : null}
    </MotionBlock>
  );
}

export function WeddingCaseStudy({ project }: WeddingCaseStudyProps) {
  return (
    <>
      <section className="min-h-[88vh] max-w-[1100px] pt-32 pb-20 md:pt-44 md:pb-24">
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
            ECON 기반 모델을 직접 검토하고, 실패 원인을 분석한 뒤 제품 방향을
            전환했습니다.
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

      <WeddingResearchStats />

      <section className="py-24 md:py-[180px]">
        <SectionHeading
          label="Research Question"
          title="왜 3D 웨딩드레스였을까?"
          maxWidth="max-w-[840px]"
        />
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

      <section className="py-24 md:py-[180px]">
        <WeddingEvaluationFramework />
      </section>

      <section className="py-24 md:py-[180px]">
        <SectionHeading
          label="Model Research Timeline"
          title="2D → 3D Model Research Timeline"
          body="좋은 모델을 찾는 것이 아니라, 어떤 모델이 실제로 웨딩드레스 문제를 다룰 수 있는지 검증했습니다."
          maxWidth="max-w-[980px]"
        />
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
                  <div className="rounded-[24px] bg-[#FFF4EF] p-5">
                    <p className="small-label text-[#B98979]">Research Outcome</p>
                    <p className="mt-3 text-[15px] leading-7 text-slate-700">
                      {item.outcome}
                    </p>
                  </div>
                </div>
              </article>
            </MotionBlock>
          ))}
        </div>
      </section>

      <section className="py-24 md:py-[180px]">
        <SectionHeading
          label="Quantitative Comparison"
          title="정량 비교는 참고했고,\n의사결정은 구조를 봤습니다."
          body="논문 지표는 참고값으로 사용했고, 실제 선택은 웨딩드레스라는 문제에 대한 구조적 적합성을 중심으로 내렸습니다."
        />
        <div className="mt-12">
          <WeddingModelComparison />
        </div>
      </section>

      <section className="py-24 md:py-[180px]">
        <WeddingResearchInsight />
      </section>

      <section className="py-24 md:py-[180px]">
        <WeddingEnvironmentChallenge />
      </section>

      <section className="py-24 md:py-[180px]">
        <SectionHeading
          label="ECON Visual Analysis"
          title="달라붙는 드레스는 가능했지만,\n부피가 있는 드레스는 실패했습니다."
        />
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
              <p className="small-label text-[#B98979]">Success</p>
              <h3 className="mt-5 text-3xl font-semibold text-[#111827]">
                {weddingVisualAnalysis.successTitle}
              </h3>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] bg-[#FFFCFB] p-5">
                  <p className="small-label text-slate-500">
                    {weddingVisualAnalysis.successMetricLabel}
                  </p>
                  <p className="mt-4 text-2xl font-semibold text-[#111827]">
                    {weddingVisualAnalysis.successMetricValue}
                  </p>
                </div>
                <div className="rounded-[24px] bg-[#FFFCFB] p-5">
                  <p className="small-label text-slate-500">Result</p>
                  <p className="mt-4 text-2xl font-semibold text-[#111827]">
                    {weddingVisualAnalysis.successResult}
                  </p>
                </div>
              </div>
            </article>
          </MotionBlock>
          <MotionBlock delay={0.18}>
            <article className="rounded-[32px] border border-[#E5E7EB] bg-white/75 p-8 backdrop-blur transition-transform duration-200 hover:-translate-y-1">
              <p className="small-label text-[#B98979]">Failure</p>
              <h3 className="mt-5 text-3xl font-semibold text-[#111827]">
                {weddingVisualAnalysis.failureTitle}
              </h3>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] bg-[#FFFCFB] p-5">
                  <p className="small-label text-slate-500">
                    {weddingVisualAnalysis.failureMetricLabel}
                  </p>
                  <p className="mt-4 text-2xl font-semibold text-[#111827]">
                    {weddingVisualAnalysis.failureMetricValue}
                  </p>
                </div>
                <div className="rounded-[24px] bg-[#FFFCFB] p-5">
                  <p className="small-label text-slate-500">Result</p>
                  <p className="mt-4 text-2xl font-semibold text-[#111827]">
                    {weddingVisualAnalysis.failureResult}
                  </p>
                </div>
              </div>
            </article>
          </MotionBlock>
        </div>
        <MotionBlock delay={0.2} className="mt-10 max-w-[1280px]">
          <div className="rounded-[32px] border border-[#E5E7EB] bg-white/75 p-6 backdrop-blur">
            <p className="small-label text-[#B98979]">Failure Detail</p>
            <div className="mt-6">
              <WeddingResearchImage
                src={weddingVisualAnalysis.failureImageSrc}
                alt={weddingVisualAnalysis.failureImageAlt}
              />
            </div>
          </div>
        </MotionBlock>
        <MotionBlock delay={0.22} className="mt-10 max-w-[840px]">
          <p className="text-[18px] leading-[1.8] text-slate-600">
            {weddingVisualAnalysis.explanation}
          </p>
        </MotionBlock>
      </section>

      <section className="py-24 md:py-[180px]">
        <SectionHeading
          label="Failure Analysis Matrix"
          title="모델별 실패 원인 매트릭스"
          body='각 모델을 "웨딩드레스 3D 가상 피팅" 관점에서 다시 평가했습니다.'
        />
        <div className="mt-12">
          <WeddingFailureMatrix />
        </div>
      </section>

      <section className="py-24 md:py-[180px]">
        <SectionHeading
          label="Technical Decision Pivot"
          title="기술을 고집하지 않기로 결정했습니다."
        />
        <div className="mt-12">
          <WeddingPivotSection />
        </div>
      </section>

      <section className="py-24 md:py-[180px]">
        <SectionHeading
          label="Multi-Agent Prompt Engineering"
          title="하나의 AI보다\n5명의 전문가가 더 정확했습니다."
          body="3D 복원을 중단한 뒤, 추천 품질을 높이기 위해 하나의 프롬프트에 모든 판단을 맡기지 않고 5개의 전문가 역할로 판단 기준을 분리했습니다."
        />
        <div className="mt-12">
          <WeddingExpertPromptSystem />
        </div>
      </section>

      <section className="py-24 md:py-[180px]">
        <SectionHeading
          label="What I Learned"
          title={weddingLearned.title}
          maxWidth="max-w-[980px]"
        />
        <div className="mt-10 max-w-[840px] space-y-6">
          {weddingLearned.paragraphs.map((paragraph, index) => (
            <MotionBlock key={paragraph} delay={index * 0.06}>
              <p className="text-[18px] leading-[1.8] text-slate-600">
                {paragraph}
              </p>
            </MotionBlock>
          ))}
        </div>
        <MotionBlock delay={0.18} className="mt-12">
          <blockquote className="rounded-[32px] border border-[#E5E7EB] bg-white/80 p-8 text-center backdrop-blur">
            <p className="small-label text-[#B98979]">Quote</p>
            <p className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[#111827] md:text-4xl">
              {weddingLearned.quote}
            </p>
          </blockquote>
        </MotionBlock>
      </section>
    </>
  );
}
