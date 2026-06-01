import { MotionBlock } from "@/components/ui/MotionBlock";
import { armiInteractionDecisions } from "@/data/armiCaseStudy";
import { ArmiSectionHeading } from "./ArmiSectionHeading";

export function ArmiInteractionDecisions() {
  return (
    <section className="py-[96px] md:py-[160px]">
      <div className="mx-auto max-w-[1280px]">
        <ArmiSectionHeading
          label="Interaction Decisions"
          title="보이지 않는 상태 결정이 UX를 바꿨습니다."
          subtitle="각 결정은 문제를 줄이고, 사용자가 체감하는 흐름을 안정시키는 기준으로 정리했습니다."
        />
        <div className="mt-14 grid gap-5 xl:grid-cols-2">
          {armiInteractionDecisions.map((item, index) => (
            <MotionBlock key={item.title} delay={index * 0.06}>
              <article className="rounded-[32px] border border-[#E2E8F0] bg-white p-7">
                <h3 className="text-2xl font-semibold tracking-[-0.02em] text-[#111827]">
                  {item.title}
                </h3>
                <div className="mt-7 space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
                      Problem
                    </p>
                    <p className="mt-2 text-[15px] leading-7 text-slate-700">
                      {item.problem}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
                      Decision
                    </p>
                    <p className="mt-2 text-[15px] leading-7 text-slate-700">
                      {item.decision}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
                      UX Result
                    </p>
                    <p className="mt-2 text-[15px] leading-7 text-slate-700">
                      {item.result}
                    </p>
                  </div>
                </div>
              </article>
            </MotionBlock>
          ))}
        </div>
      </div>
    </section>
  );
}
