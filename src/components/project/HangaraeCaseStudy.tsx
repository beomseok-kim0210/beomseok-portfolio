import { existsSync } from "node:fs";
import path from "node:path";
import { ArrowRight } from "lucide-react";
import { MotionBlock } from "@/components/ui/MotionBlock";
import {
  hangaraeDemoFilm,
  hangaraeHero,
  hangaraeOverviewCards,
  hangaraeResultMetrics,
  hangaraeResultParagraph,
  hangaraeTechGroups,
  hangaraeTroubles,
  type HangaraeTrouble,
} from "@/data/hangaraeCaseStudy";
import { HangaraeMediaSurface } from "./hangarae/HangaraeMediaSurface";
import { HangaraeSectionHeading } from "./hangarae/HangaraeSectionHeading";

function resolvePublicAssetSrc(...candidates: Array<string | undefined>) {
  for (const src of candidates) {
    if (!src) continue;

    if (/^https?:\/\//.test(src)) {
      return src;
    }

    const relativePath = decodeURIComponent(src).replace(/^\//, "");
    const absolutePath = path.join(process.cwd(), "public", relativePath);

    if (existsSync(absolutePath)) {
      return src;
    }
  }

  return undefined;
}

function TroubleSummary({ trouble }: { trouble: HangaraeTrouble }) {
  const items = [
    ["Problem", trouble.problem],
    ["Cause", trouble.cause],
    ["Decision", trouble.decision],
    ["Result", trouble.result],
  ];

  return (
    <div className="rounded-[32px] border border-[#E2E8F0] bg-white p-8 md:p-10">
      <div className="space-y-6">
        {items.map(([label, body]) => (
          <div key={label}>
            <p className="small-label text-[#22C55E]">{label}</p>
            <p className="project-body mt-3">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepDiagram({
  steps,
}: {
  steps: string[];
  columns?: string;
}) {
  return (
    <div className="rounded-[32px] border border-[#E2E8F0] bg-white p-5 md:p-8">
      <div className="mb-5 flex items-center justify-between gap-4 border-b border-[#EEF2F6] pb-5">
        <div>
          <p className="small-label text-[#22C55E]">System Flow</p>
          <p className="project-caption mt-2 max-w-[480px]">
            데이터가 어떤 판정을 거쳐 사용자 피드백으로 바뀌는지 한 줄 흐름으로 정리했습니다.
          </p>
        </div>
        <p className="shrink-0 text-xs font-semibold tracking-[0.14em] text-slate-400">
          {steps.length} STAGES
        </p>
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max items-stretch gap-2">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center gap-2">
              <div className="flex w-[148px] flex-col justify-between rounded-[20px] border border-[#E2E8F0] bg-[#F8FAFC] p-4 md:w-[164px]">
                <span className="small-label text-[#22C55E]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="mt-5 text-[15px] font-semibold leading-[1.2] tracking-[-0.02em] text-[#111827] md:text-base">
                  {step}
                </p>
              </div>
              {index < steps.length - 1 ? (
                <ArrowRight className="h-4 w-4 shrink-0 text-[#22C55E]" />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getTroubleFlow(trouble: HangaraeTrouble) {
  switch (trouble.visualType) {
    case "asset-pipeline":
      return {
        steps: ["Claude Code", "MCP", "Blender / Unity", "GLB Export", "Three.js"],
        columns: "md:grid-cols-2 xl:grid-cols-5",
      };
    case "correct-feedback":
      return {
        steps: ["Coordinate", "Joint Angle", "Threshold Pass", "Success Animation", "Positive Feedback"],
        columns: "md:grid-cols-2 xl:grid-cols-5",
      };
    case "incorrect-feedback":
      return {
        steps: ["Coordinate", "Joint Angle", "Threshold Fail", "Correction Message", "Retry Feedback"],
        columns: "md:grid-cols-2 xl:grid-cols-5",
      };
    case "pinpoint-visual":
      return {
        steps: ["18 Keypoints", "3D Pinpoint", "Skeleton Line", "Motion Feedback"],
        columns: "md:grid-cols-2 xl:grid-cols-4",
      };
    case "coordinate-pipeline":
      return {
        steps: ["Sensor", "Jetson Nano", "Depth Camera", "YOLO", "Redis", "Frontend", "Three.js"],
        columns: "md:grid-cols-3 xl:grid-cols-7",
      };
    default:
      return {
        steps: ["Coordinate", "Angle", "Exercise-specific Threshold", "Correct / Incorrect", "Feedback"],
        columns: "md:grid-cols-2 xl:grid-cols-5",
      };
  }
}

function TroubleSignalPanel({ trouble }: { trouble: HangaraeTrouble }) {
  const isFlow = trouble.metricBody.includes("->");
  const stages = isFlow
    ? trouble.metricBody.split("->").map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="rounded-[28px] bg-[#0F172A] p-6 md:p-8">
      {/* Row 1: 헤더 */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="small-label text-[#22C55E]">Signal Translation</p>
          <p className="mt-3 text-[20px] font-semibold leading-[1.2] tracking-[-0.02em] text-white md:text-[22px]">
            {trouble.metricTitle}
          </p>
        </div>
        <p className="shrink-0 text-right text-sm text-slate-400">
          {isFlow ? stages.length : "—"} stages · {trouble.tech.length} tech
        </p>
      </div>

      {/* Row 2: Flow */}
      <div className="mt-5 border-t border-white/10 pt-5">
        {isFlow ? (
          <div className="flex flex-wrap items-center gap-2">
            {stages.map((stage, index) => (
              <div key={`${trouble.id}-${stage}-${index}`} className="flex items-center gap-2">
                <span className="rounded-full border border-white/[0.12] bg-white/[0.08] px-3.5 py-1.5 text-sm font-medium text-white/85">
                  {stage}
                </span>
                {index < stages.length - 1 ? (
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#22C55E]" />
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-slate-400">
            {trouble.metricBody}
          </p>
        )}
      </div>

      {/* Row 3: Tech */}
      <div className="mt-5 border-t border-white/10 pt-5">
        <p className="small-label mb-3 text-[#22C55E]">Tech Focus</p>
        <div className="flex flex-wrap gap-2">
          {trouble.tech.map((item) => (
            <span
              key={item}
              className="rounded-full border border-white/[0.1] bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-slate-300"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeedbackMediaPair({
  leftTitle,
  rightTitle,
  leftSrc,
  rightSrc,
}: {
  leftTitle: string;
  rightTitle: string;
  leftSrc?: string;
  rightSrc?: string;
}) {
  return (
    <div className="grid gap-6">
      <div className="rounded-[32px] border border-[#E2E8F0] bg-white p-5">
        <p className="small-label text-[#22C55E]">{leftTitle}</p>
        <HangaraeMediaSurface
          src={leftSrc}
          alt={leftTitle}
          type="image"
          fit="contain"
          className="mt-5 h-auto w-full bg-white"
        />
      </div>
      <div className="rounded-[32px] border border-[#E2E8F0] bg-white p-5">
        <p className="small-label text-[#22C55E]">{rightTitle}</p>
        <HangaraeMediaSurface
          src={rightSrc}
          alt={rightTitle}
          type="image"
          fit="contain"
          className="mt-5 h-auto w-full bg-white"
        />
      </div>
    </div>
  );
}

function TroubleEvidence({ trouble }: { trouble: HangaraeTrouble }) {
  if (trouble.visualType === "asset-pipeline") {
    return (
      <div className="space-y-6">
        <div className="grid gap-6">
          <HangaraeMediaSurface
            src={resolvePublicAssetSrc(trouble.imageSrc, trouble.fallbackImageSrc)}
            alt="MCP asset pipeline"
            type="image"
            fit="contain"
            className="min-h-[420px] w-full bg-white"
          />
          <HangaraeMediaSurface
            src={resolvePublicAssetSrc(trouble.secondaryImageSrc)}
            alt="GLB to Three.js asset flow"
            type="image"
            fit="contain"
            className="min-h-[420px] w-full bg-white"
          />
        </div>
      </div>
    );
  }

  if (trouble.visualType === "correct-feedback") {
    return (
      <div className="space-y-6">
        <FeedbackMediaPair
          leftTitle="Upper Body Correct"
          rightTitle="Lower Body Correct"
          leftSrc={resolvePublicAssetSrc(trouble.videoSrc)}
          rightSrc={resolvePublicAssetSrc(trouble.secondaryVideoSrc)}
        />
      </div>
    );
  }

  if (trouble.visualType === "incorrect-feedback") {
    return (
      <div className="space-y-6">
        <FeedbackMediaPair
          leftTitle="Upper Body Incorrect"
          rightTitle="Lower Body Incorrect"
          leftSrc={resolvePublicAssetSrc(trouble.videoSrc)}
          rightSrc={resolvePublicAssetSrc(trouble.secondaryVideoSrc)}
        />
      </div>
    );
  }

  if (trouble.visualType === "pinpoint-visual") {
    return (
      <div className="space-y-6">
        <HangaraeMediaSurface
          src={resolvePublicAssetSrc(trouble.videoSrc, trouble.imageSrc, trouble.fallbackImageSrc)}
          alt="3D pinpoint visualization"
          type={resolvePublicAssetSrc(trouble.videoSrc) ? "video" : "image"}
          fit="contain"
          className="min-h-[560px] w-full bg-white"
        />
      </div>
    );
  }

  if (trouble.visualType === "coordinate-pipeline") {
    return (
      <div className="space-y-6">
        <div className="rounded-[28px] bg-[#F8FAFC] p-6 md:p-8">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-[#E2E8F0] bg-white p-6">
              <p className="small-label text-slate-500">Tracked Keypoints</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#111827]">18</p>
            </div>
            <div className="rounded-[24px] border border-[#E2E8F0] bg-white p-6">
              <p className="small-label text-slate-500">Per Frame</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#111827]">54 Values</p>
            </div>
            <div className="rounded-[24px] border border-[#E2E8F0] bg-white p-6">
              <p className="small-label text-slate-500">State Goal</p>
              <p className="mt-3 text-lg font-semibold text-[#111827]">Realtime coordinate stream</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-[#F8FAFC] p-6 md:p-8">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-[#DCFCE7] bg-[#F0FDF4] p-6">
            <p className="small-label text-[#15803D]">Correct Zone</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#166534]">Green Line</p>
          </div>
          <div className="rounded-[24px] border border-[#FECACA] bg-[#FEF2F2] p-6">
            <p className="small-label text-[#B91C1C]">Incorrect Zone</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#991B1B]">Red Line</p>
          </div>
          <div className="rounded-[24px] border border-[#E2E8F0] bg-white p-6">
            <p className="small-label text-slate-500">Decision Zone</p>
            <p className="mt-3 text-lg font-semibold text-[#111827]">Exercise-specific threshold</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoFilm() {
  const demoSrc = resolvePublicAssetSrc(hangaraeDemoFilm.src);

  return (
    <section className="py-[96px] md:py-[180px]">
      <div className="mx-auto max-w-[1280px]">
        <HangaraeSectionHeading
          label="Full Demo Film"
          title={"1분 40초 안에 전체 흐름을\n먼저 보여드립니다."}
          subtitle={hangaraeDemoFilm.detailCaption}
        />
        <MotionBlock className="mt-14">
          <HangaraeMediaSurface
            src={demoSrc}
            alt="Hangarae full case film"
            type="video"
            fit="cover"
            controls
            preload="metadata"
            caption={hangaraeDemoFilm.caption}
            className="aspect-video w-full bg-[#0F172A] shadow-[0_40px_100px_rgba(15,23,42,0.18)]"
          />
        </MotionBlock>
      </div>
    </section>
  );
}

export function HangaraeCaseStudy() {
  return (
    <>
      <section className="py-[96px] md:py-[180px]">
        <div className="mx-auto max-w-[1280px]">
          <MotionBlock>
            <p className="project-section-label text-[#22C55E]">{hangaraeHero.eyebrow}</p>
            <h1 className="mt-8 text-[44px] font-bold leading-[0.95] tracking-[-0.04em] text-[#111827] md:text-[72px]">
              {hangaraeHero.title.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h1>
              <p className="project-body mt-8 max-w-[840px]">
              {hangaraeHero.subtitle}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              {hangaraeHero.metrics.map((metric) => (
                <span
                  key={metric}
                  className="rounded-full border border-[#DCFCE7] bg-[#F0FDF4] px-4 py-3 text-sm font-semibold text-[#15803D]"
                >
                  {metric}
                </span>
              ))}
            </div>
          </MotionBlock>
        </div>
      </section>

      <DemoFilm />

      <section className="py-[96px] md:py-[180px]">
        <div className="mx-auto max-w-[1280px]">
          <HangaraeSectionHeading
            label="Troubleshooting Overview"
            title={"이 프로젝트는 6개의 병목을\n해결하는 과정이었습니다."}
            subtitle="자산 제작부터 실시간 좌표 처리, 자세 판단까지 순서대로 문제가 발생했고, 각 문제를 풀면서 재활 피드백 구조를 완성했습니다."
          />
          <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {hangaraeOverviewCards.map((card, index) => (
              <MotionBlock key={card.id} delay={index * 0.04}>
                <a
                  href={`#${card.id}`}
                  className="flex h-full min-h-[220px] flex-col rounded-[28px] border border-[#E2E8F0] bg-white p-7 transition-transform duration-200 hover:-translate-y-1"
                >
                  <p className="small-label text-[#22C55E]">{card.label}</p>
                  <p className="mt-5 text-2xl font-semibold leading-[1.2] tracking-[-0.03em] text-[#111827]">
                    {card.title}
                  </p>
                  <p className="project-caption mt-4">
                    {card.summary}
                  </p>
                </a>
              </MotionBlock>
            ))}
          </div>
        </div>
      </section>

      {hangaraeTroubles.map((trouble, index) => (
        <section
          key={trouble.id}
          id={trouble.id}
          className="min-h-screen py-[96px] md:py-[180px]"
        >
          <div className="mx-auto max-w-[1280px]">
            <div className="mb-12">
              <HangaraeSectionHeading
                label={trouble.label}
                title={trouble.title}
                subtitle={trouble.diagnosis}
              />
            </div>
            {(() => {
              const flow = getTroubleFlow(trouble);
              return (
                <MotionBlock delay={0.02} className="mb-10">
                  <StepDiagram steps={flow.steps} columns={flow.columns} />
                </MotionBlock>
              );
            })()}
            <div className="grid gap-8 xl:grid-cols-12">
              <MotionBlock delay={index * 0.02} className="xl:col-span-5">
                <div className="xl:sticky xl:top-[120px]">
                  <TroubleSummary trouble={trouble} />
                </div>
              </MotionBlock>
              <div className="space-y-6 xl:col-span-7">
                <MotionBlock delay={0.06}>
                  <TroubleEvidence trouble={trouble} />
                </MotionBlock>
              </div>
            </div>
            <MotionBlock delay={0.12} className="mt-8">
              <TroubleSignalPanel trouble={trouble} />
            </MotionBlock>
          </div>
        </section>
      ))}

      <section className="py-[96px] md:py-[180px]">
        <div className="mx-auto max-w-[1280px]">
          <HangaraeSectionHeading
            label="Result"
            title={"결국 만든 것은 재활 게임이 아니라\n좌표를 피드백으로 바꾸는 구조였습니다."}
            subtitle={hangaraeResultParagraph}
          />
          <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {hangaraeResultMetrics.map((metric, index) => (
              <MotionBlock key={metric.label} delay={index * 0.04}>
                <div className="h-full rounded-[32px] border border-[#E2E8F0] bg-white p-7">
                  <p className="text-[44px] font-bold leading-none tracking-[-0.04em] text-[#111827]">
                    {metric.value}
                  </p>
                  <p className="mt-4 text-xl font-semibold tracking-[-0.03em] text-[#111827]">
                    {metric.label}
                  </p>
                  <p className="project-caption mt-3">
                    {metric.description}
                  </p>
                </div>
              </MotionBlock>
            ))}
          </div>
        </div>
      </section>

      <section className="py-[96px] md:py-[180px]">
        <div className="mx-auto max-w-[1280px]">
          <HangaraeSectionHeading
            label="Tech Stack"
            title={"기술은 기능 목록이 아니라\n각 병목을 해결하기 위한 도구였습니다."}
            subtitle="자산 제작, 자세 판단, 실시간 좌표 처리, 시각 피드백을 각각 다른 문제로 보고 필요한 기술을 묶었습니다."
          />
          <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {hangaraeTechGroups.map((group, index) => (
              <MotionBlock key={group.label} delay={index * 0.04}>
                <div className="h-full rounded-[32px] border border-[#E2E8F0] bg-white p-7">
                  <p className="small-label text-[#22C55E]">{group.label}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {group.items.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm font-semibold text-slate-700"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </MotionBlock>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
