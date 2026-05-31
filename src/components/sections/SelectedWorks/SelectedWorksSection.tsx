import { MotionBlock } from "@/components/ui/MotionBlock";
import { ARMISection } from "./ARMISection";
import { HangaraeSection } from "./HangaraeSection";
import { WeddingSection } from "./WeddingSection";

export function SelectedWorksSection() {
  return (
    <>
      <section id="projects" className="scene-shell bg-[#FAFAFA] px-6 py-32">
        <div className="content-grid">
          <MotionBlock>
            <div className="text-container">
              <p className="cinematic-label mb-10 text-blue-600">
                Product Stories
              </p>
              <h2 className="chapter-title">
                프로젝트가 아니라,
                <br />
                문제를 해결한 장면들.
              </h2>
            </div>
          </MotionBlock>
        </div>
      </section>
      <ARMISection />
      <HangaraeSection />
      <WeddingSection />
    </>
  );
}
