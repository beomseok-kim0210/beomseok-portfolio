import type { ProjectDetail } from "@/types/portfolio";

type ProjectTroubleshootingProps = {
  project: ProjectDetail;
};

export function ProjectTroubleshooting({ project }: ProjectTroubleshootingProps) {
  if (project.troubleshooting.length === 0) return null;

  return (
    <section className="py-20">
      <p className="cinematic-label mb-6 text-blue-600">Troubleshooting</p>
      <h2 className="story-title max-w-[820px]">
        문제를 어떻게 다시 정의했는가.
      </h2>
      <div className="mt-12 space-y-6">
        {project.troubleshooting.map((item, index) => (
          <article
            key={item.title}
            className="rounded-[32px] border border-slate-200 bg-white p-7 md:p-9"
          >
            <p className="small-label text-blue-600">
              {String(index + 1).padStart(2, "0")}
            </p>
            <h3 className="mt-5 text-3xl font-semibold leading-tight">
              {item.title}
            </h3>
            <p className="mt-4 text-lg leading-8 text-slate-600">{item.summary}</p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {[
                ["Problem", item.problem],
                ["Investigation", item.investigation],
                ["Solution", item.solution],
                ["Result", item.result],
              ].map(([label, text]) => (
                <div key={label} className="rounded-[24px] bg-[#FAFAFA] p-5">
                  <p className="small-label text-slate-500">{label}</p>
                  <p className="mt-3 text-[15px] leading-7 text-slate-700">
                    {text}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {item.tech.map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
                >
                  {tech}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
