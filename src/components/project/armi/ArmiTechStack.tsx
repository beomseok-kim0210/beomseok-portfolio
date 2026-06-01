import { MotionBlock } from "@/components/ui/MotionBlock";
import { armiTechGroups } from "@/data/armiCaseStudy";
import { ArmiSectionHeading } from "./ArmiSectionHeading";

export function ArmiTechStack() {
  return (
    <section className="py-[96px] md:py-[160px]">
      <div className="mx-auto max-w-[1280px]">
        <ArmiSectionHeading
          label="Tech Stack"
          title="기술은 나열하지 않고 역할별로 묶었습니다."
        />
        <div className="mt-14 grid gap-6 xl:grid-cols-2">
          {armiTechGroups.map((group, index) => (
            <MotionBlock key={group.title} delay={index * 0.06}>
              <article className="rounded-[32px] border border-[#E2E8F0] bg-white p-8">
                <p className="small-label text-blue-600">{group.title}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  {group.items.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-slate-200 bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-slate-700"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </article>
            </MotionBlock>
          ))}
        </div>
      </div>
    </section>
  );
}
