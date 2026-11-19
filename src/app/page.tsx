import { SiteHeader } from "@/components/ui/SiteHeader";

import { HeroSection } from "@/components/sections/Hero/HeroSection";
import { HomeWorlds } from "@/components/sections/HomeWorlds";
import { navItems } from "@/data/navigation";

export default function Home() {
  return (
    <main>
      <SiteHeader items={navItems} />
      <HeroSection />
      {/* Project index (each project opens its own /journeys page) + the personal gallery, hydrated
          from their own chunk (see HomeWorlds). The 3D loading screen moved to the ARMI journey page. */}
      <HomeWorlds />

      {/* 도슨트 티저 섹션은 없앴다 — 진짜 3D 도슨트가 오른쪽 사이드 패널에 항상 있다.
          Contact 는 갤러리 출구 밖(밤의 광장)에 있다 — 마지막 화면 (labJourney/GalleryExit). */}
    </main>
  );
}
