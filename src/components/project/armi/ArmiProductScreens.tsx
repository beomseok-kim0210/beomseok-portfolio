import { MotionBlock } from "@/components/ui/MotionBlock";
import { armiScreens } from "@/data/armiCaseStudy";
import { ArmiMediaPlaceholder } from "./ArmiMediaPlaceholder";
import { ArmiSectionHeading } from "./ArmiSectionHeading";

export function ArmiProductScreens() {
  const [tablet, watch, avatar] = armiScreens;

  return (
    <section className="py-[96px] md:py-[160px]">
      <div className="mx-auto max-w-[1280px]">
        <ArmiSectionHeading
          label="Product Screens"
          title="실제로 사용자가 마주하는 화면을 설계했습니다."
          subtitle="환자 앱, 의료진 Watch, 반응형 Avatar UI가 하나의 상태 흐름 안에서 동작하도록 구성했습니다."
        />
        <div className="mt-14 grid gap-6 xl:grid-cols-12">
          <MotionBlock className="xl:col-span-7">
            <article className="rounded-[32px] border border-[#E2E8F0] bg-white p-6 md:p-8">
              <ArmiMediaPlaceholder
                src={tablet.src}
                alt={tablet.alt}
                className="h-[360px] w-full md:h-[640px]"
              />
              <div className="mt-6">
                <h3 className="text-3xl font-semibold tracking-[-0.03em] text-[#111827]">
                  {tablet.title}
                </h3>
                <p className="mt-4 text-[18px] leading-[1.75] text-slate-600">
                  {tablet.description}
                </p>
                <p className="mt-5 text-sm text-slate-500">
                  실제 캡처 이미지는 `public/images/armi` 폴더에 추가하면 자동 반영되도록 처리했습니다.
                </p>
              </div>
            </article>
          </MotionBlock>
          <div className="space-y-6 xl:col-span-5">
            {[watch, avatar].map((screen, index) => (
              <MotionBlock key={screen.title} delay={index * 0.06}>
                <article className="rounded-[32px] border border-[#E2E8F0] bg-white p-6 md:p-8">
                  <ArmiMediaPlaceholder
                    src={screen.src}
                    alt={screen.alt}
                    className="h-[360px] w-full md:h-[308px]"
                  />
                  <div className="mt-6">
                    <h3 className="text-3xl font-semibold tracking-[-0.03em] text-[#111827]">
                      {screen.title}
                    </h3>
                    <p className="mt-4 text-[18px] leading-[1.75] text-slate-600">
                      {screen.description}
                    </p>
                    <p className="mt-5 text-sm text-slate-500">
                      실제 캡처 이미지는 `public/images/armi` 폴더에 추가하면 자동 반영됩니다.
                    </p>
                  </div>
                </article>
              </MotionBlock>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
