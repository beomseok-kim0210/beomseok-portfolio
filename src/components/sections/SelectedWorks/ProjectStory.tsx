import { MotionBlock } from "@/components/ui/MotionBlock";
import { ProjectVideoFrame } from "@/components/ui/ProjectVideoFrame";
import type { Project } from "@/types/portfolio";

type ProjectStoryProps = {
  project: Project;
};

export function ProjectStory({ project }: ProjectStoryProps) {
  const isDark = project.key === "armi";
  const surfaceClass = isDark
    ? "border-white/10 bg-white/[0.055] text-slate-100"
    : "border-slate-200 bg-white/72 text-slate-800";
  const accentClass = isDark ? "bg-blue-400" : "bg-blue-600";

  return (
    <section
      className={`section-shell section-pad ${project.foreground}`}
      style={{ background: project.background }}
    >
      <div className="content-grid">
        <MotionBlock>
          <div className="mx-auto max-w-[980px] text-center">
            <p
              className={`project-eyebrow mb-7 ${
                isDark
                  ? "bg-white/[0.08] text-slate-200"
                  : "bg-white text-slate-600"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${accentClass}`} />
              {project.label}
            </p>
            <h3 className="section-title mx-auto max-w-[820px]">
              {project.name}
            </h3>
            <p className="mt-7 whitespace-pre-line text-4xl font-semibold leading-tight tracking-normal md:text-6xl">
              {project.core}
            </p>
            <p className={`subtitle mx-auto mt-8 max-w-[760px] ${project.muted}`}>
              {project.headline}
            </p>
            <p className={`body-copy mx-auto mt-5 max-w-[780px] ${project.muted}`}>
              {project.description}
            </p>
          </div>
        </MotionBlock>

        <MotionBlock delay={0.08} className="mt-16">
          <ProjectVideoFrame
            title={`${project.name} product system`}
            theme={
              project.key === "armi"
                ? "armi"
                : project.key === "hangarae"
                  ? "hangarae"
                  : "wedding"
            }
            eyebrow={project.label}
          />
        </MotionBlock>

        <MotionBlock delay={0.12}>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {project.points.map((point) => (
              <div
                key={point}
                className={`min-h-[138px] rounded-[28px] border p-6 ${surfaceClass}`}
              >
                <div className={`mb-8 h-2 w-10 rounded-full ${accentClass}`} />
                <p className="text-xl font-semibold leading-tight">{point}</p>
              </div>
            ))}
          </div>
        </MotionBlock>

        <MotionBlock delay={0.16}>
          <div className="mt-16 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className={`rounded-[32px] border p-8 ${surfaceClass}`}>
              <p className={`small-label mb-5 ${project.muted}`}>Impact</p>
              <p className="text-3xl font-semibold leading-tight md:text-4xl">
                {project.impact}
              </p>
            </div>
            <div className={`rounded-[32px] border p-6 ${surfaceClass}`}>
              <div className="grid gap-3 sm:grid-cols-2">
                {project.technologies.map((technology) => (
                  <div
                    key={technology}
                    className={`rounded-[24px] border p-5 ${
                      isDark
                        ? "border-white/10 bg-black/10"
                        : "border-slate-200 bg-white/80"
                    }`}
                  >
                    <p className={`small-label ${project.muted}`}>Technology</p>
                    <p className="mt-5 text-xl font-semibold leading-tight">
                      {technology}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </MotionBlock>

        <MotionBlock delay={0.2}>
          <div className="mt-12 grid gap-4 md:grid-cols-5">
            {project.sections.map((section, index) => (
              <div
                key={section}
                className={`min-h-[150px] rounded-[24px] border p-5 ${surfaceClass}`}
              >
                <p className={`small-label ${project.muted}`}>
                  {String(index + 1).padStart(2, "0")}
                </p>
                <p className="mt-8 text-xl font-semibold leading-tight">
                  {section}
                </p>
              </div>
            ))}
          </div>
        </MotionBlock>
      </div>
    </section>
  );
}
