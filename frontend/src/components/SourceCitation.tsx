import { useState } from "react";
import type { FaqSource } from "../types";

interface SourceCitationProps {
  sources: FaqSource[];
  category?: string | null;
}

export function SourceCitation({ sources, category }: SourceCitationProps) {
  const [expanded, setExpanded] = useState(false);
  const primary = sources[0];

  if (!primary && !category) return null;

  return (
    <div className="citation">
      {category && (
        <span className="citation__category">{category}</span>
      )}
      {primary && (
        <button
          type="button"
          className="citation__toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? "Hide reference" : "View FAQ reference"}
        </button>
      )}
      {expanded && primary && (
        <p className="citation__text">{primary.question}</p>
      )}
    </div>
  );
}
