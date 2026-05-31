import { BeforeAfterFrame } from "@/components/ui/BeforeAfterFrame";
import { ProjectVideoFrame } from "@/components/ui/ProjectVideoFrame";
import type { ProjectDetail } from "@/types/portfolio";

type ProjectMediaSectionProps = {
  project: ProjectDetail;
};

export function ProjectMediaSection({ project }: ProjectMediaSectionProps) {
  return (
    <section className="py-16">
      {project.theme === "wedding" ? (
        <BeforeAfterFrame
          beforeSrc={project.media.posterSrc}
          afterSrc={project.media.videoSrc}
        />
      ) : (
        <ProjectVideoFrame
          theme={project.theme}
          title={project.title}
          eyebrow={project.label}
          videoSrc={project.media.videoSrc}
          posterSrc={project.media.posterSrc}
        />
      )}
      <p className="small-label mt-6 text-slate-500">{project.media.caption}</p>
    </section>
  );
}
