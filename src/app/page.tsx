import { SiteHeader } from "@/components/ui/SiteHeader";
import { ContactSection } from "@/components/sections/Contact/ContactSection";
import { HomeArmiShowcase } from "@/components/sections/HomeArmiShowcase";
import { HomeHangaraeShowcase } from "@/components/sections/HomeHangaraeShowcase";
import { HomeWeddingShowcase } from "@/components/sections/HomeWeddingShowcase";
import { HeroSection } from "@/components/sections/Hero/HeroSection";
import { ProjectIndexSection } from "@/components/sections/ProjectIndex/ProjectIndexSection";
import { navItems } from "@/data/navigation";

export default function Home() {
  return (
    <main>
      <SiteHeader items={navItems} />
      <HeroSection />
      <HomeArmiShowcase />
      <HomeHangaraeShowcase />
      <HomeWeddingShowcase />
      <ProjectIndexSection />
      {/* 도슨트 티저 섹션은 없앴다 — 진짜 3D 도슨트가 오른쪽 사이드 패널에 항상 있다. */}
      <ContactSection />
    </main>
  );
}
