import { SiteHeader } from "@/components/ui/SiteHeader";
import { ContactSection } from "@/components/sections/Contact/ContactSection";
import { ImmersiveProjectFlow } from "@/components/sections/ImmersiveProjectFlow/ImmersiveProjectFlow";

import { HeroSection } from "@/components/sections/Hero/HeroSection";
import { WorldLoader } from "@/components/sections/Loader/WorldLoader";
import { JourneyIndex } from "@/components/sections/JourneyIndex/JourneyIndex";
import { ProjectIndexSection } from "@/components/sections/ProjectIndex/ProjectIndexSection";
import { navItems } from "@/data/navigation";
import { WorldHost } from "@/features/world/runtime/WorldHost";

export default function Home() {
  return (
    <main>
      <SiteHeader items={navItems} />
      {/* First-visit loading screen: reports real 3D readiness, never pads time. */}
      <WorldLoader />
      <HeroSection />
      {/* Project index: the space from which each 3D world is entered (owns --world-gate). */}
      <JourneyIndex />
      <WorldHost><ImmersiveProjectFlow /></WorldHost>

      <ProjectIndexSection />
      {/* 도슨트 티저 섹션은 없앴다 — 진짜 3D 도슨트가 오른쪽 사이드 패널에 항상 있다. */}
      <ContactSection />
    </main>
  );
}
