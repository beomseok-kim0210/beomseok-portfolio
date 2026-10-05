import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ShowcaseMotion } from "@/components/sections/HomeShowcase/ShowcaseMotion";
import { personalProjectCards } from "@/data/projectCards";

export function ProjectIndexSection() {
  return (
    <section id="projects" className="scene-shell overflow-hidden bg-[#FAFAFA] px-5 py-24 text-[#111827] md:px-8 md:py-32 lg:px-12">
      <div className="mx-auto max-w-[1180px]">
        <ShowcaseMotion>
          <p className="cinematic-label text-blue-600">Personal Projects</p>
          <h2 className="mt-5 max-w-[760px] font-display text-[clamp(36px,5vw,64px)] font-bold leading-[0.98] tracking-[-0.05em]">
            개인 프로젝트
          </h2>
        </ShowcaseMotion>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {personalProjectCards.map((project) => (
            <ShowcaseMotion key={project.slug} preset="cta" className="min-w-0">
              <article className="flex h-full min-w-0 flex-col rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.04)] md:p-7">
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                  <h3 className="min-w-0 font-display text-2xl font-semibold tracking-[-0.03em]">
                    {project.name}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                      {project.scope === "solo" ? "Solo" : "Team"}
                    </span>
                    {project.status ? (
                      <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                        {project.status}
                      </span>
                    ) : null}
                  </div>
                </div>

                <p className="mt-6 text-lg font-semibold leading-7 text-slate-900">{project.oneLiner}</p>
                <p className="mt-3 text-body text-slate-600">{project.problem}</p>

                <div className="mt-6 flex min-w-0 flex-wrap gap-2">
                  {project.highlights.map((highlight) => (
                    <span
                      key={highlight}
                      className="max-w-full break-words rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-support font-medium text-slate-600"
                    >
                      {highlight}
                    </span>
                  ))}
                </div>

                <Link
                  href={project.href}
                  className="mt-8 inline-flex items-center gap-2 self-start text-action text-blue-700 transition-colors hover:text-blue-900"
                >
                  상세보기 <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            </ShowcaseMotion>
          ))}
        </div>
      </div>
    </section>
  );
}
