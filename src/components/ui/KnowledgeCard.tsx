import { NotebookTabs } from "lucide-react";
import type { KnowledgeNote } from "@/types/portfolio";

type KnowledgeCardProps = {
  note: KnowledgeNote;
  isActive: boolean;
  onSelect: () => void;
};

export function KnowledgeCard({ note, isActive, onSelect }: KnowledgeCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`mb-2 flex w-full items-center gap-3 rounded-[20px] px-4 py-4 text-left transition-colors ${
        isActive ? "bg-[#111827] text-white" : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      <NotebookTabs className="h-5 w-5 flex-none" aria-hidden="true" />
      <span className="small-label">{note.category}</span>
    </button>
  );
}
