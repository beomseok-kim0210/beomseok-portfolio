import { MotionBlock } from "@/components/ui/MotionBlock";
import { armiTroubleshooting } from "@/data/armiCaseStudy";
import { ArmiSectionHeading } from "./ArmiSectionHeading";

function AudioOwnershipDiagram() {
  const beforeItems = ["Wake Word", "STT", "Speaker Verification", "TTS"];
  const afterItems = [
    "Wake Word",
    "Speaker Verification Capture",
    "STT Listen",
    "TTS Speaking",
    "STT Restart",
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-[24px] bg-white p-5">
        <p className="small-label text-slate-500">Before</p>
        <div className="mt-5 flex flex-wrap gap-3">
          {beforeItems.map((item) => (
            <span
              key={item}
              className="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
            >
              {item}
            </span>
          ))}
        </div>
        <p className="mt-5 text-sm text-slate-500">
          모두 동시에 Microphone 접근
        </p>
      </div>
      <div className="rounded-[24px] bg-white p-5">
        <p className="small-label text-blue-600">After</p>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-700">
          {afterItems.map((item, index) => (
            <div key={item} className="flex items-center gap-3">
              <span className="rounded-full border border-blue-200 bg-blue-50 px-4 py-3">
                {item}
              </span>
              {index < afterItems.length - 1 ? <span>→</span> : null}
            </div>
          ))}
        </div>
        <p className="mt-5 text-sm text-slate-500">Single Audio Ownership Flow</p>
      </div>
    </div>
  );
}

function TtsLoopDiagram() {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-[24px] bg-white p-5">
        <p className="small-label text-slate-500">Bad Loop</p>
        <div className="mt-5 space-y-3 text-sm font-semibold text-slate-700">
          {["TTS Speaking", "STT Listening", "Self Voice Detected"].map((item) => (
            <div key={item} className="rounded-[20px] border border-slate-200 px-4 py-3">
              {item}
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-[24px] bg-white p-5">
        <p className="small-label text-blue-600">Fixed Loop</p>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-700">
          {[
            "TTS Start",
            "speaking=true",
            "STT disabled",
            "onDone",
            "STT restart",
          ].map((item, index, arr) => (
            <div key={item} className="flex items-center gap-3">
              <span className="rounded-full border border-blue-200 bg-blue-50 px-4 py-3">
                {item}
              </span>
              {index < arr.length - 1 ? <span>→</span> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RealtimeReadyDiagram() {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-[24px] bg-white p-5">
        <p className="small-label text-slate-500">Wrong Assumption</p>
        <p className="mt-5 text-lg font-semibold text-slate-700">
          WebSocket Connected = Realtime Ready
        </p>
      </div>
      <div className="rounded-[24px] bg-white p-5">
        <p className="small-label text-blue-600">Correct Model</p>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-700">
          <span className="rounded-full border border-blue-200 bg-blue-50 px-4 py-3">
            WebSocket Connected
          </span>
          <span>+</span>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-4 py-3">
            Tablet Topic Subscribed
          </span>
          <span>+</span>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-4 py-3">
            Session Topic Subscribed
          </span>
          <span>=</span>
          <span className="rounded-full border border-blue-600 bg-blue-600 px-4 py-3 text-white">
            Realtime Ready
          </span>
        </div>
        <div className="mt-5 space-y-2 font-mono text-xs text-slate-500">
          <p>/topic/tablets/{"{tabletId}"}</p>
          <p>/topic/tablets/{"{tabletId}"}/sessions/{"{sessionId}"}</p>
        </div>
      </div>
    </div>
  );
}

function WatchAlertDiagram() {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {[
        ["Initial Load", "Existing Pending Calls", "No Vibration"],
        ["New Pending Request", "Emergency", "Strong Vibration"],
        ["New Pending Request", "Normal Request", "Light Vibration"],
      ].map(([a, b, c]) => (
        <div key={`${a}-${b}`} className="rounded-[24px] bg-white p-5">
          <p className="small-label text-slate-500">{a}</p>
          <p className="mt-4 text-lg font-semibold text-slate-700">{b}</p>
          <p className="mt-3 text-sm text-slate-500">{c}</p>
        </div>
      ))}
    </div>
  );
}

function DiagramByIndex({ index }: { index: number }) {
  if (index === 0) return <AudioOwnershipDiagram />;
  if (index === 1) return <TtsLoopDiagram />;
  if (index === 2) return <RealtimeReadyDiagram />;
  return <WatchAlertDiagram />;
}

export function ArmiVisualTroubleshooting() {
  return (
    <section className="py-[96px] md:py-[160px]">
      <div className="mx-auto max-w-[1280px]">
        <ArmiSectionHeading
          label="Visual Troubleshooting"
          title="문제를 다시 정의하자 해결 경로가 보였습니다."
        />
        <div className="mt-14 space-y-8">
          {armiTroubleshooting.map((item, index) => (
            <MotionBlock key={item.number} delay={index * 0.06}>
              <article className="rounded-[40px] border border-[#E2E8F0] bg-white p-8 md:p-10">
                <p className="small-label text-blue-600">{item.number}</p>
                <h3 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-[#111827]">
                  {item.title}
                </h3>
                <p className="mt-4 text-[18px] leading-[1.75] text-slate-600">
                  {item.summary}
                </p>
                <div className="mt-8 rounded-[28px] bg-[#F8FAFC] p-6 md:p-7">
                  <DiagramByIndex index={index} />
                </div>
                <div className="mt-8 grid gap-4 xl:grid-cols-2">
                  <div className="rounded-[24px] bg-[#F8FAFC] p-5">
                    <p className="small-label text-slate-500">Problem</p>
                    <p className="mt-3 text-[16px] leading-7 text-slate-700">
                      {item.problem}
                    </p>
                  </div>
                  <div className="rounded-[24px] bg-[#EFF6FF] p-5">
                    <p className="small-label text-blue-600">Reframing</p>
                    <p className="mt-3 text-[16px] leading-7 text-slate-700">
                      {item.reframing}
                    </p>
                  </div>
                  <div className="rounded-[24px] bg-[#F8FAFC] p-5">
                    <p className="small-label text-slate-500">Solution</p>
                    <p className="mt-3 text-[16px] leading-7 text-slate-700">
                      {item.solution}
                    </p>
                  </div>
                  <div className="rounded-[24px] bg-[#F8FAFC] p-5">
                    <p className="small-label text-slate-500">Result</p>
                    <p className="mt-3 text-[16px] leading-7 text-slate-700">
                      {item.result}
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  {item.tech.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </article>
            </MotionBlock>
          ))}
        </div>
      </div>
    </section>
  );
}
