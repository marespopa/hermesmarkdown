"use client";

import React from "react";
import Button from "@/app/components/Button";
import BareInput from "@/app/components/Input/BareInput";
import { useFadeWhileTyping } from "../hooks/use-fade-while-typing";
import { statusDot, type SaveState } from "./save-state";

interface PaneTitleProps {
  /** The note's name as shown, without `.md`; null when nothing is open. */
  title: string | null;
  /** The note's folder in the vault (`Work/Projects`); empty at the root. */
  folder?: string;
  saveState: SaveState;
  saveErrorMessage?: string;
  /** Renames the note in place; absent when it can't be (the draft, no vault). */
  onRename?: (name: string) => void;
  /** The note's menu (Copy Markdown, Open in pane, Pin, Close). */
  onContextMenu: (event: React.MouseEvent) => void;
}

const TITLE_CLASS = "h-8 rounded-lg px-2 text-ui-footnote";

// The pane's header, at its top left: the note's folder as a faint
// breadcrumb, then its name, and a small dot only when its save state needs
// a glance (unsaved, saving, error). The name is the file name: a click turns
// it into a field in place; Enter or clicking away renames the file, Escape
// backs out (no prompt, no palette). A right-click opens the note's menu. The
// palette has its own button in the window's top-right corner (EditorShell).
// Quiet at rest: faint text, a soft fill on hover; it fades out while you
// type and returns when the pointer moves.
export default function PaneTitle({ title, folder = "", saveState, saveErrorMessage, onRename, onContextMenu }: PaneTitleProps) {
  const [editing, setEditing] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const finished = React.useRef(false);
  const faded = useFadeWhileTyping();

  const dot = statusDot[saveState];
  const showDot = saveState === "dirty" || saveState === "saving" || saveState === "error";
  const dotTitle = saveState === "error" ? saveErrorMessage || dot.title : dot.title;
  const label = title ?? "No note open";
  const crumbs = folder.split("/").filter(Boolean);

  React.useEffect(() => {
    if (!editing) return;
    finished.current = false;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  // A rename elsewhere (or another note in front) ends the edit.
  React.useEffect(() => setEditing(false), [title]);

  const finish = (commit: boolean) => {
    if (finished.current) return;
    finished.current = true;
    setEditing(false);
    const typed = inputRef.current?.value.trim() ?? "";
    if (commit && typed && typed !== title) onRename?.(typed);
  };

  return (
    <div
      onContextMenu={onContextMenu}
      className={`flex min-w-0 items-center gap-0.5 text-ui-footnote text-fg-faint transition-opacity duration-300 focus-within:opacity-100 motion-reduce:transition-none ${
        faded && !editing ? "opacity-0" : "opacity-100"
      }`}
    >
      {crumbs.length > 0 && (
        <span className="hidden min-w-0 shrink truncate pl-2 sm:inline" title={crumbs.join(" / ")}>
          {crumbs.join(" / ")}
          <span aria-hidden="true" className="px-1.5 opacity-60">/</span>
        </span>
      )}
      {editing ? (
        <BareInput
          ref={inputRef}
          aria-label="Note name"
          defaultValue={label}
          spellCheck={false}
          onKeyDown={(e) => {
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
          style={{ width: `${Math.max(label.length + 2, 8)}ch` }}
          className={`${TITLE_CLASS} min-w-0 max-w-full bg-[color-mix(in_srgb,var(--fg)_6%,var(--surface))] text-fg outline-none ring-1 ring-accent/40`}
        />
      ) : onRename ? (
        <Button
          variant="unstyled"
          onClick={() => setEditing(true)}
          title="Rename"
          aria-label={showDot ? `${label} — ${dotTitle}. Rename` : `${label}. Rename`}
          className={`${TITLE_CLASS} flex min-w-0 items-center truncate text-fg-muted transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--fg)_6%,var(--surface))] hover:text-fg focus-visible:text-fg`}
        >
          <span className="truncate">{label}</span>
        </Button>
      ) : (
        <span className={`${TITLE_CLASS} flex min-w-0 items-center truncate text-fg-muted`}>
          <span className="truncate">{label}</span>
        </span>
      )}
      {showDot && (
        <span
          role="img"
          aria-label={dotTitle}
          title={dotTitle}
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot.className}`}
        />
      )}
    </div>
  );
}
