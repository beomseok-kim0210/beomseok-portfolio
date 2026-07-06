import fs from "node:fs";
import path from "node:path";
import type { KnowledgeNote } from "@/types/portfolio";

const knowledgeDirectory = path.join(process.cwd(), "knowledge");

function parseFrontmatter(source: string) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    return {
      meta: {},
      body: source.trim(),
    };
  }

  const meta = match[1].split("\n").reduce<Record<string, string>>((acc, line) => {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) return acc;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    acc[key] = value;
    return acc;
  }, {});

  return {
    meta,
    body: match[2].trim(),
  };
}

// 슬러그의 YYYY-MM-DD(예: ai-news-2026-07-06)를 우선하고, 없으면
// lastUpdated의 YYYY.MM을 월 초 날짜로 취급해 정렬 키를 만든다.
function toSortableDate(slug: string, lastUpdated: string): string {
  const slugDate = slug.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (slugDate) return `${slugDate[1]}-${slugDate[2]}-${slugDate[3]}`;

  const monthDate = lastUpdated.match(/(\d{4})\.(\d{2})/);
  if (monthDate) return `${monthDate[1]}-${monthDate[2]}-01`;

  return "0000-00-00";
}

export function getKnowledgeNotes(): KnowledgeNote[] {
  if (!fs.existsSync(knowledgeDirectory)) return [];

  return fs
    .readdirSync(knowledgeDirectory)
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, "");
      const source = fs.readFileSync(
        path.join(knowledgeDirectory, fileName),
        "utf8",
      );
      const { meta, body } = parseFrontmatter(source);

      return {
        slug,
        title: meta.title ?? slug,
        category: meta.category ?? meta.title ?? slug,
        difficulty: meta.difficulty ?? "Intermediate",
        lastUpdated: meta.lastUpdated ?? "2026.05",
        readingTime: meta.readingTime ?? "4 min",
        summary: meta.summary ?? "",
        keywords: (meta.keywords ?? "")
          .split(",")
          .map((keyword) => keyword.trim())
          .filter(Boolean),
        body,
      };
    })
    .sort((a, b) =>
      toSortableDate(b.slug, b.lastUpdated).localeCompare(
        toSortableDate(a.slug, a.lastUpdated),
      ),
    );
}
