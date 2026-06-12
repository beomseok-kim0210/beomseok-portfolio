import { MotionBlock } from "@/components/ui/MotionBlock";

type ClawdevSectionHeadingProps = {
  label: string;
  title: string;
  subtitle?: string;
};

export function ClawdevSectionHeading({
  label,
  title,
  subtitle,
}: ClawdevSectionHeadingProps) {
  return (
    <MotionBlock>
      <p className="project-section-label text-[var(--clawdev-accent)]">
        {label}
      </p>
      <h2 className="mt-6 text-[34px] font-bold leading-[0.98] tracking-[-0.04em] text-white md:text-[52px]">
        {title.split("\n").map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </h2>
      {subtitle ? (
        <p className="project-subtitle mt-7 max-w-[760px] text-slate-400">
          {subtitle}
        </p>
      ) : null}
    </MotionBlock>
  );
}
