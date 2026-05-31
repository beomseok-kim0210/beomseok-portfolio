import { MotionBlock } from "@/components/ui/MotionBlock";
import {
  ProjectVideoFrame,
  type VideoTheme,
} from "@/components/ui/ProjectVideoFrame";

type VideoRevealSceneProps = {
  title: string;
  theme: VideoTheme;
  eyebrow: string;
  duration?: string;
};

export function VideoRevealScene({
  title,
  theme,
  eyebrow,
  duration,
}: VideoRevealSceneProps) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-24">
      <MotionBlock className="w-[85vw] max-w-[1500px]">
        <ProjectVideoFrame
          title={title}
          theme={theme}
          eyebrow={eyebrow}
          duration={duration}
        />
      </MotionBlock>
    </div>
  );
}
