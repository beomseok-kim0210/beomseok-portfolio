import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { navItems } from "@/data/navigation";
import { projectDetails } from "@/data/projectDetails";
import { OpenGlobalDocentButton } from "@/features/docent/OpenGlobalDocentButton";
import { CrimeSceneLaunchButton } from "@/features/playground/CrimeSceneLaunchButton";
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
  const isDocentCaseStudy = project.slug === "ai-docent";
  const isCrimeSceneCaseStudy = project.slug === "crime-scene";

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
            {isDocentCaseStudy ? (
              <section className="rounded-[32px] bg-[#0B1120] px-6 py-10 text-white md:px-10" data-docent-section="overview">
                <p className="cinematic-label text-blue-300">Try the global experience</p>
                <h2 className="mt-4 max-w-[20ch] text-3xl font-semibold tracking-[-0.03em]">
                  읽던 흐름 그대로, 도슨트에게 질문해 보세요.
                </h2>
                <p className="mt-4 max-w-[58ch] text-sm leading-7 text-slate-300">
                  아래 버튼은 새 채팅을 만들지 않습니다. 지금 모든 페이지에 떠 있는 하나의 도슨트 런타임을 확장합니다.
                </p>
                <div className="mt-7">
                  <OpenGlobalDocentButton label="도슨트 체험하기" />
                </div>
              </section>
            ) : null}
            {isCrimeSceneCaseStudy ? (
              <section className="rounded-[32px] bg-[#0B1120] px-6 py-10 text-white md:px-10" data-docent-section="overview">
                <p className="cinematic-label text-blue-300">Playable Build</p>
                <h2 className="mt-4 max-w-[22ch] text-3xl font-semibold tracking-[-0.03em]">
                  사건 현장으로 들어가 직접 수사해 보세요.
                </h2>
                <p className="mt-4 max-w-[58ch] text-sm leading-7 text-slate-300">
                  게임은 별도 앱으로 이동하며, 브라우저의 뒤로 가기로 포트폴리오에 돌아올 수 있습니다.
                </p>
                <div className="mt-7">
                  <CrimeSceneLaunchButton />
                </div>
              </section>
            ) : null}
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
