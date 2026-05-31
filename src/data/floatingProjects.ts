import { Bot, Sparkles, Waypoints } from "lucide-react";
import type { FloatingProjectCard } from "@/types/portfolio";

export const floatingProjects: FloatingProjectCard[] = [
  {
    name: "ARMI",
    icon: Bot,
    meta: "Voice AI · Robot",
    className: "left-6 top-8 bg-[#07111F] text-white",
  },
  {
    name: "행가래",
    icon: Waypoints,
    meta: "Rehab · LLM",
    className: "right-2 top-[36%] bg-[#F7FFFB] text-[#111827]",
  },
  {
    name: "Wedding Dress",
    icon: Sparkles,
    meta: "Generative AI",
    className: "bottom-10 left-[18%] bg-[#FFF9F8] text-[#111827]",
  },
];
