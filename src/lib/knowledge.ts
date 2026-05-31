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
    .sort((a, b) => a.title.localeCompare(b.title));
}
