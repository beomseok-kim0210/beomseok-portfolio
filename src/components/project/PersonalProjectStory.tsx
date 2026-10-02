import type { ReactNode } from "react";
import type { ProjectDetail } from "@/types/portfolio";
import { ProjectArchitecture } from "./ProjectArchitecture";
import { ProjectMediaSection } from "./ProjectMediaSection";
import { ProjectTechStack } from "./ProjectTechStack";
import { ProjectTroubleshooting } from "./ProjectTroubleshooting";

type PersonalProjectStoryProps = {
  project: ProjectDetail;
  experience?: ReactNode;
};

// 기존 brief/architecture/result를 5단 흐름으로 배치한다. 프로젝트별 페이지는 데이터만 전달한다.
export function PersonalProjectStory({ project, experience }: PersonalProjectStoryProps) {
  const story = project.personalStory;
  if (!story) return null;
  const brief = project.brief;

  return (
    <div className="min-w-0 text-[#111827]">
      <section id="overview" aria-labelledby="overview-title" data-docent-section="overview" className="scroll-mt-24 py-16 md:py-24">
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 md:p-10">
          <p className="cinematic-label text-blue-600">Overview</p>
          <h2 id="overview-title" className="story-title mt-4">01 어떤 프로젝트인지</h2>
          <p className="mt-6 text-xl font-semibold leading-8">{project.subtitle}</p>
          <p className="project-body mt-4">{project.description}</p>
          <dl className="mt-8 grid min-w-0 gap-5 sm:grid-cols-2">
            {[
              ["형태", story.form],
              ["기간", story.period],
              ["개인 / 팀", brief?.scope === "solo" ? "개인 프로젝트" : brief?.scope === "team" ? "팀 프로젝트" : undefined],
              ["상태", brief?.status],
            ].filter(([, value]) => Boolean(value)).map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-[24px] bg-slate-50 p-5">
                <dt className="text-xs font-semibold text-slate-600">{label}</dt>
                <dd className="mt-3 text-sm font-medium leading-6">{value}</dd>
              </div>
            ))}
          </dl>
          {brief ? (
            <div className="mt-8 border-t border-slate-200 pt-8">
              <h3 className="text-lg font-semibold">해결하려는 문제</h3>
              <p className="project-body mt-4">{brief.problem}</p>
            </div>
          ) : null}
          <div className="mt-8 border-t border-slate-200 pt-8" data-docent-section="role">
            <h3 className="text-lg font-semibold">담당 범위</h3>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              {(brief?.role.personal ?? project.role).map((role) => (
                <li key={role} className="flex min-w-0 gap-3">
                  <span aria-hidden="true" className="text-blue-600">•</span>
                  <span className="min-w-0">{role}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <ProjectArchitecture project={project} showTech={false} />
      </section>

      <section id="decision" aria-labelledby="decision-title" data-docent-section="decision" className="scroll-mt-24 py-20">
        <p className="cinematic-label text-blue-600">Motivation</p>
        <h2 id="decision-title" className="story-title mt-6">02 왜 하게 됐는지</h2>
        <div className="mt-10 grid min-w-0 gap-5 md:grid-cols-2">
          {[
            ["문제 인식", brief?.problem],
            ["기존 방식의 한계", story.motivation.limitation],
            ["확인하고 싶었던 가설", story.motivation.hypothesis],
            ["그래서 시작", story.motivation.start],
          ].filter(([, value]) => Boolean(value)).map(([label, value]) => (
            <article key={label} className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-7">
              <h3 className="text-lg font-semibold">{label}</h3>
              <p className="project-body mt-4">{value}</p>
            </article>
          ))}
        </div>
        {brief?.decisions.length ? (
          <div className="mt-6 grid min-w-0 gap-5 md:grid-cols-3">
            {brief.decisions.map((decision) => (
              <article key={decision.title} className="min-w-0 rounded-[24px] border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-semibold">{decision.title}</h3>
                <p className="project-body mt-4">{decision.reason}</p>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <ProjectTroubleshooting project={project} personal />

      <section id="result" aria-labelledby="result-title" data-docent-section="result" className="scroll-mt-24 py-20">
        <div className="min-w-0 rounded-[36px] bg-[#111827] p-6 text-white md:p-12">
          <p className="cinematic-label text-blue-300">Outcomes</p>
          <h2 id="result-title" className="story-title mt-6">04 결과물 및 성과</h2>
          {brief ? <p className="mt-8 text-lg font-semibold leading-8">{brief.result}</p> : null}
          <ul className="mt-8 space-y-4 text-sm leading-7 text-slate-300">
            {(story.outcomes ?? project.result).map((result) => <li key={result}>{result}</li>)}
          </ul>
          {brief?.validation.length ? (
            <div className="mt-10 grid min-w-0 gap-4 md:grid-cols-3">
              {brief.validation.map((item) => (
                <div key={`${item.label}-${item.value}`} className="min-w-0 rounded-[24px] bg-white/[0.05] p-5">
                  <p className="break-words font-display text-3xl font-semibold leading-tight">{item.value}</p>
                  <p className="mt-3 text-sm font-semibold text-slate-300">{item.label}</p>
                  {item.note ? <p className="mt-2 text-xs leading-5 text-slate-300">{item.note}</p> : null}
                </div>
              ))}
            </div>
          ) : null}
          {story.links?.length ? (
            <div className="mt-8 flex flex-wrap gap-4">
              {story.links.map((link) => (
                <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className="break-all text-sm font-semibold text-blue-300 underline underline-offset-4 transition-colors hover:text-white">
                  {link.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>
        {experience ? <div className="mt-6">{experience}</div> : null}
        {story.showVideo ? <ProjectMediaSection project={project} /> : null}
      </section>

      <ProjectTechStack project={project} personal />
    </div>
  );
}
