import type { ProjectDetail } from "@/types/portfolio";

type ProjectOverviewProps = {
  project: ProjectDetail;
};

export function ProjectOverview({ project }: ProjectOverviewProps) {
  return (
    <section className="py-20">
      <div className="grid gap-5 md:grid-cols-3">
        {project.highlights.map((highlight) => (
          <div
            key={highlight.label}
            className="rounded-[28px] border border-slate-200 bg-white p-7"
          >
            <p className="small-label text-slate-500">{highlight.label}</p>
            <p className="mt-8 text-4xl font-bold tracking-[-0.04em]">
              {highlight.value}
            </p>
            <p className="project-caption mt-4">
              {highlight.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
