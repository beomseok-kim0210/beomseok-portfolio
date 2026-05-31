type SplitHeadlineProps = {
  lines: string[];
  className?: string;
};

export function SplitHeadline({ lines, className = "" }: SplitHeadlineProps) {
  return (
    <h2 className={className}>
      {lines.map((line) => (
        <span key={line} className="block">
          {line}
        </span>
      ))}
    </h2>
  );
}
