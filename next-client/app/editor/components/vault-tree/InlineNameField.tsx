"use client";

import { useEffect, useRef } from "react";
import BareInput from "@/app/components/Input/BareInput";

interface InlineNameFieldProps {
  initialValue: string;
  label: string;
  // Called once: Enter or clicking away commits, Escape cancels.
  onCommit: (value: string) => void;
  onCancel: () => void;
}

// The in-place name field of a row being renamed or created, as in Finder:
// the name starts selected; Enter or clicking away keeps it, Escape backs out.
export function InlineNameField({ initialValue, label, onCommit, onCancel }: InlineNameFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const finished = useRef(false);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, []);

  const finish = (commit: boolean) => {
    if (finished.current) return;
    finished.current = true;
    if (commit) onCommit(inputRef.current?.value ?? "");
    else onCancel();
  };

  return (
    <BareInput
      ref={inputRef}
      aria-label={label}
      defaultValue={initialValue}
      spellCheck={false}
      onKeyDown={(e) => {
        // The tree's own keys (arrows, Delete, ⌘A…) mustn't act while typing.
        e.stopPropagation();
        if (e.key === "Enter") {
          e.preventDefault();
          finish(true);
        } else if (e.key === "Escape") {
          e.preventDefault();
          finish(false);
        }
      }}
      onBlur={() => finish(true)}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
      className="min-w-0 flex-1 h-[calc(var(--list-row,28px)-6px)] -ml-1 rounded-[5px] border border-accent/60 bg-surface px-1 text-ui-subhead text-fg outline-none ring-2 ring-accent/25"
    />
  );
}
