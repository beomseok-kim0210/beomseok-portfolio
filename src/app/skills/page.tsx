import type { Metadata } from "next";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SkillsSection } from "@/components/sections/Skills/SkillsSection";
import { ContactSection } from "@/components/sections/Contact/ContactSection";
import { navItems } from "@/data/navigation";

export const metadata: Metadata = {
  title: "Skills",
  description:
    "프로젝트에서 실제로 사용한 프론트엔드, AI, 실시간 UX, 백엔드, 인프라 기술 정리.",
};

export default function SkillsPage() {
  return (
    <main>
      <SiteHeader items={navItems} />
      <div className="pt-16">
        <SkillsSection variant="page" />
        <ContactSection />
      </div>
    </main>
  );
}
