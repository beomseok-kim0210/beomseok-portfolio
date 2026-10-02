import type { ProjectDetail } from "@/types/portfolio";

type ProjectTechStackProps = {
  project: ProjectDetail;
  personal?: boolean;
};

export function ProjectTechStack({ project, personal = false }: ProjectTechStackProps) {
  return (
    <section
      id={personal ? "technology" : undefined}
      aria-labelledby={personal ? "technology-title" : undefined}
      data-docent-section="technology"
      className={personal ? "min-w-0 scroll-mt-24 py-20" : "py-20"}
    >
      <p className={`cinematic-label text-blue-600 ${personal ? "" : "mb-8"}`}>Tech Stack</p>
      {personal ? <h2 id="technology-title" className="story-title mt-6">05 Tech</h2> : null}
      <div className={`flex min-w-0 flex-wrap gap-3 ${personal ? "mt-10" : ""}`}>
        {project.techStack.map((tech) => (
          <span
            key={tech}
            className="max-w-full break-words rounded-full border border-slate-200 bg-white px-4 py-3 small-label text-slate-700"
          >
            {tech}
          </span>
        ))}
      </div>
    </section>
  );
}
