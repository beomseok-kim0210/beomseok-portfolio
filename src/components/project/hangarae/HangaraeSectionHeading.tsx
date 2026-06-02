import { MotionBlock } from "@/components/ui/MotionBlock";

type HangaraeSectionHeadingProps = {
  label: string;
  title: string;
  subtitle?: string;
  light?: boolean;
};

export function HangaraeSectionHeading({
  label,
  title,
  subtitle,
  light = false,
}: HangaraeSectionHeadingProps) {
  return (
    <MotionBlock>
      <p className={`small-label ${light ? "text-emerald-200" : "text-[#24C27A]"}`}>
        {label}
      </p>
      <h2
        className={`mt-6 text-[42px] font-bold leading-[0.95] tracking-[-0.04em] md:text-[64px] ${
          light ? "text-white" : "text-[#111827]"
        }`}
      >
        {title.split("\n").map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </h2>
      {subtitle ? (
        <p
          className={`project-subtitle mt-8 max-w-[720px] ${
            light ? "text-slate-300" : "text-slate-600"
          }`}
        >
          {subtitle}
        </p>
      ) : null}
    </MotionBlock>
  );
}
