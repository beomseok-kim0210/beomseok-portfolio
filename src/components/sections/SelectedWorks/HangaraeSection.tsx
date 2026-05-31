import { MetricCard } from "@/components/ui/MetricCard";
import { MotionBlock } from "@/components/ui/MotionBlock";
import { SceneQuestion } from "@/components/ui/SceneQuestion";
import { TrackingSkeleton } from "@/components/ui/TrackingSkeleton";
import { VideoRevealScene } from "@/components/ui/VideoRevealScene";
import { projects } from "@/data/projects";

export function HangaraeSection() {
  const project = projects[1];

  return (
    <section className="scene-shell bg-[#F7FFFB] text-[#111827]">
      <SceneQuestion
        label="Rehabilitation AI"
        lines={["운동은 했지만", "정말 올바르게", "움직인 걸까?"]}
      />
      <VideoRevealScene
        title="행가래"
        theme="hangarae"
        eyebrow="SSAFY Project"
        duration="02:51"
      />
      <div className="px-6 py-28">
        <div className="content-grid grid gap-5 md:grid-cols-4">
          {project.productCards.map((card) => (
            <MotionBlock key={card.title}>
              <div className="min-h-[260px] rounded-[32px] border border-emerald-100 bg-white p-7 shadow-soft">
                <p className="small-label text-blue-600">{project.role}</p>
                <h3 className="mt-10 text-2xl font-semibold leading-tight">
                  {card.title}
                </h3>
                <p className="mt-5 text-[15px] leading-7 text-slate-600">
                  {card.description}
                </p>
              </div>
            </MotionBlock>
          ))}
        </div>
      </div>
      <div className="px-6 py-28">
        <div className="content-grid grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <MotionBlock>
            <p className="cinematic-label mb-8 text-[var(--hangarae-accent)]">
              18 Point Tracking
            </p>
            <h3 className="story-title max-w-[760px]">
              움직임을 데이터로 바꾸고,
              <br />
              데이터는 다시 피드백이 됩니다.
            </h3>
          </MotionBlock>
          <MotionBlock delay={0.12}>
            <div className="rounded-[36px] border border-[rgba(36,194,122,0.22)] bg-white p-8 shadow-soft">
              <TrackingSkeleton />
            </div>
          </MotionBlock>
        </div>
      </div>
      <div className="min-h-[80vh] px-6 py-28">
        <div className="content-grid">
          <MotionBlock>
            <p className="cinematic-label mb-8 text-blue-600">On-device Pose AI</p>
            <h3 className="story-title max-w-[900px]">
              발끝까지 추적해야
              <br />
              재활 피드백이 정확해집니다.
            </h3>
            <p className="body-copy mt-8 reading-width text-slate-600">
              기존 YOLOv11 모델은 주요 관절은 인식했지만 재활 동작에서 중요한
              발가락과 발뒤꿈치 포인트를 인식하지 못했습니다. Jetson Nano에서
              동작해야 했기 때문에 추론 속도와 경량화도 함께 고려했습니다.
            </p>
          </MotionBlock>
          <MotionBlock delay={0.12}>
            <div className="mt-16 grid gap-5 md:grid-cols-2">
              {project.metrics?.map((metric) => (
                <MetricCard
                  key={metric.label}
                  {...metric}
                  theme="hangarae"
                />
              ))}
            </div>
            <p className="body-copy mt-10 reading-width text-slate-600">
              MMPOSE로 약 66,950장의 전신 이미지 중 20,507장의 발 데이터를
              직접 선별하고 수동 라벨링했습니다. YOLOv11-M을 파인튜닝해
              온디바이스 환경에서도 안정적인 동작이 가능하도록 구현했습니다.
            </p>
            <p className="mt-8 text-3xl font-semibold">{project.award}</p>
          </MotionBlock>
        </div>
      </div>
    </section>
  );
}
