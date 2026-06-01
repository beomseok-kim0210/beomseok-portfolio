import { MotionBlock } from "@/components/ui/MotionBlock";

type ArmiSectionHeadingProps = {
  label: string;
  title: string;
  subtitle?: string;
  className?: string;
};

export function ArmiSectionHeading({
  label,
  title,
  subtitle,
  className = "",
}: ArmiSectionHeadingProps) {
  return (
    <MotionBlock className={className}>
      <p className="small-label text-blue-600">{label}</p>
      <h2 className="mt-6 text-[42px] font-bold leading-[0.95] tracking-[-0.04em] text-[#111827] md:text-[64px]">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-8 max-w-[840px] text-[18px] leading-[1.75] text-slate-600">
          {subtitle}
        </p>
      ) : null}
    </MotionBlock>
  );
}
