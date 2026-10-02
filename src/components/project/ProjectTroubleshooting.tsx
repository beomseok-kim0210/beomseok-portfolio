import type { ProjectDetail } from "@/types/portfolio";

type ProjectTroubleshootingProps = {
  project: ProjectDetail;
  personal?: boolean;
};

export function ProjectTroubleshooting({ project, personal = false }: ProjectTroubleshootingProps) {
  if (!personal && project.troubleshooting.length === 0) return null;

  return (
    <section
      id={personal ? "troubleshooting" : undefined}
      aria-labelledby={personal ? "troubleshooting-title" : undefined}
      data-docent-section="troubleshooting"
      className={personal ? "scroll-mt-24 py-20" : "py-20"}
    >
      <p className="cinematic-label mb-6 text-blue-600">Troubleshooting</p>
      <h2 id={personal ? "troubleshooting-title" : undefined} className="story-title max-w-[820px]">
        {personal ? "03 트러블슈팅" : "문제를 어떻게 다시 정의했는가."}
      </h2>
      <div className="mt-12 space-y-6">
        {project.troubleshooting.map((item, index) => (
          <article
            key={item.title}
            className="rounded-[32px] border border-slate-200 bg-white p-7 md:p-9"
          >
            <p className="small-label text-blue-600">
              {personal ? "Troubleshooting " : ""}{String(index + 1).padStart(2, "0")}
            </p>
            <h3 className="mt-5 text-3xl font-semibold leading-tight">
              {item.title}
            </h3>
            <p className="project-body mt-4">{item.summary}</p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {(personal ? [
                ["Problem · 문제", item.problem],
                ["Analysis · 원인 분석", item.investigation],
                ["Attempt · 시도", item.attempts?.join("\n")],
                ["Limit · 실패·한계", item.limitation],
                ["Decision · 판단", item.decision],
                ["Solution · 변경", item.solution],
                ["Result · 결과", item.result],
              ] : [
                ["Problem", item.problem],
                ["Investigation", item.investigation],
                ["Solution", item.solution],
                ["Result", item.result],
              ]).filter(([, text]) => Boolean(text)).map(([label, text]) => (
                <div key={label} className="rounded-[24px] bg-[#FAFAFA] p-5">
                  <p className="small-label text-slate-500">{label}</p>
                  <p className="project-caption mt-3 whitespace-pre-line text-slate-700">
                    {text}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {item.tech.map((tech) => (
                <span
                  key={tech}
                  className="max-w-full break-words rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
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
