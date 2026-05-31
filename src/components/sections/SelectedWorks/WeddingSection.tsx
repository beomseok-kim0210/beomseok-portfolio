import { BeforeAfterFrame } from "@/components/ui/BeforeAfterFrame";
import { MotionBlock } from "@/components/ui/MotionBlock";
import { SceneQuestion } from "@/components/ui/SceneQuestion";
import { SplitHeadline } from "@/components/ui/SplitHeadline";
import { projects } from "@/data/projects";
import { WeddingAgentScene } from "./WeddingAgentScene";

export function WeddingSection() {
  const project = projects[2];

  return (
    <section className="scene-shell bg-[#FFF9F8] text-[#111827]">
      <SceneQuestion
        label="Choice Intelligence"
        lines={["사람은", "자신에게 가장 어울리는 선택을", "얼마나 알고 있을까?"]}
      />
      <div className="px-6 pb-20">
        <div className="content-grid">
          <BeforeAfterFrame />
        </div>
      </div>
      <div className="px-6 pb-20 pt-8">
        <div className="content-grid grid items-end gap-12 lg:grid-cols-[0.75fr_1.25fr]">
          <MotionBlock>
            <p className="cinematic-label mb-8 text-blue-600">{project.identity}</p>
            <p className="text-[clamp(56px,8vw,112px)] font-bold leading-none">
              시착 1벌당
              <br />
              5~8만 원
            </p>
          </MotionBlock>
          <MotionBlock delay={0.1}>
            <p className="body-copy reading-width text-slate-600">
              드레스 투어 과정에서 반복되는 시착 비용 때문에 충분한 비교 없이
              제한된 선택지 안에서 결정해야 했습니다. 완벽한 실착 재현보다 선택
              이전 단계에서 다양한 스타일을 빠르게 비교하는 것이 더 큰 가치라고
              판단했습니다.
            </p>
          </MotionBlock>
        </div>
      </div>
      <div className="min-h-screen px-6 py-28">
        <div className="content-grid">
          <MotionBlock>
            <div className="mx-auto max-w-[820px] text-center">
              <p className="cinematic-label mb-8 text-blue-600">
                Technology Decision
              </p>
              <SplitHeadline
                lines={["기술적으로 가능해도", "제품에 맞지 않으면", "멈춥니다."]}
                className="story-title"
              />
            </div>
          </MotionBlock>
          <MotionBlock delay={0.12}>
            <div className="mx-auto mt-20 grid max-w-[980px] gap-5 md:grid-cols-3">
              {[
                ["SMPL · PIFuHD", "2D 이미지에서 3D 모델로 변환하는 가능성을 실험했습니다."],
                ["ICON · ECON", "드레스의 부피감과 레이어 구조에서 실루엣 왜곡이 반복되었습니다."],
                [
                  "Blender + MCP",
                  "후속 개인 실험까지 진행했지만 실서비스 품질 기준에는 맞지 않았습니다.",
                ],
              ].map(([title, text]) => (
                <div
                  key={title}
                  className="min-h-[240px] rounded-[32px] border border-rose-100 bg-white p-7 shadow-soft"
                >
                  <p className="text-3xl font-semibold">{title}</p>
                  <p className="mt-12 text-[15px] leading-7 text-slate-600">
                    {text}
                  </p>
                </div>
              ))}
            </div>
            <blockquote className="mx-auto mt-16 max-w-[900px] text-center text-4xl font-semibold leading-tight md:text-6xl">
              기술적 가능성 ≠ 제품 적용 가능성
            </blockquote>
            <p className="body-copy mx-auto mt-10 reading-width text-center text-slate-600">
              처리 비용, 결과 안정성, 다양한 케이스 대응 측면에서 실서비스 품질
              기준에 부합하지 않아 3D 적용을 중단했습니다.
            </p>
          </MotionBlock>
        </div>
      </div>
      <div className="px-6 py-24">
        <div className="content-grid grid gap-5 md:grid-cols-4">
          {project.productCards.map((card) => (
            <MotionBlock key={card.title}>
              <div className="min-h-[240px] rounded-[32px] border border-rose-100 bg-white p-7 shadow-soft">
                <p className="small-label text-blue-600">Product Judgment</p>
                <h3 className="mt-10 text-2xl font-semibold leading-tight">
                  {card.title}
                </h3>
                <p className="mt-5 text-[15px] leading-7 text-slate-600">
                  {card.description}
                </p>
              </div>
            </MotionBlock>
          ))}
        </div>
      </div>
      <WeddingAgentScene />
    </section>
  );
}
