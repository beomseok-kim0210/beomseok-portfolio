import type { ProjectDetail } from "@/types/portfolio";

type ProjectArchitectureProps = {
  project: ProjectDetail;
};

export function ProjectArchitecture({ project }: ProjectArchitectureProps) {
  return (
    <section className="py-20">
      <div className="max-w-[860px]">
        <p className="cinematic-label mb-6 text-blue-600">Product Flow</p>
        <h2 className="story-title">{project.architecture.title}</h2>
        <p className="body-copy mt-8">{project.architecture.description}</p>
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-2">
        {project.architecture.items.map((item) => (
          <div
            key={item.title}
            className="rounded-[28px] border border-slate-200 bg-white p-7"
          >
            <h3 className="text-2xl font-semibold">{item.title}</h3>
            <p className="mt-5 text-[15px] leading-7 text-slate-600">
              {item.description}
            </p>
            {item.tech ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {item.tech.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
