import { SiteHeader } from "@/components/ui/SiteHeader";
import { ContactSection } from "@/components/sections/Contact/ContactSection";
import { HomeArmiShowcase } from "@/components/sections/HomeArmiShowcase";
import { HomeHangaraeShowcase } from "@/components/sections/HomeHangaraeShowcase";
import { HomeLabShowcase } from "@/components/sections/HomeLabShowcase";
import { HomeWeddingShowcase } from "@/components/sections/HomeWeddingShowcase";
import { HeroSection } from "@/components/sections/Hero/HeroSection";
import { navItems } from "@/data/navigation";

export default function Home() {
  return (
    <main>
      <SiteHeader items={navItems} />
      <HeroSection />
      <HomeArmiShowcase />
      <HomeHangaraeShowcase />
      <HomeWeddingShowcase />
      <HomeLabShowcase />
      <ContactSection />
    </main>
  );
}
