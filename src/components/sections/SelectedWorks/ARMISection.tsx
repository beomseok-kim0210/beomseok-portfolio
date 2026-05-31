import { AnimatedFlowDiagram, type FlowNode } from "@/components/ui/AnimatedFlowDiagram";
import { MotionBlock } from "@/components/ui/MotionBlock";
import { SceneQuestion } from "@/components/ui/SceneQuestion";
import { VideoRevealScene } from "@/components/ui/VideoRevealScene";
import { projects } from "@/data/projects";

const flowNodes: FlowNode[] = [
  { id: "01", label: "Patient", description: "환자의 음성 요청", tech: ["Tablet"] },
  { id: "02", label: "Voice AI", description: "STT와 발화자 검증", tech: ["SpeechRecognizer", "CAMPPlus"] },
  { id: "03", label: "AI Agent", description: "요청 의도 해석", tech: ["AI Agent"] },
  { id: "04", label: "Backend", description: "미션과 이벤트 생성", tech: ["Spring Boot"] },
  { id: "05", label: "Robot", description: "로봇 작업 수행", tech: ["gRPC"] },
  { id: "06", label: "Tablet", description: "실시간 상태 반영", tech: ["WebSocket"] },
  { id: "07", label: "Watch", description: "의료진 알림", tech: ["WearOS"] },
];

export function ARMISection() {
  const project = projects[0];

  return (
    <section className="scene-shell bg-[#07111F] text-white">
      <SceneQuestion
        dark
        label="Healthcare AI"
        lines={["병실에서", "AI는 어디까지", "사람을 도울 수 있을까?"]}
      />
      <VideoRevealScene
        title="ARMI"
        theme="armi"
        eyebrow="Live Product Demo"
        duration="03:42"
      />
      <div className="min-h-[80vh] px-6 py-28">
        <div className="content-grid">
          <MotionBlock>
            <div className="text-container">
              <p className="cinematic-label mb-8 text-white/55">ARMI</p>
              <h3 className="story-title whitespace-pre-line">{project.headline}</h3>
              <p className="body-copy mt-8 max-w-[620px] text-slate-300">
                {project.description}
              </p>
            </div>
          </MotionBlock>
          <MotionBlock delay={0.12} className="mt-16">
            <AnimatedFlowDiagram nodes={flowNodes} />
          </MotionBlock>
          <MotionBlock delay={0.18}>
            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {project.productCards.map((item) => (
                <div
                  key={item.title}
                  className="min-h-[240px] rounded-[28px] border border-white/10 bg-white/[0.055] p-6"
                >
                  <p className="small-label text-blue-300">Architecture</p>
                  <p className="mt-8 text-2xl font-semibold">{item.title}</p>
                  <p className="mt-4 text-[15px] leading-7 text-slate-300">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </MotionBlock>
          <MotionBlock delay={0.24}>
            <p className="body-copy mt-12 max-w-[680px] text-slate-300">
              {project.description}
            </p>
          </MotionBlock>
        </div>
      </div>
      <div className="px-6 pb-28">
        <div className="content-grid">
          <div className="rounded-[36px] border border-white/10 bg-white/[0.055] p-8">
            <p className="cinematic-label mb-8 text-blue-300">Technical Surface</p>
            <div className="flex flex-wrap gap-3">
              {project.technologies.map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border border-white/10 px-4 py-2 small-label text-slate-200"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
