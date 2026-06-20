import { MotionBlock } from "@/components/ui/MotionBlock";

type ProjectRecapProps = {
  definition: string;
  takeaways: readonly { label: string; note: string }[];
  reflection: readonly string[];
  /** accent hex (default ARMI blue) */
  accent?: string;
};

/**
 * 프로젝트 상세 페이지의 마지막 회고 섹션.
 * 대시보드형 요약 카드가 아니라, 직접 돌아보며 쓴 글처럼 읽히도록
 * 좁은 칼럼 + 1인칭 서술 중심으로 구성한다. 하단의 문제 목록은
 * 스크롤을 위로 올리지 않아도 핵심을 회수하게 하는 조용한 앵커다.
 */
export function ProjectRecap({
  definition,
  takeaways,
  reflection,
  accent = "#60A5FA",
}: ProjectRecapProps) {
  return (
    <section className="bg-[#0B1120] py-[96px] md:py-[160px]">
      <div className="mx-auto max-w-[760px] px-5">
        <MotionBlock>
          <p className="step-label" style={{ color: accent }}>
            회고
          </p>
          <p className="mt-6 text-[17px] leading-[1.8] text-white/50 md:text-[18px]">
            {definition}
          </p>
        </MotionBlock>

        <MotionBlock delay={0.08} className="mt-10 space-y-6">
          {reflection.map((para, i) => (
            <p
              key={i}
              className="text-[17px] leading-[1.95] text-white/85 md:text-[19px]"
            >
              {para}
            </p>
          ))}
        </MotionBlock>

        <MotionBlock delay={0.16} className="mt-14 border-t border-white/10 pt-10">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/35">
            이 글의 배경이 된 문제들
          </p>
          <ul className="mt-6 space-y-4">
            {takeaways.map((t) => (
              <li
                key={t.label}
                className="flex flex-col gap-1 md:flex-row md:items-baseline md:gap-6"
              >
                <span
                  className="shrink-0 text-[14px] font-semibold md:w-[190px]"
                  style={{ color: accent }}
                >
                  {t.label}
                </span>
                <span className="text-[15px] leading-7 text-white/65">
                  {t.note}
                </span>
              </li>
            ))}
          </ul>
        </MotionBlock>
      </div>
    </section>
  );
}
