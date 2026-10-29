import { SiteHeader } from "@/components/ui/SiteHeader";
import { ContactSection } from "@/components/sections/Contact/ContactSection";

import { HeroSection } from "@/components/sections/Hero/HeroSection";
import { WorldLoader } from "@/components/sections/Loader/WorldLoader";
import { HomeWorlds } from "@/components/sections/HomeWorlds";
import { navItems } from "@/data/navigation";

export default function Home() {
  return (
    <main>
      <SiteHeader items={navItems} />
      {/* First-visit loading screen: reports real 3D readiness, never pads time. */}
      <WorldLoader />
      <HeroSection />
      {/* Project index + 3D journeys, hydrated from their own chunk (see HomeWorlds). */}
      <HomeWorlds />

      {/* 도슨트 티저 섹션은 없앴다 — 진짜 3D 도슨트가 오른쪽 사이드 패널에 항상 있다. */}
      <ContactSection />
    </main>
  );
}
