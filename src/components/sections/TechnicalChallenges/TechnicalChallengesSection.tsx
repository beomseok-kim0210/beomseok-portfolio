import { MotionBlock } from "@/components/ui/MotionBlock";
import { challenges } from "@/data/challenges";
import { ChallengeGrid } from "./ChallengeGrid";

export function TechnicalChallengesSection() {
  return (
    <section id="challenges" className="scene-shell bg-white py-32">
      <div className="content-grid">
        <MotionBlock>
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="small-label mb-5 text-blue-600">
                Technical Challenges
              </p>
              <h2 className="section-title">Technical Challenges</h2>
            </div>
            <p className="subtitle max-w-[640px] text-slate-700">
              프로젝트를 만드는 것보다
              <br />
              문제를 해결하는 과정에서
              <br />더 많은 것을 배웠습니다.
            </p>
          </div>
        </MotionBlock>
        <ChallengeGrid challenges={challenges} />
      </div>
    </section>
  );
}
