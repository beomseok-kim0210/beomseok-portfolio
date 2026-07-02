import type { ReactNode } from "react";

type MarkdownNoteProps = {
  body: string;
};

function parseInline(text: string): ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;

  return text.split(pattern).map((part, index) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return part;
  });
}

export function MarkdownNote({ body }: MarkdownNoteProps) {
  const blocks = body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className="markdown-note">
      {blocks.map((block) => {
        if (block === "---") {
          return <hr key={block} className="my-6 border-slate-200" />;
        }

        if (block.startsWith("> ")) {
          const lines = block
            .split("\n")
            .map((line) => line.replace(/^>\s?/, "").trim())
            .filter(Boolean);

          return (
            <blockquote key={block}>
              {lines.map((line) => (
                <p key={line}>{parseInline(line)}</p>
              ))}
            </blockquote>
          );
        }

        if (block.startsWith("### ")) {
          return <h3 key={block}>{parseInline(block.replace(/^### /, ""))}</h3>;
        }

        if (block.startsWith("## ")) {
          return <h2 key={block}>{parseInline(block.replace(/^## /, ""))}</h2>;
        }

        if (block.startsWith("- ")) {
          const items = block
            .split("\n")
            .map((item) => item.replace(/^- /, "").trim());

          return (
            <ul key={block}>
              {items.map((item) => (
                <li key={item}>{parseInline(item)}</li>
              ))}
            </ul>
          );
        }

        return <p key={block}>{parseInline(block)}</p>;
      })}
    </div>
  );
}
