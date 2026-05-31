type MetricCardProps = {
  label: string;
  before?: string;
  after: string;
  caption?: string;
  theme?: "hangarae" | "default";
};

export function MetricCard({
  label,
  before,
  after,
  caption,
  theme = "default",
}: MetricCardProps) {
  const isHangarae = theme === "hangarae";

  return (
    <div
      className={`min-h-[150px] rounded-[28px] border p-7 ${
        isHangarae
          ? "border-[rgba(36,194,122,0.22)] bg-white"
          : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-[13px] font-semibold text-slate-500">{label}</p>
      <div className="mt-7 flex items-end gap-3">
        {before ? (
          <>
            <p className="text-2xl font-semibold text-slate-400">{before}</p>
            <span className="pb-2 text-slate-400">→</span>
          </>
        ) : null}
        <p className="text-[56px] font-[760] leading-none tracking-[-0.04em] text-[#111827]">
          {after}
        </p>
      </div>
      {caption ? (
        <p className="mt-3 text-[13px] font-semibold text-slate-500">{caption}</p>
      ) : null}
    </div>
  );
}
