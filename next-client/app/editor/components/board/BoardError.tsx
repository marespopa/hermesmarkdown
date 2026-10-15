"use client";

import Button from "@/app/components/Button";

interface BoardErrorProps {
  kind: "conflict" | "invalid";
  onEditAsMarkdown: () => void;
}

const COPY = {
  conflict: {
    title: "This board has unresolved merge conflicts",
    body: "Open it as Markdown, keep one side of each conflict, then switch back to the board.",
  },
  invalid: {
    title: "This board couldn't be read",
    body: "Its drawing data isn't valid. Open it as Markdown to repair it.",
  },
} as const;

export default function BoardError({ kind, onEditAsMarkdown }: BoardErrorProps) {
  const { title, body } = COPY[kind];
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 pt-[var(--pane-header-inset,0px)] text-center">
      <h2 className="text-ui-title-3 text-fg">{title}</h2>
      <p className="max-w-sm text-ui-footnote text-fg-muted">{body}</p>
      <Button variant="secondary" onClick={onEditAsMarkdown}>
        Edit as Markdown
      </Button>
    </div>
  );
}
