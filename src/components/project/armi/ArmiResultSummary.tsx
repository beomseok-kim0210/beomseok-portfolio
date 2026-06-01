import { MotionBlock } from "@/components/ui/MotionBlock";
import { armiResults } from "@/data/armiCaseStudy";
import { ArmiSectionHeading } from "./ArmiSectionHeading";

export function ArmiResultSummary() {
  return (
    <section className="py-[96px] md:py-[160px]">
      <div className="mx-auto max-w-[1280px]">
        <ArmiSectionHeading
          label="Result"
          title="ARMI에서 얻은 프론트엔드 설계 기준"
        />
        <div className="mt-14 grid gap-6 xl:grid-cols-4">
          {armiResults.map((item, index) => (
            <MotionBlock key={item.title} delay={index * 0.06}>
              <article className="min-h-[220px] rounded-[32px] border border-[#E2E8F0] bg-white p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-5 text-2xl font-semibold tracking-[-0.02em] text-[#111827]">
                  {item.title}
                </h3>
                <p className="mt-5 text-[16px] leading-7 text-slate-600">
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
