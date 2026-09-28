"use client";

import { MessageCircleQuestion } from "lucide-react";
import { OPEN_GLOBAL_DOCENT_EVENT } from "./globalDocentEvents";

export function OpenGlobalDocentButton({
  label = "지금 도슨트에게 묻기",
}: {
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(OPEN_GLOBAL_DOCENT_EVENT))}
      className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-[#111827] outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1120] motion-reduce:transition-none"
    >
      <MessageCircleQuestion aria-hidden="true" className="h-4 w-4" />
      {label}
    </button>
  );
}
