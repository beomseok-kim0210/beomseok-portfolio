import { SiteHeader } from "@/components/ui/SiteHeader";
import { ContactSection } from "@/components/sections/Contact/ContactSection";
import { FeaturedProjects } from "@/components/sections/FeaturedProjects/FeaturedProjects";
import { HeroSection } from "@/components/sections/Hero/HeroSection";
import { KnowledgePreviewSection } from "@/components/sections/KnowledgePreview/KnowledgePreviewSection";
import { PersonalAILabSection } from "@/components/sections/PersonalAILab/PersonalAILabSection";
import { ProblemsSolvedSection } from "@/components/sections/ProblemsSolved/ProblemsSolvedSection";
import { SkillsSection } from "@/components/sections/Skills/SkillsSection";
import { WhyAISection } from "@/components/sections/WhyAI/WhyAISection";
import { navItems } from "@/data/navigation";
import { getKnowledgeNotes } from "@/lib/knowledge";

export default function Home() {
  const knowledgeNotes = getKnowledgeNotes();

  return (
    <main>
      <SiteHeader items={navItems} />
      <HeroSection />
      <WhyAISection />
      <FeaturedProjects />
      <ProblemsSolvedSection />
      <PersonalAILabSection />
      <KnowledgePreviewSection notes={knowledgeNotes} />
      <SkillsSection />
      <ContactSection />
    </main>
  );
}
