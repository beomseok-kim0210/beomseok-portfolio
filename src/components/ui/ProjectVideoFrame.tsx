import { Play } from "lucide-react";
import { BeforeAfterFrame } from "@/components/ui/BeforeAfterFrame";
import { TrackingSkeleton } from "@/components/ui/TrackingSkeleton";

export type VideoTheme = "armi" | "hangarae" | "wedding" | "lab";

type ProjectVideoFrameProps = {
  theme: VideoTheme;
  title: string;
  eyebrow: string;
  duration?: string;
  videoSrc?: string;
  posterSrc?: string;
};

const themeMap = {
  armi: {
    className: "border-[rgba(96,165,250,0.24)] bg-[linear-gradient(135deg,#07111F_0%,#0F2747_100%)] text-white",
    chips: ["Voice AI", "Robot", "Realtime UX", "Watch"],
  },
  hangarae: {
    className: "border-[rgba(36,194,122,0.22)] bg-[linear-gradient(135deg,#F6FFFB_0%,#DDF6EC_100%)] text-[#111827]",
    chips: ["18 Point Tracking", "YOLOv11-M", "Redis", "Game Feedback"],
  },
  wedding: {
    className: "border-[rgba(185,137,121,0.24)] bg-[linear-gradient(135deg,#FFF9F7_0%,#F9EAE6_100%)] text-[#111827]",
    chips: ["Generative AI", "Virtual Fitting", "Product Decision"],
  },
  lab: {
    className: "border-slate-200 bg-[linear-gradient(135deg,#F8FAFC_0%,#E2E8F0_100%)] text-[#111827]",
    chips: ["Multi-Agent", "RAG", "Verification Loop"],
  },
};

export function ProjectVideoFrame({
  theme,
  title,
  eyebrow,
  duration = "03:42",
  videoSrc,
  posterSrc,
}: ProjectVideoFrameProps) {
  const config = themeMap[theme];

  return (
    <div
      className={`relative mx-auto aspect-video w-full max-w-[1180px] overflow-hidden rounded-[24px] border shadow-[0_40px_120px_rgba(15,23,42,0.14)] md:rounded-[36px] ${config.className}`}
      aria-label={title}
    >
      {videoSrc ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={posterSrc}
          className="h-full w-full object-cover"
        >
          <source src={videoSrc} />
        </video>
      ) : (
        <>
          <div className="absolute inset-0 opacity-20 [background-image:repeating-linear-gradient(0deg,currentColor_0_1px,transparent_1px_32px),repeating-linear-gradient(90deg,currentColor_0_1px,transparent_1px_32px)]" />
          <div className="absolute left-6 top-6 md:left-8 md:top-8">
            <p className="cinematic-label opacity-70">{eyebrow}</p>
            <p className="mt-3 text-3xl font-bold md:text-5xl">{title}</p>
            <p className="mt-3 text-sm font-semibold opacity-60">{duration}</p>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            {theme === "hangarae" ? (
              <div className="w-[220px] md:w-[320px]">
                <TrackingSkeleton compact />
              </div>
            ) : theme === "wedding" ? (
              <div className="w-[70%] max-w-[560px]">
                <BeforeAfterFrame compact />
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-2xl md:h-20 md:w-20">
                <Play className="h-7 w-7 fill-current" />
              </div>
            )}
          </div>
          <div className="absolute bottom-5 left-5 right-5 flex flex-wrap gap-2 md:bottom-8 md:left-8 md:right-8">
            {config.chips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-current/15 bg-white/10 px-4 py-2 text-xs font-semibold backdrop-blur-xl"
              >
                {chip}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
