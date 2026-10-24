"use client";

import React from "react";
import Button from "@/app/components/Button";
import { version } from "../../../package.json";
import { type Scope, SCOPES } from "./palette-model";

interface PaletteFooterProps {
  /** The mode in use, lit; null for notes (no prefix). */
  scope: Scope | null;
  /** A chip: that mode, or back to notes when it's the one in use. */
  onScope: (scope: Scope) => void;
  /** The `/` scope's Regex toggle (Alt+R); left out elsewhere. */
  regex?: { on: boolean; onToggle: () => void };
}

// The palette's foot is its legend: one chip per search mode, its prefix
// in a key cap. Clicking a chip is the same as typing its prefix; the one
// in use is lit, and clicking it again goes back to notes. Settings and the
// theme are commands in the list, not buttons here. In the `/` scope a
// Regex chip, lit while on, reads the query as a regular expression.
export default function PaletteFooter({ scope, onScope, regex }: PaletteFooterProps) {
  return (
    <footer className="flex shrink-0 items-center gap-2 border-t border-edge-subtle py-1.5 pl-2 pr-3 font-sans text-ui-caption text-fg-muted">
      <div
        role="group"
        aria-label="Search modes"
        className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5"
      >
        {SCOPES.map(({ id, prefix, label }) => {
          const active = scope === id;
          return (
            <Button
              key={id}
              variant="unstyled"
              aria-label={label}
              aria-pressed={active}
              title={`${label} (type ${prefix})`}
              onClick={() => onScope(id)}
              className={`flex h-7 items-center gap-1.5 rounded-lg px-1.5 transition-colors ${active ? "bg-accent/15 text-fg" : "hover:bg-fill hover:text-fg"}`}
            >
              <kbd
                className={`flex h-[18px] min-w-[18px] items-center justify-center rounded border font-mono text-[11px] ${active ? "border-transparent bg-accent text-white dark:text-surface" : "border-edge-subtle"}`}
              >
                {prefix}
              </kbd>
              {label}
            </Button>
          );
        })}
      </div>
      {regex && (
        <Button
          variant="unstyled"
          aria-label="Regex"
          aria-pressed={regex.on}
          title="Search with a regular expression (Alt+R)"
          onClick={regex.onToggle}
          className={`flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-1.5 transition-colors ${regex.on ? "bg-accent/15 text-fg" : "hover:bg-fill hover:text-fg"}`}
        >
          <kbd
            className={`flex h-[18px] min-w-[18px] items-center justify-center rounded border px-0.5 font-mono text-[11px] ${regex.on ? "border-transparent bg-accent text-white dark:text-surface" : "border-edge-subtle"}`}
          >
            .*
          </kbd>
          Regex
        </Button>
      )}
      <span className="shrink-0 text-fg-faint">v{version}</span>
    </footer>
  );
}
