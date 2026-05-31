import type { ProjectDetail } from "@/types/portfolio";

type ProjectTechStackProps = {
  project: ProjectDetail;
};

export function ProjectTechStack({ project }: ProjectTechStackProps) {
  return (
    <section className="py-20">
      <p className="cinematic-label mb-8 text-blue-600">Tech Stack</p>
      <div className="flex flex-wrap gap-3">
        {project.techStack.map((tech) => (
          <span
            key={tech}
            className="rounded-full border border-slate-200 bg-white px-4 py-3 small-label text-slate-700"
          >
            {tech}
          </span>
        ))}
      </div>
    </section>
  );
}
