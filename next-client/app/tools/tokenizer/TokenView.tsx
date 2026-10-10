"use client";

import type { TokenSegment } from "./segment-tokens";

// Five tints, cycled, so neighbouring tokens always differ.
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
}

// The tokenized text: each token on its own tint, or its ids. Line breaks
// stay visible as ↵ so a token holding only "\n\n" can be seen.
export default function TokenView({ segments, showIds }: Props) {
  if (showIds) {
    return (
      <p className="font-mono text-ui-subhead text-fg break-words">
        {segments.map((segment) => segment.ids.join(", ")).join(", ")}
      </p>
    );
  }
  return (
    <p className="font-mono text-ui-subhead text-fg whitespace-pre-wrap break-words leading-7">
      {segments.map((segment, index) => (
        <span
          key={index}
          title={`Token ${segment.ids.join(", ")}`}
          className={`rounded-[3px] ${TINTS[index % TINTS.length]}`}
        >
          {segment.text.replace(/\n/g, "↵\n")}
        </span>
      ))}
    </p>
  );
}
