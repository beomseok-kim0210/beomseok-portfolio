import { MotionBlock } from "@/components/ui/MotionBlock";
import { SplitHeadline } from "@/components/ui/SplitHeadline";

type SceneQuestionProps = {
  label: string;
  title?: React.ReactNode;
  lines?: string[];
  dark?: boolean;
};

export function SceneQuestion({
  label,
  title,
  lines,
  dark = false,
}: SceneQuestionProps) {
  const headlineLines =
    lines ?? (typeof title === "string" ? title.split("\n") : undefined);

  return (
    <div className="flex min-h-[120vh] items-center justify-center px-6 text-center">
      <MotionBlock>
        <p
          className={`cinematic-label mb-10 ${
            dark ? "text-white/60" : "text-slate-500"
          }`}
        >
          {label}
        </p>
        {headlineLines ? (
          <SplitHeadline
            lines={headlineLines}
            className="chapter-title mx-auto max-w-[1000px]"
          />
        ) : (
          <h2 className="chapter-title mx-auto max-w-[1000px]">{title}</h2>
        )}
      </MotionBlock>
    </div>
  );
}
