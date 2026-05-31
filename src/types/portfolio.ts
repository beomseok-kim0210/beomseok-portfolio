import type { LucideIcon } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
};

export type TimelineItem = {
  title: string;
  label: string;
  description: string;
  visual: string;
};

export type ProjectTheme = "dark" | "mint" | "warm" | "light";

export type Project = {
  key: "armi" | "hangarae" | "wedding";
  name: string;
  label: string;
  headline: string;
  description: string;
  background: string;
  foreground: string;
  muted: string;
  core: string;
  sections: string[];
  points: string[];
  technologies: string[];
  productCards: {
    title: string;
    description: string;
    keywords?: string[];
  }[];
  metrics?: MetricItem[];
  award?: string;
  role?: string;
  identity?: string;
  impact: string;
  theme: ProjectTheme;
};

export type MetricItem = {
  label: string;
  before?: string;
  after: string;
  caption?: string;
};

export type Challenge = {
  title: string;
  shortLabel: string;
  summary: string;
  problem: string;
  investigation: string;
  solution: string;
  result: string;
  tech: string[];
};

export type LabTopic = {
  title: string;
};

export type SkillGroup = {
  category: string;
  icon: LucideIcon;
  items: {
    technology: string;
    usedIn: string;
    description: string;
  }[];
};

export type KnowledgeNote = {
  slug: string;
  title: string;
  category: string;
  difficulty: string;
  lastUpdated: string;
  readingTime: string;
  keywords: string[];
  summary: string;
  body: string;
};

export type FloatingProjectCard = {
  name: string;
  meta: string;
  icon: LucideIcon;
  className: string;
};

export type KnowledgeCategory = {
  title: string;
  description: string;
};

export type ProjectSlug = "armi" | "hangarae" | "wedding" | "claw-dev";

export type TroubleshootingItem = {
  title: string;
  summary: string;
  problem: string;
  investigation: string;
  solution: string;
  result: string;
  tech: string[];
};

export type ProjectDetail = {
  slug: ProjectSlug;
  title: string;
  subtitle: string;
  label: string;
  theme: "armi" | "hangarae" | "wedding" | "lab";
  problemQuestion: string[];
  description: string;
  role: string[];
  techStack: string[];
  media: {
    videoSrc?: string;
    posterSrc?: string;
    caption: string;
  };
  highlights: {
    label: string;
    value: string;
    description: string;
  }[];
  architecture: {
    title: string;
    description: string;
    items: {
      title: string;
      description: string;
      tech?: string[];
    }[];
  };
  troubleshooting: TroubleshootingItem[];
  result: string[];
};
