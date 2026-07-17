import { getKnowledgeNotes } from "@/lib/knowledge";
import type { KnowledgeNote } from "@/types/portfolio";

const MAX_NOTES = 3;
const BODY_TRUNCATE = 1200;

// 웜 인보케이션 간 재사용 (fs 읽기는 1회).
let cachedNotes: KnowledgeNote[] | null = null;

function notes(): KnowledgeNote[] {
  if (!cachedNotes) cachedNotes = getKnowledgeNotes();
  return cachedNotes;
}

function tokenize(question: string): string[] {
  return question
    .toLowerCase()
    .split(/[\s.,!?()[\]{}"'`:;~/\\]+/)
    .filter((t) => t.length >= 2);
}

function scoreNote(tokens: string[], note: KnowledgeNote): number {
  const title = note.title.toLowerCase();
  const summary = note.summary.toLowerCase();
  const keywords = note.keywords.map((k) => k.toLowerCase());

  let score = 0;
  for (const token of tokens) {
    if (keywords.some((k) => k.includes(token))) score += 3;
    if (title.includes(token)) score += 2;
    if (summary.includes(token)) score += 1;
  }
  return score;
}

/** 질문과 관련 있는 knowledge 노트 top-K를 시스템 프롬프트용 텍스트로 반환. */
export function retrieveNotesContext(question: string): string {
  const tokens = tokenize(question);
  if (tokens.length === 0) return "";

  const ranked = notes()
    .map((note) => ({ note, score: scoreNote(tokens, note) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_NOTES);

  if (ranked.length === 0) return "";

  const sections = ranked.map(({ note }) => {
    const body =
      note.body.length > BODY_TRUNCATE
        ? `${note.body.slice(0, BODY_TRUNCATE)}…`
        : note.body;
    return `### ${note.title}\n요약: ${note.summary}\n${body}`;
  });

  return `\n\n## 참고 가능한 지식 노트 (사이트의 Knowledge 섹션에서 발췌)\n${sections.join("\n\n")}`;
}
