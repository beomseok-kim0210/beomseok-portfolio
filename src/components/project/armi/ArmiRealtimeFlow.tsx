import { MotionBlock } from "@/components/ui/MotionBlock";
import { armiRealtimeSteps } from "@/data/armiCaseStudy";
import { ArmiSectionHeading } from "./ArmiSectionHeading";
import type { ReactNode } from "react";

function FormulaPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-slate-200 bg-[#F8FAFC] px-5 py-4 text-[22px] font-semibold leading-[1.35] text-slate-700">
      {children}
    </span>
  );
}

export function ArmiRealtimeFlow() {
  return (
    <section className="py-[96px] md:py-[160px]">
      <div className="mx-auto max-w-[1280px]">
        <ArmiSectionHeading
          label="Realtime Architecture Flow"
          title={"WebSocket 연결만으로는\n실시간 UX가 완성되지 않았습니다."}
          subtitle="서버와 연결되어도 필요한 Topic을 다시 구독하지 않으면 이벤트는 도착하지 않았습니다."
        />
        <MotionBlock className="mt-14">
          <div className="rounded-[40px] border border-[#E2E8F0] bg-white p-6 md:p-10">
            <div className="grid gap-6 xl:grid-cols-2">
              <article className="rounded-[32px] border border-slate-200 bg-[#F8FAFC] p-8">
                <p className="step-label text-slate-500">
                  Wrong Assumption
                </p>
                <div className="mt-10 flex min-h-[180px] flex-col items-center justify-center gap-5 text-center">
                  <FormulaPill>WebSocket Connected</FormulaPill>
                  <span className="text-3xl font-bold text-slate-300">=</span>
                  <FormulaPill>Realtime Ready</FormulaPill>
                </div>
                <p className="project-caption mt-8 rounded-[20px] bg-white px-5 py-4 text-center font-semibold text-red-600">
                  결과: 이벤트 누락 발생
                </p>
              </article>
              <article className="rounded-[32px] border border-blue-200 bg-[#EFF6FF] p-8">
                <p className="step-label text-blue-600">
                  Correct Model
                </p>
                <div className="mt-10 flex min-h-[180px] flex-col items-center justify-center gap-4 text-center">
                  <FormulaPill>WebSocket Connected</FormulaPill>
                  <span className="font-bold text-blue-500">+</span>
                  <FormulaPill>Tablet Topic Subscribed</FormulaPill>
                  <span className="font-bold text-blue-500">+</span>
                  <FormulaPill>Session Topic Subscribed</FormulaPill>
                  <span className="text-2xl font-bold text-blue-500">=</span>
                  <span className="rounded-full bg-blue-600 px-6 py-4 text-[22px] font-semibold leading-[1.35] text-white">
                    Realtime Ready
                  </span>
                </div>
                <p className="project-caption mt-8 rounded-[20px] bg-white px-5 py-4 text-center font-semibold text-blue-700">
                  결과: 이벤트 복구 가능
                </p>
              </article>
            </div>

            <div className="mt-8 rounded-[28px] bg-[#F8FAFC] p-6 md:p-8">
              <p className="step-label text-blue-600">
                Realtime Ready Flow
              </p>
              <div className="mt-6 grid gap-3 md:grid-cols-5">
                {armiRealtimeSteps.map((step, index) => (
                  <div key={step} className="flex md:block">
                    <div className="flex min-h-[96px] flex-1 flex-col justify-between rounded-[22px] border border-slate-200 bg-white p-4">
                      <span className="text-[18px] font-semibold text-blue-600">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <p className="mt-4 text-[22px] font-semibold leading-[1.45] text-slate-700">
                        {step}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 grid gap-4 xl:grid-cols-2">
              <div className="rounded-[24px] border border-slate-200 bg-[#0F172A] p-6 text-white">
                <p className="step-label text-blue-200">
                  Tablet
                </p>
                <code className="mt-4 block rounded-[16px] bg-white/10 px-4 py-3 text-[18px] leading-[1.6]">
                  /topic/tablets/{"{tabletId}"}
                </code>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-[#0F172A] p-6 text-white">
                <p className="step-label text-blue-200">
                  Session
                </p>
                <code className="mt-4 block rounded-[16px] bg-white/10 px-4 py-3 text-[18px] leading-[1.6]">
                  /topic/tablets/{"{tabletId}"}/sessions/{"{sessionId}"}
                </code>
              </div>
            </div>
          </div>
        </MotionBlock>
      </div>
    </section>
  );
}
