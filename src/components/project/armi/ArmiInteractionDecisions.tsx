import { MotionBlock } from "@/components/ui/MotionBlock";
import { armiInteractionDecisions } from "@/data/armiCaseStudy";
import { ArmiSectionHeading } from "./ArmiSectionHeading";

export function ArmiInteractionDecisions() {
  return (
    <section className="py-[96px] md:py-[160px]">
      <div className="mx-auto max-w-[1280px]">
        <ArmiSectionHeading
          label="Interaction Decisions"
          title="사용자에게 보이지 않는 상태가 UX를 결정했습니다."
        />
        <div className="mt-14 grid gap-6 xl:grid-cols-2">
          {armiInteractionDecisions.map((item, index) => (
            <MotionBlock key={item.title} delay={index * 0.06}>
              <article className="rounded-[32px] border border-[#E2E8F0] bg-white p-8">
                <h3 className="text-3xl font-semibold tracking-[-0.03em] text-[#111827]">
                  {item.title}
                </h3>
                <div className="mt-8 space-y-5">
                  <div className="rounded-[24px] bg-[#F8FAFC] p-5">
                    <p className="small-label text-slate-500">Before</p>
                    <p className="mt-3 text-[18px] leading-[1.75] text-slate-700">
                      {item.before}
                    </p>
                  </div>
                  <div className="rounded-[24px] bg-[#EFF6FF] p-5">
                    <p className="small-label text-blue-600">Decision</p>
                    <p className="mt-3 text-[18px] leading-[1.75] text-slate-700">
                      {item.decision}
                    </p>
                  </div>
                  <div className="rounded-[24px] bg-[#F8FAFC] p-5">
                    <p className="small-label text-slate-500">Frontend Impact</p>
                    <p className="mt-3 text-[18px] leading-[1.75] text-slate-700">
                      {item.impact}
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
