import type { ProjectDetail } from "@/types/portfolio";

type ProjectRoleProps = {
  project: ProjectDetail;
};

export function ProjectRole({ project }: ProjectRoleProps) {
  return (
    <section className="py-20">
      <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
        <div>
          <p className="cinematic-label mb-6 text-blue-600">Role</p>
          <h2 className="story-title">맡은 역할</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {project.role.map((role) => (
            <div
              key={role}
              className="rounded-[24px] border border-slate-200 bg-white p-6"
            >
              <p className="text-xl font-semibold leading-tight">{role}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
