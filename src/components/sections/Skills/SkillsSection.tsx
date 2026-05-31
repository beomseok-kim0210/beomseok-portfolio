import { MotionBlock } from "@/components/ui/MotionBlock";
import { skills } from "@/data/skills";

type SkillsSectionProps = {
  variant?: "preview" | "page";
};

export function SkillsSection({ variant = "preview" }: SkillsSectionProps) {
  const isPage = variant === "page";

  return (
    <section id="skills" className="section-shell section-pad bg-[#FAFAFA]">
      <div className="content-grid">
        <MotionBlock>
          <p className="small-label mb-5 text-blue-600">Skills</p>
          <h2 className="section-title">
            {isPage ? "Technical Capability Map" : "Built Through Products"}
          </h2>
          <p className="subtitle mt-8 max-w-[760px] text-slate-700">
            기술 숙련도를 숫자로 과장하지 않고, 실제 프로젝트에서 어떤 문제를
            해결하는 데 사용했는지 중심으로 정리합니다.
          </p>
        </MotionBlock>
        <div
          className={`mt-14 grid gap-5 ${
            isPage ? "lg:grid-cols-2" : "lg:grid-cols-5"
          }`}
        >
          {skills.map((group) => {
            const Icon = group.icon;

            return (
              <MotionBlock key={group.category}>
                <div className="h-full rounded-[32px] border border-slate-200 bg-white p-6 md:p-8">
                  <div className="mb-9 flex items-center justify-between gap-4">
                    <Icon className="h-7 w-7 text-blue-600" />
                    <span className="small-label text-slate-400">
                      {String(group.items.length).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="text-2xl font-semibold">{group.category}</h3>
                  <div className="mt-8 space-y-5">
                    {group.items.map((item) => (
                      <div
                        key={item.technology}
                        className={isPage ? "rounded-[24px] bg-[#FAFAFA] p-5" : ""}
                      >
                        <p className="small-label text-slate-900">
                          {item.technology}
                        </p>
                        <p className="mt-1 text-[14px] leading-6 text-slate-500">
                          Used in: {item.usedIn}
                        </p>
                        <p className="mt-1 text-[14px] leading-6 text-slate-600">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </MotionBlock>
            );
          })}
        </div>
      </div>
    </section>
  );
}
