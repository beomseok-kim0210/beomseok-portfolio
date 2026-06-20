import { MotionBlock } from "@/components/ui/MotionBlock";
import { armiTroubleshooting } from "@/data/armiCaseStudy";
import { ArmiSectionHeading } from "./ArmiSectionHeading";

export function ArmiVisualTroubleshooting() {
  return (
    <section className="py-[96px] md:py-[160px]">
      <div className="mx-auto max-w-[1280px]">
        <ArmiSectionHeading
          label="Visual Troubleshooting"
          title={"트러블 → 모색 → 선택 → 인사이트로\n판단 과정을 그대로 보여줍니다."}
          subtitle="각 이슈는 단순 순번이 아니라 시스템에서 충돌한 자원과 정책 기준으로 분류했습니다."
        />
        <div className="mt-14 space-y-8">
          {armiTroubleshooting.map((item, index) => (
            <MotionBlock key={item.category} delay={index * 0.06}>
              <article className="rounded-[40px] border border-[#E2E8F0] bg-white p-6 md:p-10">
                <p className="step-label text-blue-600">{item.category}</p>
                <h3 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-[#111827]">
                  {item.title}
                </h3>
                <p className="project-body mt-4 max-w-[840px]">{item.diagnosis}</p>

                {/* ── 판단 흐름: 트러블 → 모색 → 선택 & 근거 → 인사이트 ── */}
                <div className="mt-10 space-y-4">
                  {/* 01 트러블 — 빨강 계열로 '문제'를 시각적으로 구분 */}
                  <div className="rounded-[28px] border border-red-200 bg-red-50 p-7 md:p-8">
                    <p className="step-label flex items-center gap-2 text-red-600">
                      <span
                        className="inline-block h-2 w-2 rounded-full bg-red-500"
                        aria-hidden="true"
                      />
                      01 · 트러블
                    </p>
                    <p className="mt-3 text-[17px] font-semibold leading-7 text-[#111827] md:text-[19px]">
                      {item.summary.problem}
                    </p>
                    <p className="mt-2 text-[14px] leading-6 text-red-700/70">
                      원인 · {item.cause}
                    </p>
                  </div>

                  {/* 02 모색한 방법 — 검토한 옵션과 선택지 */}
                  <div className="rounded-[28px] border border-slate-200 bg-white p-7 md:p-8">
                    <p className="step-label text-slate-500">02 · 모색한 방법</p>
                    <ul className="mt-4 space-y-2.5">
                      {item.approaches.map((opt, i) => {
                        const chosen = i === item.approaches.length - 1;
                        return (
                          <li
                            key={opt}
                            className={`flex items-start gap-3 rounded-2xl border p-4 ${
                              chosen
                                ? "border-blue-300 bg-[#EFF6FF]"
                                : "border-slate-200 bg-white"
                            }`}
                          >
                            <span
                              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                chosen
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {chosen ? "✓" : i + 1}
                            </span>
                            <span
                              className={`text-[15px] leading-7 ${
                                chosen
                                  ? "font-semibold text-[#111827]"
                                  : "text-slate-600"
                              }`}
                            >
                              {opt}
                              {chosen && (
                                <span className="ml-2 inline-block rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-bold text-white">
                                  선택
                                </span>
                              )}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* 03 선택 & 근거 — 시각적 주인공(HERO) */}
                  <div className="rounded-[28px] bg-[#1D4ED8] p-7 text-white md:p-9">
                    <p className="step-label text-white/70">03 · 선택 &amp; 근거</p>
                    <p className="mt-4 text-[20px] font-bold leading-[1.5] tracking-[-0.02em] md:text-[26px]">
                      {item.summary.solution}
                    </p>
                    <p className="mt-4 text-[15px] leading-7 text-white/85 md:text-[16px]">
                      <span className="font-semibold text-white">왜 이 방법인가 · </span>
                      {item.rationale}
                    </p>
                    <div className="mt-6 border-t border-white/15 pt-5">
                      <p className="step-label text-white/70">결과</p>
                      <p className="mt-2 text-[15px] font-semibold leading-7 text-white md:text-[16px]">
                        {item.summary.result}
                      </p>
                    </div>
                  </div>

                  {/* 💡 인사이트 */}
                  <div className="flex items-start gap-4 rounded-[24px] border-l-4 border-blue-500 bg-[#EFF6FF] p-6 md:p-7">
                    <span className="text-2xl leading-none" aria-hidden="true">
                      💡
                    </span>
                    <div>
                      <p className="step-label text-blue-600">인사이트</p>
                      <p className="mt-2 text-[16px] font-semibold leading-7 text-[#111827] md:text-[18px]">
                        {item.insight}
                      </p>
                    </div>
                  </div>

                  {/* tech chips */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {item.tech.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            </MotionBlock>
          ))}
        </div>
      </div>
    </section>
  );
}
