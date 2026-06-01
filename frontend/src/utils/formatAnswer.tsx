import type { ReactNode } from "react";

type Block =
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] };

function parseInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<strong key={key++}>{match[1]}</strong>);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length ? parts : [text];
}

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let currentList: { ordered: boolean; items: string[] } | null = null;

  const flushList = () => {
    if (currentList) {
      blocks.push({
        type: "list",
        ordered: currentList.ordered,
        items: currentList.items,
      });
      currentList = null;
    }
  };

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }

    const bulletMatch = trimmed.match(/^[•\-*]\s+(.+)$/);
    const numberedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);

    if (bulletMatch) {
      if (!currentList || currentList.ordered) {
        flushList();
        currentList = { ordered: false, items: [] };
      }
      currentList.items.push(bulletMatch[1]);
    } else if (numberedMatch) {
      if (!currentList || !currentList.ordered) {
        flushList();
        currentList = { ordered: true, items: [] };
      }
      currentList.items.push(numberedMatch[1]);
    } else {
      flushList();
      blocks.push({ type: "paragraph", text: trimmed });
    }
  }

  flushList();
  return blocks.length ? blocks : [{ type: "paragraph", text }];
}

export function FormattedAnswer({ text }: { text: string }) {
  const blocks = parseBlocks(text);

  return (
    <div className="formatted-answer">
      {blocks.map((block, i) => {
        if (block.type === "paragraph") {
          return <p key={i}>{parseInline(block.text)}</p>;
        }
        const ListTag = block.ordered ? "ol" : "ul";
        return (
          <ListTag key={i}>
            {block.items.map((item, j) => (
              <li key={j}>{parseInline(item)}</li>
            ))}
          </ListTag>
        );
      })}
    </div>
  );
}
