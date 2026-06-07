// src/data/videoSources.ts

const ARMI_FULL_VIDEO =
  "https://beomdda.sirv.com/video/armi-full-demo.mp4";

const HANGARAE_FULL_VIDEO =
  "https://beomdda.sirv.com/video/hangarae-full-demo.mp4";

export const fullVideoSources = {
  armi:
    process.env.NEXT_PUBLIC_ARMI_FULL_VIDEO ||
    ARMI_FULL_VIDEO,

  hangarae:
    process.env.NEXT_PUBLIC_HANGARAE_FULL_VIDEO ||
    HANGARAE_FULL_VIDEO,
} as const;