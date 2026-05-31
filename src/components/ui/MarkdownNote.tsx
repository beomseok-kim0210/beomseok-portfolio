type MarkdownNoteProps = {
  body: string;
};

export function MarkdownNote({ body }: MarkdownNoteProps) {
  const blocks = body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className="markdown-note">
      {blocks.map((block) => {
        if (block.startsWith("## ")) {
          return <h2 key={block}>{block.replace(/^## /, "")}</h2>;
        }

        if (block.startsWith("- ")) {
          const items = block
            .split("\n")
            .map((item) => item.replace(/^- /, "").trim());

          return (
            <ul key={block}>
              {items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        }

        return <p key={block}>{block}</p>;
      })}
    </div>
  );
}
