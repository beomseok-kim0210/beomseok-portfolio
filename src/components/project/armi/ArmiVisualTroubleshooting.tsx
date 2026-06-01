import { MotionBlock } from "@/components/ui/MotionBlock";
import { armiTroubleshooting } from "@/data/armiCaseStudy";
import { ArmiSectionHeading } from "./ArmiSectionHeading";

function FlowText({ value }: { value: string }) {
  return (
    <div className="whitespace-pre-line text-[15px] font-semibold leading-7 text-slate-700">
      {value}
    </div>
  );
}

export function ArmiVisualTroubleshooting() {
  return (
    <section className="py-[96px] md:py-[160px]">
      <div className="mx-auto max-w-[1280px]">
        <ArmiSectionHeading
          label="Visual Troubleshooting"
          title={"문제 → 원인 → 해결 → 결과가\n한눈에 보이도록 정리했습니다."}
          subtitle="각 이슈는 단순 순번이 아니라 시스템에서 충돌한 자원과 정책 기준으로 분류했습니다."
        />
        <div className="mt-14 space-y-8">
          {armiTroubleshooting.map((item, index) => (
            <MotionBlock key={item.category} delay={index * 0.06}>
              <article className="rounded-[40px] border border-[#E2E8F0] bg-white p-6 md:p-10">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
                  {item.category}
                </p>
                <h3 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-[#111827]">
                  {item.title}
                </h3>
                <p className="mt-4 max-w-[840px] text-[18px] leading-[1.7] text-slate-600">
                  {item.diagnosis}
                </p>

                <div className="mt-8 rounded-[28px] bg-[#F8FAFC] p-6 md:min-h-[260px] md:p-8">
                  <div className="grid gap-5 xl:grid-cols-3">
                    <div className="rounded-[24px] border border-slate-200 bg-white p-6">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
                        Before
                      </p>
                      <div className="mt-5">
                        <FlowText value={item.before} />
                      </div>
                    </div>
                    <div className="rounded-[24px] border border-slate-200 bg-white p-6">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
                        Cause
                      </p>
                      <div className="mt-5">
                        <FlowText value={item.cause} />
                      </div>
                    </div>
                    <div className="rounded-[24px] border border-blue-200 bg-[#EFF6FF] p-6">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
                        After
                      </p>
                      <div className="mt-5">
                        <FlowText value={item.after} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(240px,2fr)]">
                  <div className="rounded-[28px] bg-[#F8FAFC] p-6">
                    <div className="space-y-2 text-[15px] leading-[1.7] text-slate-700">
                      <p>
                        <span className="font-semibold text-[#111827]">
                          Problem:
                        </span>{" "}
                        {item.summary.problem}
                      </p>
                      <p>
                        <span className="font-semibold text-[#111827]">
                          Reframe:
                        </span>{" "}
                        {item.summary.reframe}
                      </p>
                      <p>
                        <span className="font-semibold text-[#111827]">
                          Solution:
                        </span>{" "}
                        {item.summary.solution}
                      </p>
                      <p>
                        <span className="font-semibold text-[#111827]">
                          Result:
                        </span>{" "}
                        {item.summary.result}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap content-start gap-2 rounded-[28px] border border-slate-200 p-6">
                    {item.tech.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
                      >
                        {chip}
                      </span>
                    ))}
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
