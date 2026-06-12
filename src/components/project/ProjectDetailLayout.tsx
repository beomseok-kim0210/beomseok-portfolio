import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { navItems } from "@/data/navigation";
import { projectDetails } from "@/data/projectDetails";
import type { ProjectDetail } from "@/types/portfolio";
import { ProjectArchitecture } from "./ProjectArchitecture";
import { ArmiCaseStudy } from "./ArmiCaseStudy";
import { ClawDevCaseStudy } from "./ClawDevCaseStudy";
import { HangaraeCaseStudy } from "./HangaraeCaseStudy";
import { ProjectHero } from "./ProjectHero";
import { ProjectMediaSection } from "./ProjectMediaSection";
import { ProjectOverview } from "./ProjectOverview";
import { ProjectResult } from "./ProjectResult";
import { ProjectRole } from "./ProjectRole";
import { ProjectTechStack } from "./ProjectTechStack";
import { ProjectTroubleshooting } from "./ProjectTroubleshooting";
import { WeddingCaseStudy } from "./WeddingCaseStudy";

type ProjectDetailLayoutProps = {
  project: ProjectDetail;
};

export function ProjectDetailLayout({ project }: ProjectDetailLayoutProps) {
  const currentIndex = projectDetails.findIndex((item) => item.slug === project.slug);
  const nextProject = projectDetails[(currentIndex + 1) % projectDetails.length];
  const isWeddingCaseStudy = project.slug === "wedding";
  const isArmiCaseStudy = project.slug === "armi";
  const isHangaraeCaseStudy = project.slug === "hangarae";
  const isClawDevCaseStudy = project.slug === "claw-dev";

  const mainBg = isClawDevCaseStudy
    ? "bg-[#0B1120]"
    : isWeddingCaseStudy
      ? "bg-[#FFF9F7]"
      : "bg-[#FAFAFA]";

  return (
    <main className={mainBg}>
      <SiteHeader items={navItems} />
      <div className="mx-auto max-w-[1320px] px-5 md:px-8 lg:px-12">
        <div className="pt-24">
          <Link
            href="/#projects"
            className={`inline-flex items-center gap-2 small-label transition-colors ${
              isClawDevCaseStudy
                ? "text-slate-400 hover:text-white"
                : "text-slate-500 hover:text-[#111827]"
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Link>
        </div>
        {isClawDevCaseStudy ? (
          <ClawDevCaseStudy />
        ) : isWeddingCaseStudy ? (
          <WeddingCaseStudy project={project} />
        ) : isHangaraeCaseStudy ? (
          <HangaraeCaseStudy />
        ) : isArmiCaseStudy ? (
          <>
            <ProjectHero project={project} />
            <ProjectMediaSection project={project} />
            <ArmiCaseStudy />
          </>
        ) : (
          <>
            <ProjectHero project={project} />
            <ProjectOverview project={project} />
            <ProjectMediaSection project={project} />
            <ProjectRole project={project} />
            <ProjectArchitecture project={project} />
            <ProjectTroubleshooting project={project} />
            <ProjectResult project={project} />
            <ProjectTechStack project={project} />
          </>
        )}
        <section className="py-20">
          <Link
            href={`/projects/${nextProject.slug}`}
            className={`flex items-center justify-between rounded-[32px] border p-8 transition-colors ${
              isClawDevCaseStudy
                ? "border-white/10 bg-white/[0.04] text-white hover:border-white/40"
                : isWeddingCaseStudy
                  ? "border-[#E5E7EB] bg-white/80 backdrop-blur hover:border-[#111827]"
                  : "border-slate-200 bg-white hover:border-[#111827]"
            }`}
          >
            <div>
              <p
                className={`small-label ${
                  isClawDevCaseStudy ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Next Case Study
              </p>
              <p className="mt-4 text-3xl font-semibold">{nextProject.title}</p>
            </div>
            <ArrowRight className="h-6 w-6" />
          </Link>
        </section>
      </div>
    </main>
  );
}
