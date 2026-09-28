import { ChevronDown } from "lucide-react";
import { MotionBlock } from "@/components/ui/MotionBlock";
import {
  crimeSceneNext,
  crimeSceneNumbers,
  crimeSceneOrigin,
  crimeSceneTimeline,
  crimeSceneTroubles,
  type CrimeSceneNextItem,
} from "@/data/crimeScenePlayground";
import { CrimeSceneLaunchButton } from "./CrimeSceneLaunchButton";

const STATUS_STYLE: Record<CrimeSceneNextItem["status"], string> = {
  "진행 중": "border-sky-300/30 bg-sky-300/10 text-sky-200",
  "설계 완료": "border-emerald-300/25 bg-emerald-300/10 text-emerald-200",
  예정: "border-white/15 bg-white/[0.04] text-slate-300",
};

const TROUBLE_ROWS = [
  ["문제", "problem"],
  ["원인 분석", "investigation"],
  ["해결", "solution"],
  ["결과", "result"],
] as const;

function SectionHeading({ label, title, lead }: { label: string; title: string; lead?: string }) {
  return (
    <div className="max-w-[760px]">
      <p className="cinematic-label text-blue-400">{label}</p>
      <h2 className="mt-5 font-display text-[clamp(30px,3.6vw,48px)] font-bold leading-[1.1] tracking-[-0.04em] text-white">
        {title}
      </h2>
      {lead ? <p className="mt-5 text-base leading-8 text-slate-400">{lead}</p> : null}
    </div>
  );
}

/**
 * Playground · Crime Scene 의 개발 이야기 — 시작 계기, 타임라인, 트러블슈팅,
 * 숫자, 다음 계획. 데이터는 src/data/crimeScenePlayground.ts (스포일러 없음).
 */
