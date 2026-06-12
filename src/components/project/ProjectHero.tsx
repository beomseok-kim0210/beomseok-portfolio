import { SplitHeadline } from "@/components/ui/SplitHeadline";
import type { ProjectDetail } from "@/types/portfolio";

type ProjectHeroProps = {
  project: ProjectDetail;
};

export function ProjectHero({ project }: ProjectHeroProps) {
  return (
    <section className="min-h-[80vh] pt-40 pb-24">
      <p className="cinematic-label project-hero-meta mb-8 text-blue-600">
        {project.label}
      </p>
      <p className="project-hero-meta mb-8 text-slate-500">
        {project.title}
      </p>
      <SplitHeadline
        lines={project.problemQuestion}
        className="chapter-title max-w-[980px]"
      />
      <p className="body-copy mt-10 max-w-[720px]">{project.description}</p>
    </section>
  );
}
