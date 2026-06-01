import { MotionBlock } from "@/components/ui/MotionBlock";
import { armiStateNodes } from "@/data/armiCaseStudy";
import { ArmiSectionHeading } from "./ArmiSectionHeading";

export function ArmiStateMachine() {
  return (
    <section className="py-[96px] md:py-[160px]">
      <div className="mx-auto max-w-[1280px]">
        <ArmiSectionHeading
          label="Frontend State System"
          title="음성 AI를 기능이 아니라 상태 머신으로 설계했습니다."
          subtitle="STT, TTS, 발화자 검증, 로봇 미션은 각각 독립 기능이 아니라 마이크와 UI 상태를 공유하는 하나의 흐름이었습니다."
        />
        <MotionBlock className="mt-14">
          <div className="rounded-[40px] border border-[#E2E8F0] bg-white p-6 md:p-10">
            <div className="grid gap-4 md:grid-cols-2 xl:flex xl:flex-wrap xl:items-center xl:justify-between">
              {armiStateNodes.map((node, index) => {
                const isActive = node.title === "Speaking";

                return (
                  <div
                    key={node.title}
                    className="relative flex flex-col items-center xl:flex-row xl:items-stretch"
                  >
                    <div
                      className={`flex h-24 w-full max-w-[150px] flex-col justify-center rounded-[24px] border bg-white px-4 text-center xl:w-[150px] ${
                        isActive
                          ? "border-blue-600 shadow-[0_24px_60px_rgba(37,99,235,0.18)]"
                          : "border-slate-300"
                      }`}
                    >
                      <p className="text-sm font-semibold text-[#111827]">
                        {node.title}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        {node.description}
                      </p>
                    </div>
                    {index < armiStateNodes.length - 1 ? (
                      <>
                        <div className="mx-auto hidden h-px w-10 bg-slate-300 xl:block" />
                        <div className="mx-auto flex h-8 w-px bg-slate-300 xl:hidden" />
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <div className="mt-10 rounded-[28px] bg-[#F8FAFC] p-6">
              <p className="small-label text-blue-600">State Transition Insight</p>
              <p className="mt-4 text-[18px] leading-[1.75] text-slate-700">
                핵심은 “언제 듣고, 언제 말하지 않을 것인가”였습니다.
              </p>
            </div>
          </div>
        </MotionBlock>
      </div>
    </section>
  );
}
