import { MotionBlock } from "@/components/ui/MotionBlock";

type SectionTitleProps = {
  label?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
};

export function SectionTitle({
  label,
  title,
  subtitle,
  className = "",
}: SectionTitleProps) {
  return (
    <MotionBlock className={className}>
      {label ? <p className="small-label mb-5 text-blue-600">{label}</p> : null}
      <h2 className="section-title max-w-[820px]">{title}</h2>
      {subtitle ? (
        <p className="subtitle mt-8 max-w-[760px] text-slate-700">{subtitle}</p>
      ) : null}
    </MotionBlock>
  );
}
