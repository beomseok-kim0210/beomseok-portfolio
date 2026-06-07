// src/data/videoSources.ts

const ARMI_FULL_VIDEO =
  "https://beomdda.sirv.com/video/ARMI_video_portfolio.mp4";

const HANGARAE_FULL_VIDEO =
  "https://beomdda.sirv.com/video/%ED%96%89%EA%B0%80%EB%9E%98_video_fortpolio.mp4";

export const fullVideoSources = {
  armi:
    process.env.NEXT_PUBLIC_ARMI_FULL_VIDEO ||
    ARMI_FULL_VIDEO,

  hangarae:
    process.env.NEXT_PUBLIC_HANGARAE_FULL_VIDEO ||
    HANGARAE_FULL_VIDEO,
} as const;