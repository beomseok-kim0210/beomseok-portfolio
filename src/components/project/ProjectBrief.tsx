import type { ProjectDetail } from "@/types/portfolio";

type ProjectBriefProps = {
  brief: ProjectDetail["brief"];
  dark?: boolean;
  className?: string;
};

export function ProjectBrief({ brief, dark = false, className = "" }: ProjectBriefProps) {
  if (!brief) return null;

  const panel = dark
    ? "border-white/10 bg-white/[0.04]"
    : "border-slate-200 bg-white";
  const inset = dark ? "bg-white/[0.05]" : "bg-slate-50";
  const heading = dark ? "text-white" : "text-[#111827]";
  const body = dark ? "text-slate-300" : "text-slate-600";
  const muted = dark ? "text-slate-300" : "text-slate-600";
  const accent = dark ? "text-blue-300" : "text-blue-600";

  return (
    <section className={`${className} py-16 md:py-24`} data-docent-section="brief">
      <div className={`rounded-[32px] border p-6 md:p-10 ${panel}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className={`cinematic-label ${accent}`}>Project Brief</p>
            <h2 className={`mt-4 font-display text-3xl font-semibold tracking-[-0.04em] md:text-4xl ${heading}`}>
              핵심만 먼저 봅니다.
            </h2>
          </div>
          {brief.status || brief.scope ? (
            <div className="flex flex-wrap gap-2">
              {brief.scope ? (
                <span className={`rounded-full px-3 py-2 text-xs font-semibold ${inset} ${body}`}>
                  {brief.scope === "solo" ? "Solo" : "Team"}
                </span>
              ) : null}
              {brief.status ? (
                <span className={`rounded-full px-3 py-2 text-xs font-semibold ${inset} ${body}`}>
                  {brief.status}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <div>
            <p className={`small-label ${accent}`}>Problem</p>
            <p className={`mt-4 text-lg font-medium leading-8 ${heading}`}>{brief.problem}</p>
          </div>

          <div>
            <p className={`small-label ${accent}`}>My Role</p>
            <div className={`mt-4 rounded-[24px] p-5 ${inset}`}>
              <p className={`text-support font-semibold ${body}`}>개인 기여</p>
              <ul className={`mt-3 space-y-2 text-body ${body}`}>
                {brief.role.personal.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span aria-hidden="true" className={accent}>•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            {brief.role.team?.length ? (
              <div className={`mt-3 rounded-[24px] p-5 ${inset}`}>
                <p className={`text-support font-semibold ${body}`}>팀 공통</p>
                <ul className={`mt-3 space-y-2 text-body ${body}`}>
                  {brief.role.team.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span aria-hidden="true" className={accent}>•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-10 border-t border-current/10 pt-10">
          <p className={`small-label ${accent}`}>Key Decisions</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {brief.decisions.map((decision, index) => (
              <article key={decision.title} className={`rounded-[24px] p-5 ${inset}`}>
                <p className={`small-label ${muted}`}>{String(index + 1).padStart(2, "0")}</p>
                <h3 className={`mt-4 text-xl font-semibold ${heading}`}>{decision.title}</h3>
                <p className={`mt-3 text-body ${body}`}>{decision.reason}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-10 border-t border-current/10 pt-10">
          <p className={`small-label ${accent}`}>Validation</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {brief.validation.map((item) => (
              <div key={`${item.label}-${item.value}`} className={`rounded-[24px] p-5 ${inset}`}>
                <p className={`font-display text-3xl font-semibold tracking-[-0.04em] ${heading}`}>
                  {item.value}
                </p>
                <p className={`mt-3 text-support font-semibold ${body}`}>{item.label}</p>
                {item.note ? <p className={`mt-2 text-support ${muted}`}>{item.note}</p> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 border-t border-current/10 pt-10">
          <p className={`small-label ${accent}`}>Result</p>
          <p className={`mt-4 max-w-[880px] text-lg font-medium leading-8 ${heading}`}>{brief.result}</p>
        </div>
      </div>
    </section>
  );
}
