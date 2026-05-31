import { ArrowRight } from "lucide-react";
import { MotionBlock } from "@/components/ui/MotionBlock";
import { timeline } from "@/data/timeline";

export function WhyAISection() {
  return (
    <section className="scene-shell bg-white py-32">
      <div className="content-grid">
        <MotionBlock>
          <p className="cinematic-label mb-8 text-blue-600">Why AI?</p>
          <h2 className="chapter-title text-container">
            기술을 배우기 전,
            <br />
            먼저 문제를 보는 법을 배웠습니다.
          </h2>
        </MotionBlock>
        <div className="mt-14 grid gap-4 lg:grid-cols-5">
          {timeline.map((item, index) => (
            <MotionBlock key={item.title} delay={index * 0.05}>
              <div className="product-surface relative min-h-[280px] rounded-[28px] p-6">
                <div className="mb-8 flex h-28 items-center justify-center rounded-[22px] bg-slate-50 text-center small-label text-slate-500">
                  {item.visual}
                </div>
                <p className="small-label mb-4 text-blue-600">{item.label}</p>
                <p className="text-xl font-semibold leading-tight">{item.title}</p>
                <p className="mt-4 whitespace-pre-line text-[15px] leading-7 text-slate-600">
                  {item.description}
                </p>
                {index < timeline.length - 1 ? (
                  <ArrowRight className="absolute -right-5 top-1/2 hidden h-5 w-5 text-slate-300 lg:block" />
                ) : null}
              </div>
            </MotionBlock>
          ))}
        </div>
      </div>
    </section>
  );
}
