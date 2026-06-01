import { MotionBlock } from "@/components/ui/MotionBlock";
import { armiStateGroups } from "@/data/armiCaseStudy";
import { ArmiSectionHeading } from "./ArmiSectionHeading";

export function ArmiStateMachine() {
  return (
    <section className="py-[96px] md:py-[160px]">
      <div className="mx-auto max-w-[1280px]">
        <ArmiSectionHeading
          label="Frontend State System"
          title={"언제 듣고,\n언제 말하지 않을지를 먼저 정했습니다."}
          subtitle="STT, TTS, 발화자 검증은 모두 마이크를 공유했습니다. 그래서 기능 순서가 아니라 “마이크 소유권” 기준으로 상태를 나눴습니다."
        />
        <MotionBlock className="mt-14">
          <div className="rounded-[40px] border border-[#E2E8F0] bg-[#F8FAFC] p-6 md:p-10">
            <div className="grid gap-6 xl:grid-cols-3">
              {armiStateGroups.map((group) => (
                <article
                  key={group.title}
                  className="flex min-h-[360px] flex-col rounded-[32px] border border-[#E2E8F0] bg-white p-8"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
                    {group.step} {group.title}
                  </p>
                  <div className="mt-8 flex flex-1 flex-col justify-center">
                    {group.nodes.map((node, index) => (
                      <div key={node}>
                        <div className="rounded-full border border-slate-200 bg-[#F8FAFC] px-5 py-3 text-center text-sm font-semibold text-[#111827]">
                          {node}
                        </div>
                        {index < group.nodes.length - 1 ? (
                          <div className="py-2 text-center text-lg font-semibold text-slate-300">
                            ↓
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <p className="mt-8 border-t border-slate-200 pt-5 text-[15px] font-semibold leading-7 text-slate-700">
                    {group.rule}
                  </p>
                </article>
              ))}
            </div>
            <div className="mt-10 rounded-[28px] bg-white p-6">
              <p className="small-label text-blue-600">State Transition Insight</p>
              <p className="mt-4 text-[18px] leading-[1.7] text-slate-700">
                핵심 전환 기준은 기능 완료가 아니라 “마이크를 누가 점유하는가”였습니다.
              </p>
            </div>
          </div>
        </MotionBlock>
      </div>
    </section>
  );
}
