import { MotionBlock } from "@/components/ui/MotionBlock";
import {
  weddingEnvironmentSteps,
  weddingEnvironmentSummary,
} from "@/data/weddingResearch";

export function WeddingEnvironmentChallenge() {
  return (
    <div className="space-y-12">
      <MotionBlock>
        <p className="small-label text-[#B98979]">Environment Challenge</p>
        <h2 className="mt-6 max-w-[980px] text-[44px] font-bold leading-[0.95] tracking-[-0.04em] text-[#111827] md:text-[72px]">
          모델보다 환경 구축이 더 어려웠습니다.
        </h2>
      </MotionBlock>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {weddingEnvironmentSteps.map((item, index) => (
          <MotionBlock key={item.step} delay={index * 0.04}>
            <article className="relative h-full rounded-[28px] border border-[#E5E7EB] bg-white/80 p-6 backdrop-blur">
              <p className="small-label text-[#B98979]">{item.step}</p>
              <p className="mt-5 text-xl font-semibold leading-tight text-[#111827]">
                {item.title}
              </p>
              {index < weddingEnvironmentSteps.length - 1 ? (
                <div className="mt-6 h-8 w-px bg-[#E5E7EB] xl:absolute xl:right-[-18px] xl:top-1/2 xl:h-px xl:w-9 xl:-translate-y-1/2" />
              ) : null}
            </article>
          </MotionBlock>
        ))}
      </div>

      <div className="max-w-[840px] space-y-5">
        {weddingEnvironmentSummary.map((paragraph, index) => (
          <MotionBlock key={paragraph} delay={0.12 + index * 0.06}>
            <p className="project-body">
              {paragraph}
            </p>
          </MotionBlock>
        ))}
      </div>
    </div>
  );
}
