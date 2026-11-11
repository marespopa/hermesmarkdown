"use client";

import { useState, type KeyboardEvent, type MouseEvent } from "react";
import type { TokenSegment } from "./segment-tokens";

// Five tints, cycled, so neighbouring tokens always differ. Colour is not the
// only cue: every second token is also underlined.
const TINTS = [
  "bg-sky-200/70 dark:bg-sky-400/25",
  "bg-amber-200/70 dark:bg-amber-400/25",
  "bg-emerald-200/70 dark:bg-emerald-400/25",
  "bg-rose-200/70 dark:bg-rose-400/25",
  "bg-violet-200/70 dark:bg-violet-400/25",
];

interface Props {
  segments: TokenSegment[];
  showIds: boolean;
  // Draws spaces as · and tabs as →, so a token holding only whitespace shows.
  showWhitespace?: boolean;
}

// Line breaks always stay visible as ↵ (a token can hold only "\n\n").
function visible(text: string, showWhitespace: boolean) {
  const marked = text.replace(/\n/g, "↵\n");
  return showWhitespace ? marked.replace(/ /g, "·").replace(/\t/g, "→") : marked;
}

// The tokenized text: each token on its own tint, or its ids. Click or tap a
// token, or move through them with the arrow keys, to read its id and text
// below (a `title` alone is out of reach on touch screens and keyboards).
export default function TokenView({ segments, showIds, showWhitespace = false }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const current = selected !== null ? segments[selected] : undefined;

  if (showIds) {
    return (
      <p className="font-mono text-ui-subhead text-fg break-words">
        {segments.map((segment) => segment.ids.join(", ")).join(", ")}
      </p>
    );
  }

  const select = (index: number) => setSelected(Math.min(segments.length - 1, Math.max(0, index)));

  const onClick = (event: MouseEvent<HTMLParagraphElement>) => {
    const index = (event.target as HTMLElement).dataset.token;
    if (index !== undefined) setSelected(Number(index));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLParagraphElement>) => {
    const from = selected ?? -1;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") select(from + 1);
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") select(from < 0 ? 0 : from - 1);
    else if (event.key === "Home") select(0);
    else if (event.key === "End") select(segments.length - 1);
    else if (event.key === "Escape") setSelected(null);
    else return;
    event.preventDefault();
  };

  return (
    <div className="space-y-3">
      {/* A group with arrow-key movement; the spans are the targets of its click handler. */}
      <p
        role="group"
        tabIndex={0}
        aria-label="Tokens. Use the arrow keys to move between them."
        onClick={onClick}
        onKeyDown={onKeyDown}
        className="font-mono text-ui-subhead text-fg whitespace-pre-wrap break-words leading-7 rounded-[3px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {segments.map((segment, index) => (
          <span
            key={index}
            data-token={index}
            title={`Token ${segment.ids.join(", ")}`}
            className={`cursor-pointer rounded-[3px] ${TINTS[index % TINTS.length]} ${
              index % 2 ? "underline decoration-fg-muted underline-offset-4" : ""
            } ${index === selected ? "outline outline-2 outline-fg" : ""}`}
          >
            {visible(segment.text, showWhitespace)}
          </span>
        ))}
      </p>
      <p className="text-ui-footnote text-fg-muted min-h-5" aria-live="polite">
        {current
          ? `Token ${selected! + 1} of ${segments.length} · ${current.ids.length > 1 ? "IDs" : "ID"} ${current.ids.join(", ")} · ${JSON.stringify(current.text)}`
          : "Select a token to see its ID."}
      </p>
    </div>
  );
}
