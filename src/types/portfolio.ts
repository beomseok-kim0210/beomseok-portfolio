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
  key: "armi" | "hangarae" | "wedding" | "docent";
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

export type ProjectSlug =
  | "armi"
  | "hangarae"
  | "wedding"
  | "claw-dev"
  | "ai-docent"
  | "crime-scene"
  | "bcos";

export type ProjectCard = {
  slug: ProjectSlug;
  href: string;
  name: string;
  oneLiner: string;
  problem: string;
  highlights: string[];
  status?: string;
  scope: "solo" | "team";
};

export type TroubleshootingItem = {
  title: string;
  summary: string;
  problem: string;
  investigation: string;
  attempts?: string[];
  limitation?: string;
  decision?: string;
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
  personalStory?: {
    form: string;
    period?: string;
    motivation: {
      limitation: string;
      hypothesis?: string;
      start?: string;
    };
    retrospective: string[];
    outcomes?: string[];
    links?: { label: string; href: string }[];
    showVideo: boolean;
  };
  brief?: {
    problem: string;
    role: {
      personal: string[];
      team?: string[];
    };
    decisions: {
      title: string;
      reason: string;
    }[];
    validation: {
      label: string;
      value: string;
      note?: string;
    }[];
    result: string;
    status?: string;
    scope?: "solo" | "team";
  };
};
