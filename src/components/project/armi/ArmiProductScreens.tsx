import { existsSync } from "node:fs";
import path from "node:path";
import { MotionBlock } from "@/components/ui/MotionBlock";
import { armiScreens } from "@/data/armiCaseStudy";
import { ArmiMediaPlaceholder } from "./ArmiMediaPlaceholder";
import { ArmiSectionHeading } from "./ArmiSectionHeading";

function resolvePublicAssetSrc(src: string) {
  const relativePath = decodeURIComponent(src).replace(/^\//, "");
  const absolutePath = path.join(process.cwd(), "public", relativePath);

  return existsSync(absolutePath) ? src : undefined;
}

export function ArmiProductScreens() {
  const [tablet, watch, avatar] = armiScreens;
  const tabletVideoSrc = "/videos/Patient%20Tablet%20App.mp4";
  const watchVideoSrc = "/videos/Watch%20Alert.mp4";
  const avatarVideoSrc = "/videos/Responsive%20Avatar%20UI.mp4";

  return (
    <section className="py-[96px] md:py-[160px]">
      <div className="mx-auto max-w-[1280px]">
        <ArmiSectionHeading
          label="Product Screens"
          title="사용자가 마주하는 상태 화면을 먼저 정리했습니다."
          subtitle="환자 앱, 의료진 Watch, Avatar UI가 같은 상태 흐름 안에서 움직이도록 구성했습니다."
        />
        <div className="mt-14 space-y-6">
          <MotionBlock>
            <article className="rounded-[32px] border border-[#E2E8F0] bg-white p-6 md:p-8">
              <div className="mt-6">
                <h3 className="text-3xl font-semibold tracking-[-0.03em] text-[#111827]">
                  {tablet.title}
                </h3>
                <p className="project-body mt-4">
                  {tablet.description}
                </p>
              </div>
              <ArmiMediaPlaceholder
                src={resolvePublicAssetSrc(tabletVideoSrc)}
                alt={tablet.alt}
                mediaType="video"
                mediaFit="contain"
                className="mt-8 h-[420px] w-full bg-[#F8FAFC] md:h-[760px]"
              />
            </article>
          </MotionBlock>
          <div className="grid gap-6 xl:grid-cols-2">
            {[watch, avatar].map((screen, index) => (
              <MotionBlock key={screen.title} delay={index * 0.06}>
                <article className="rounded-[32px] border border-[#E2E8F0] bg-white p-6 md:p-8">
                  <div className="mt-6">
                    <h3 className="text-3xl font-semibold tracking-[-0.03em] text-[#111827]">
                      {screen.title}
                    </h3>
                    <p className="project-body mt-4">
                      {screen.description}
                    </p>
                  </div>
                  <ArmiMediaPlaceholder
                    src={
                      screen.title === "Watch Alert"
                        ? resolvePublicAssetSrc(watchVideoSrc)
                        : resolvePublicAssetSrc(avatarVideoSrc)
                    }
                    alt={screen.alt}
                    mediaType="video"
                    mediaFit={screen.title === "Watch Alert" ? "contain" : "cover"}
                    className="mt-8 aspect-square w-full bg-[#F8FAFC]"
                  />
                </article>
              </MotionBlock>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
