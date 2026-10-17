"use client";

import React from "react";
import { HiOutlineCheckCircle, HiOutlineExclamationCircle, HiOutlineSave } from "react-icons/hi";

// A note's save state, as the pane title, the mobile file bar and the Save
// command show it.
export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

// The small dot beside a title: shown only for the states that need a
// glance (unsaved, saving, error). Theme colours throughout (the palette's
// ochre, green and warm red), so the dots follow every theme.
export const statusDot: Record<SaveState, { className: string; title: string }> = {
  idle: { className: "bg-fg-faint/40", title: "Saved" },
  dirty: { className: "bg-task-hold", title: "Unsaved changes" },
  saving: { className: "bg-fg-faint animate-pulse", title: "Saving…" },
  saved: { className: "bg-task-done", title: "Saved" },
  error: { className: "bg-danger", title: "Save error" },
};

// Icon + label version — used where there's room to spell out the state
// explicitly (mobile header, pane Save button) rather than relying on a
// color-coded dot, which tested as unclear on its own. Each state differs in
// shape, not only color: unsaved adds a badge to the save glyph, saved is a
// check, error an exclamation mark.
export const statusMeta: Record<
  SaveState,
  {
    Icon: React.ComponentType<{ size?: number; className?: string }> | null;
    badge?: boolean;
    className: string;
    title: string;
    label: string;
  }
> = {
  idle: { Icon: HiOutlineSave, className: "text-fg-faint", title: "Saved", label: "Saved" },
  dirty: { Icon: HiOutlineSave, badge: true, className: "text-task-hold", title: "Unsaved changes", label: "Unsaved" },
  saving: { Icon: null, className: "text-fg-muted", title: "Saving…", label: "Saving…" },
  saved: { Icon: HiOutlineCheckCircle, className: "text-task-done", title: "Saved", label: "Saved" },
  error: { Icon: HiOutlineExclamationCircle, className: "text-danger", title: "Save error", label: "Error" },
};

// The glyph for a save state: a spinner while saving, otherwise the state's
// icon, with a dot badge while there are unsaved changes.
export function SaveStateIcon({ state, size, className }: { state: SaveState; size: number; className?: string }) {
  const meta = statusMeta[state];
  if (!meta.Icon) {
    return <span className="block w-3.5 h-3.5 rounded-full border-2 border-edge border-t-fg-muted animate-spin" />;
  }
  return (
    <span className={`relative inline-flex ${className ?? ""}`}>
      <meta.Icon size={size} />
      {meta.badge && (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-task-hold ring-2 ring-chrome"
        />
      )}
    </span>
  );
}
