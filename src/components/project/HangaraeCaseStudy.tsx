import { existsSync } from "node:fs";
import path from "node:path";
import { ArrowRight } from "lucide-react";
import { MotionBlock } from "@/components/ui/MotionBlock";
import {
  hangaraeDemoFilm,
  hangaraeHero,
  hangaraeOverviewCards,
  hangaraeRecap,
  hangaraeResultMetrics,
  hangaraeResultParagraph,
  hangaraeTechGroups,
  hangaraeTroubles,
  type HangaraeTrouble,
} from "@/data/hangaraeCaseStudy";
import { HangaraeMediaSurface } from "./hangarae/HangaraeMediaSurface";
import { HangaraeSectionHeading } from "./hangarae/HangaraeSectionHeading";
import { ProjectRecap } from "./ProjectRecap";

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

// 트러블 → 모색한 방법 → 선택·근거(HERO) → 인사이트 4단계 흐름
function TroubleFlow({ trouble }: { trouble: HangaraeTrouble }) {
  return (
    <div className="space-y-4">
      {/* 트러블 — 빨강 */}
      <div className="rounded-[28px] border border-red-200 bg-red-50 p-7 md:p-8">
        <p className="small-label flex items-center gap-2 text-red-600">
          <span
            className="inline-block h-2 w-2 rounded-full bg-red-500"
            aria-hidden="true"
          />
          트러블
        </p>
        <p className="mt-3 text-[17px] font-semibold leading-7 text-[#111827] md:text-[18px]">
          {trouble.problem}
        </p>
        <p className="mt-2 text-[14px] leading-6 text-red-700/70">
          원인 · {trouble.cause}
        </p>
      </div>

      {/* 모색한 방법 */}
      <div className="rounded-[28px] border border-slate-200 bg-white p-7 md:p-8">
        <p className="small-label text-slate-500">모색한 방법</p>
        <ul className="mt-4 space-y-2.5">
          {trouble.approaches.map((opt, i) => {
            const chosen = i === trouble.approaches.length - 1;
            return (
              <li
                key={opt}
                className={`flex items-start gap-3 rounded-2xl border p-4 ${
                  chosen
                    ? "border-[#86EFAC] bg-[#F0FDF4]"
                    : "border-slate-200 bg-white"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    chosen ? "bg-[#15803D] text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {chosen ? "✓" : i + 1}
                </span>
                <span
                  className={`text-[15px] leading-7 ${
                    chosen ? "font-semibold text-[#111827]" : "text-slate-600"
                  }`}
                >
                  {opt}
                  {chosen && (
                    <span className="ml-2 inline-block rounded-full bg-[#15803D] px-2 py-0.5 text-[11px] font-bold text-white">
                      선택
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* 선택 & 근거 — HERO(녹색) */}
      <div className="rounded-[28px] bg-[#15803D] p-7 text-white md:p-9">
        <p className="small-label text-white/70">선택 &amp; 근거</p>
        <p className="mt-4 text-[19px] font-bold leading-[1.5] tracking-[-0.02em] md:text-[24px]">
          {trouble.decision}
        </p>
        <p className="mt-4 text-[15px] leading-7 text-white/85 md:text-[16px]">
          <span className="font-semibold text-white">왜 이 방법인가 · </span>
          {trouble.rationale}
        </p>
        <div className="mt-6 border-t border-white/15 pt-5">
          <p className="small-label text-white/70">결과</p>
          <p className="mt-2 text-[15px] font-semibold leading-7 text-white md:text-[16px]">
            {trouble.result}
          </p>
        </div>
      </div>

      {/* 💡 인사이트 */}
      <div className="flex items-start gap-4 rounded-[24px] border-l-4 border-[#22C55E] bg-[#F0FDF4] p-6 md:p-7">
        <span className="text-2xl leading-none" aria-hidden="true">
          💡
        </span>
        <div>
          <p className="small-label text-[#15803D]">인사이트</p>
          <p className="mt-2 text-[16px] font-semibold leading-7 text-[#111827] md:text-[18px]">
            {trouble.insight}
          </p>
        </div>
      </div>

      {/* tech chips */}
      <div className="flex flex-wrap gap-2 pt-1">
        {trouble.tech.map((chip) => (
          <span
            key={chip}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
          >
            {chip}
          </span>
        ))}
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
  if (trouble.visualType === "yolo-metrics") {
    return (
      <div className="rounded-[28px] bg-[#F8FAFC] p-6 md:p-8">
        <p className="small-label text-[#15803D]">YOLOv11-M Re-training</p>
        <p className="project-caption mt-2">
          발 이미지 66,950장 중 20,507장을 선별·라벨링 후 재학습 (전 → 후)
        </p>
        <div className="mt-6 space-y-4">
          {(trouble.metrics ?? []).map((m) => (
            <div
              key={m.label}
              className="rounded-[20px] border border-[#E2E8F0] bg-white p-5"
            >
              <p className="small-label text-slate-500">{m.label}</p>
              <div className="mt-3 flex items-center gap-4">
                <span className="text-2xl font-semibold text-slate-400">
                  {m.before}
                </span>
                <ArrowRight className="h-5 w-5 shrink-0 text-[#15803D]" />
                <span className="text-[32px] font-bold leading-none tracking-[-0.03em] text-[#15803D]">
                  {m.after}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

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
          className="py-[96px] md:py-[160px]"
        >
          <div className="mx-auto max-w-[1280px]">
            <div className="mb-12">
              <HangaraeSectionHeading
                label={trouble.label}
                title={trouble.title}
                subtitle={trouble.diagnosis}
              />
            </div>
            <div className="grid gap-8 xl:grid-cols-12">
              <div className="xl:col-span-7">
                <MotionBlock delay={index * 0.02}>
                  <TroubleFlow trouble={trouble} />
                </MotionBlock>
              </div>
              <div className="xl:col-span-5">
                <div className="xl:sticky xl:top-[120px]">
                  <MotionBlock delay={0.06}>
                    <TroubleEvidence trouble={trouble} />
                  </MotionBlock>
                </div>
              </div>
            </div>
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

      <ProjectRecap
        definition={hangaraeRecap.definition}
        takeaways={hangaraeRecap.takeaways}
        reflection={hangaraeRecap.reflection}
        accent="#34D399"
      />
    </>
  );
}