export function CrimeSceneDevlog() {
  return (
    <div className="mt-32 space-y-32" data-crime-scene-devlog>
      {/* 시작 계기 + 원칙 */}
      <section aria-labelledby="cs-origin" className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <MotionBlock>
          <p className="cinematic-label text-blue-400">{crimeSceneOrigin.label}</p>
          <h2
            id="cs-origin"
            className="mt-5 font-display text-[clamp(30px,3.6vw,48px)] font-bold leading-[1.1] tracking-[-0.04em] text-white"
          >
            {crimeSceneOrigin.title}
          </h2>
        </MotionBlock>
        <MotionBlock delay={0.06}>
          <div className="space-y-5 text-base leading-8 text-slate-300">
            {crimeSceneOrigin.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 24)}>{paragraph}</p>
            ))}
          </div>
          <ul className="mt-9 grid gap-3 sm:grid-cols-3">
            {crimeSceneOrigin.principles.map((principle) => (
              <li key={principle.title} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <p className="text-sm font-semibold leading-6 text-white">{principle.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{principle.body}</p>
              </li>
            ))}
          </ul>
        </MotionBlock>
      </section>

      {/* 타임라인 */}
      <section aria-labelledby="cs-timeline">
        <MotionBlock>
          <SectionHeading label="TIMELINE" title="6주의 공백에서 출품까지" />
        </MotionBlock>
        <ol id="cs-timeline" className="mt-12 border-l border-white/10">
          {crimeSceneTimeline.map((milestone, index) => (
            // li 는 목록의 직계 자식이어야 한다 — MotionBlock(div)은 그 안에 둔다.
            <li key={`${milestone.date}-${milestone.title}`} className="relative pb-9 pl-8">
              <span
                aria-hidden="true"
                className={`absolute -left-[5px] top-2 h-2.5 w-2.5 rounded-full ${
                  milestone.upcoming ? "border border-blue-300/60 bg-[#0B1120]" : "bg-blue-400"
                }`}
              />
              <MotionBlock delay={index * 0.03} className="grid gap-1 md:grid-cols-[132px_1fr] md:gap-8">
                <p className={`text-sm font-semibold tabular-nums ${milestone.upcoming ? "text-slate-500" : "text-blue-300"}`}>
                  {milestone.date}
                </p>
                <div>
                  <p className={`text-lg font-semibold ${milestone.upcoming ? "text-slate-300" : "text-white"}`}>
                    {milestone.title}
                    {milestone.upcoming ? (
                      <span className="ml-2 rounded-full border border-white/15 px-2 py-0.5 align-middle text-[11px] font-medium text-slate-400">
                        예정
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1.5 max-w-[640px] text-sm leading-7 text-slate-400">{milestone.body}</p>
                </div>
              </MotionBlock>
            </li>
          ))}
        </ol>
      </section>

      {/* 트러블슈팅 */}
      <section aria-labelledby="cs-trouble">
        <MotionBlock>
          <SectionHeading
            label="TROUBLESHOOTING"
            title="막혔던 곳과, 그걸 푼 방법"
            lead="보안 경계부터 첫 5분의 재미, 3D 연출 버그, 미스터리 구조까지 — 실제로 부딪힌 문제를 원인과 함께 남겼습니다. 항목을 열면 자세한 과정을 볼 수 있습니다."
          />
        </MotionBlock>
        {/* items-start: 한 카드를 펼쳐도 옆의 닫힌 카드가 같은 높이로 늘어나지 않게. */}
        <div id="cs-trouble" className="mt-12 grid items-start gap-4 md:grid-cols-2">
          {crimeSceneTroubles.map((trouble, index) => (
            <MotionBlock key={trouble.title} delay={(index % 2) * 0.05}>
              <details className="group rounded-[24px] border border-white/10 bg-[#0B1120] p-6 open:border-blue-300/25 md:p-7">
                <summary className="flex cursor-pointer list-none items-start gap-4 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-blue-300 [&::-webkit-details-marker]:hidden">
                  <span className="mt-0.5 text-sm font-semibold tabular-nums text-blue-300/80">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1">
                    <span className="block text-lg font-semibold leading-7 text-white">{trouble.title}</span>
                    <span className="mt-1.5 block text-sm leading-6 text-slate-400">{trouble.summary}</span>
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className="mt-1 h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                  />
                </summary>
                <dl className="mt-6 space-y-4 border-t border-white/[0.07] pt-5">
                  {TROUBLE_ROWS.map(([label, key]) => (
                    <div key={key} className="grid gap-1 sm:grid-cols-[76px_1fr] sm:gap-4">
                      <dt className="text-xs font-semibold tracking-[0.08em] text-slate-500">{label}</dt>
                      <dd className="text-sm leading-7 text-slate-300">{trouble[key]}</dd>
                    </div>
                  ))}
                </dl>
                <ul className="mt-5 flex flex-wrap gap-2" aria-label="사용 기술">
                  {trouble.tech.map((tech) => (
                    <li key={tech} className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-slate-400">
                      {tech}
                    </li>
                  ))}
                </ul>
              </details>
            </MotionBlock>
          ))}
        </div>
      </section>

      {/* 숫자 */}
      <section aria-labelledby="cs-numbers">
        <MotionBlock>
          <SectionHeading label="IN NUMBERS" title="기록으로 남긴 숫자" />
        </MotionBlock>
        <div
          id="cs-numbers"
          className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-[28px] border border-white/10 bg-white/10 md:grid-cols-4"
        >
          {crimeSceneNumbers.map((number) => (
            <div key={number.label} className="bg-[#0B1120] p-6 md:p-7">
              <p className="font-display text-[clamp(26px,3vw,36px)] font-bold tracking-[-0.03em] text-white">
                {number.value}
              </p>
              <p className="mt-2 text-sm font-semibold text-blue-300">{number.label}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">{number.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 다음 계획 */}
      <section aria-labelledby="cs-next">
        <MotionBlock>
          <SectionHeading
            label="WHAT'S NEXT"
            title="앞으로 이렇게 업데이트합니다"
            lead="사건의 진실은 그대로 두고, 수사하는 경험을 더 깊게 만드는 순서로 진행합니다."
          />
        </MotionBlock>
        <ul id="cs-next" className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {crimeSceneNext.map((item, index) => (
            <li key={item.title}>
              <MotionBlock delay={(index % 3) * 0.05} className="h-full rounded-[24px] border border-white/10 bg-[#0B1120] p-6">
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[item.status]}`}>
                  {item.status}
                </span>
                <p className="mt-4 text-lg font-semibold text-white">{item.title}</p>
                <p className="mt-2 text-sm leading-7 text-slate-400">{item.body}</p>
              </MotionBlock>
            </li>
          ))}
        </ul>
      </section>

      {/* 마무리 */}
      <MotionBlock className="rounded-[32px] border border-white/10 bg-gradient-to-br from-blue-500/10 to-transparent p-8 text-center md:p-12">
        <p className="cinematic-label text-blue-300">CASE 100</p>
        <p className="mt-4 text-2xl font-semibold text-white md:text-3xl">이제 직접 수사해 보세요.</p>
        <p className="mt-3 text-sm text-slate-400">설치나 로그인 없이 브라우저에서 바로 시작합니다.</p>
        <div className="mt-7 flex justify-center">
          <CrimeSceneLaunchButton />
        </div>
      </MotionBlock>
    </div>
  );
}
