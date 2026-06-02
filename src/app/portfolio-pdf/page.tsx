import type { Metadata } from "next";
import { PortfolioPdfPrintButton } from "@/components/pdf/PortfolioPdfPrintButton";
import { ArmiCaseStudy } from "@/components/project/ArmiCaseStudy";
import { HangaraeCaseStudy } from "@/components/project/HangaraeCaseStudy";
import { ProjectArchitecture } from "@/components/project/ProjectArchitecture";
import { ProjectHero } from "@/components/project/ProjectHero";
import { ProjectMediaSection } from "@/components/project/ProjectMediaSection";
import { ProjectOverview } from "@/components/project/ProjectOverview";
import { ProjectResult } from "@/components/project/ProjectResult";
import { ProjectRole } from "@/components/project/ProjectRole";
import { ProjectTechStack } from "@/components/project/ProjectTechStack";
import { ProjectTroubleshooting } from "@/components/project/ProjectTroubleshooting";
import { WeddingCaseStudy } from "@/components/project/WeddingCaseStudy";
import { ContactSection } from "@/components/sections/Contact/ContactSection";
import { HeroSection } from "@/components/sections/Hero/HeroSection";
import { HomeArmiShowcase } from "@/components/sections/HomeArmiShowcase";
import { HomeHangaraeShowcase } from "@/components/sections/HomeHangaraeShowcase";
import { HomeLabShowcase } from "@/components/sections/HomeLabShowcase";
import { HomeWeddingShowcase } from "@/components/sections/HomeWeddingShowcase";
import { getProjectDetail } from "@/data/projectDetails";

export const metadata: Metadata = {
  title: "Portfolio PDF",
  description: "Printable full portfolio document composed from the live pages.",
};

const armi = getProjectDetail("armi");
const hangarae = getProjectDetail("hangarae");
const wedding = getProjectDetail("wedding");
const clawDev = getProjectDetail("claw-dev");

function PdfProjectShell({
  className = "bg-[#FAFAFA]",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`pdf-route ${className}`}>
      <div className="mx-auto max-w-[1320px] px-5 md:px-8 lg:px-12">{children}</div>
    </section>
  );
}

export default function PortfolioPdfPage() {
  if (!armi || !hangarae || !wedding || !clawDev) {
    return null;
  }

  return (
    <main className="pdf-document bg-[#FAFAFA] print:bg-white">
      <PortfolioPdfPrintButton />

      <div className="screen-only sticky top-0 z-40 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Full Portfolio Print View</p>
            <p className="mt-1 text-sm text-slate-500">
              홈페이지와 각 프로젝트 페이지의 실제 내용을 그대로 이어붙인 인쇄용 라우트입니다.
            </p>
          </div>
        </div>
      </div>

      <div className="pdf-route">
        <HeroSection />
      </div>

      <div className="pdf-route">
        <HomeArmiShowcase />
        <ProjectHero project={armi} />
        <ProjectMediaSection project={armi} />
        <ArmiCaseStudy />
      </div>

      <PdfProjectShell>
        <HomeHangaraeShowcase />
        <HangaraeCaseStudy />
      </PdfProjectShell>

      <PdfProjectShell className="bg-[#FFF9F7]">
        <HomeWeddingShowcase />
        <WeddingCaseStudy project={wedding} />
      </PdfProjectShell>

      <PdfProjectShell>
        <HomeLabShowcase />
        <ProjectHero project={clawDev} />
        <ProjectOverview project={clawDev} />
        <ProjectMediaSection project={clawDev} />
        <ProjectRole project={clawDev} />
        <ProjectArchitecture project={clawDev} />
        <ProjectTroubleshooting project={clawDev} />
        <ProjectResult project={clawDev} />
        <ProjectTechStack project={clawDev} />
      </PdfProjectShell>

      <div className="pdf-route">
        <ContactSection />
      </div>
    </main>
  );
}
