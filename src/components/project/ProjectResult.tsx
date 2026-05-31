import type { ProjectDetail } from "@/types/portfolio";

type ProjectResultProps = {
  project: ProjectDetail;
};

export function ProjectResult({ project }: ProjectResultProps) {
  return (
    <section className="py-20">
      <div className="rounded-[36px] bg-[#111827] p-8 text-white md:p-12">
        <p className="cinematic-label mb-8 text-blue-300">Result</p>
        <div className="grid gap-5 md:grid-cols-3">
          {project.result.map((result) => (
            <p key={result} className="text-xl font-semibold leading-8">
              {result}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
