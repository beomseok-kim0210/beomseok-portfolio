import { MotionBlock } from "@/components/ui/MotionBlock";
import { armiRealtimeLinks, armiRealtimeNodes } from "@/data/armiCaseStudy";
import { ArmiSectionHeading } from "./ArmiSectionHeading";

export function ArmiRealtimeFlow() {
  return (
    <section className="py-[96px] md:py-[160px]">
      <div className="mx-auto max-w-[1280px]">
        <ArmiSectionHeading
          label="Realtime Architecture Flow"
          title="연결된 것과 구독된 것은 달랐습니다."
          subtitle="WebSocket 연결 성공만으로는 실시간 UX가 완성되지 않았습니다. Tablet topic과 Session topic 구독 상태를 분리해야 했습니다."
        />
        <MotionBlock className="mt-14">
          <div className="rounded-[40px] border border-[#0F172A] bg-[#07111F] p-8 text-white md:p-12">
            <div className="grid gap-4 xl:grid-cols-[repeat(11,minmax(0,1fr))] xl:items-center">
              {armiRealtimeNodes.map((node, index) => (
                <div
                  key={`${node.title}-${index}`}
                  className={index < armiRealtimeLinks.length ? "xl:col-span-2" : "xl:col-span-1"}
                >
                  <div className="rounded-[28px] border border-[rgba(148,163,184,0.24)] bg-[rgba(255,255,255,0.08)] p-5">
                    <p className="text-lg font-semibold">{node.title}</p>
                    <p className="mt-2 text-sm text-slate-300">{node.detail}</p>
                  </div>
                  {index < armiRealtimeLinks.length ? (
                    <div className="py-3 text-center text-sm font-semibold text-blue-200 xl:py-0 xl:text-left">
                      {armiRealtimeLinks[index]}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="mt-10 grid gap-6 xl:grid-cols-3">
              <div className="rounded-[28px] border border-[rgba(148,163,184,0.24)] bg-[rgba(255,255,255,0.06)] p-6">
                <p className="small-label text-blue-200">Tablet Topic</p>
                <p className="mt-4 font-mono text-sm text-white">
                  /topic/tablets/{"{tabletId}"}
                </p>
              </div>
              <div className="rounded-[28px] border border-[rgba(148,163,184,0.24)] bg-[rgba(255,255,255,0.06)] p-6">
                <p className="small-label text-blue-200">Session Topic</p>
                <p className="mt-4 font-mono text-sm text-white">
                  /topic/tablets/{"{tabletId}"}/sessions/{"{sessionId}"}
                </p>
              </div>
              <div className="rounded-[28px] border border-[rgba(148,163,184,0.24)] bg-[rgba(255,255,255,0.06)] p-6">
                <p className="small-label text-blue-200">Connection / Subscription</p>
                <div className="mt-4 space-y-2 text-sm text-slate-200">
                  <p>Connection State: connected / reconnecting / failed</p>
                  <p>
                    Subscription State: tablet subscribed / session subscribed /
                    stale
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-8 rounded-[28px] bg-[rgba(255,255,255,0.06)] p-6">
              <p className="text-[18px] leading-[1.75] text-slate-200">
                Connected 상태와 Subscribed 상태를 분리해서 봐야 실시간 이벤트
                누락을 추적할 수 있었습니다.
              </p>
            </div>
          </div>
        </MotionBlock>
      </div>
    </section>
  );
}
