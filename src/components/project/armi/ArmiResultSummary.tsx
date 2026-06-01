import { MotionBlock } from "@/components/ui/MotionBlock";
import { armiResults } from "@/data/armiCaseStudy";
import { ArmiSectionHeading } from "./ArmiSectionHeading";

export function ArmiResultSummary() {
  return (
    <section className="py-[96px] md:py-[160px]">
      <div className="mx-auto max-w-[1280px]">
        <ArmiSectionHeading label="Result" title="상태 설계가 기능 통합보다 먼저였습니다." />
        <div className="mt-14 grid gap-6 xl:grid-cols-2">
          {armiResults.map((item, index) => (
            <MotionBlock key={item.title} delay={index * 0.06}>
              <article className="rounded-[32px] border border-[#E2E8F0] bg-white p-8">
                <p className="small-label text-blue-600">{item.label}</p>
                <h3 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-[#111827]">
                  {item.title}
                </h3>
                <p className="mt-5 text-[18px] leading-[1.75] text-slate-600">
                  {item.description}
                </p>
              </article>
            </MotionBlock>
          ))}
        </div>
      </div>
    </section>
  );
}
