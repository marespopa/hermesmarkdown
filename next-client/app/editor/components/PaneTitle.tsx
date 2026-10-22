"use client";

import React from "react";
import { TbGripVertical, TbLock } from "react-icons/tb";
import { HiOutlineDotsHorizontal, HiOutlineRefresh, HiOutlineSave } from "react-icons/hi";
import Button from "@/app/components/Button";
import BareInput from "@/app/components/Input/BareInput";
import { formatShortcut } from "@/app/utils/platform";
import type { SaveState } from "./save-state";

interface PaneTitleProps {
  /** The note's name as shown, without `.md`; null when nothing is open. */
  title: string | null;
  /** The note's folder in the vault (`Work/Projects`); empty at the root. */
  folder?: string;
  saveState: SaveState;
  saveErrorMessage?: string;
  /** Renames the note in place; absent when it can't be (the draft, no vault). */
  onRename?: (name: string) => void;
  /** Saves the note; absent makes the save state plain text. */
  onSave?: () => void;
  /** The note's menu (Copy Markdown, Open in pane, Pin, Close). */
  onContextMenu: (event: React.MouseEvent) => void;
  /** Opens (or closes) the same menu from the ⋯ button after the name, below
   *  `anchor`; absent hides the button (no note open). */
  onMenu?: (anchor: DOMRect) => void;
  /** The menu is open from the ⋯ button: keeps it shown. */
  menuOpen?: boolean;
  /** The ⋯ button, so the menu can treat presses on it as a toggle. */
  menuButtonRef?: React.Ref<HTMLButtonElement>;
  /** A faint label after the name (a preview pane's "Preview"). */
  badge?: string;
  /** Scroll is locked with the other pane: shows the lock button. */
  scrollLocked?: boolean;
  onToggleScrollLock?: () => void;
  /** Starts dragging the whole pane; present only while several panes exist. */
  onGripDragStart?: (event: React.DragEvent) => void;
}

const TITLE_CLASS = "h-8 rounded-lg px-2 text-ui-footnote";

// A deep path keeps its first and last folders and folds the middle into
// "…": `Work / … / Clients`. The full path is the breadcrumb's tooltip.
export function collapseCrumbs(crumbs: string[]): string[] {
  return crumbs.length > 2 ? [crumbs[0], "…", crumbs[crumbs.length - 1]] : crumbs;
}

// The pane's header, at its top left: the note's folder as a faint
// breadcrumb (the middle of a deep one folded), then its name, then a dot
// while the note is unsaved, saving or failed to save (SaveDot: hover shows
// the save glyph, a click saves; PaneLeaf keeps it quiet through autosave's
// wait). The name is the file name: a click turns it into a field in place;
// Enter or clicking away renames the file, Escape backs out (no prompt, no
// palette).
// A right-click opens the note's menu, as does the ⋯ button at the end
// (faint, shown on hover or focus; always on touch screens). The palette's SearchPill sits in the
// window's top-right corner (EditorShell). Quiet, and always shown: it
// stays while you type.
export default function PaneTitle({ title, folder = "", saveState, saveErrorMessage, onRename, onSave, onContextMenu, onMenu, menuOpen = false, menuButtonRef, badge, scrollLocked = false, onToggleScrollLock, onGripDragStart }: PaneTitleProps) {
  const [editing, setEditing] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const finished = React.useRef(false);
  const showDot = title !== null && (saveState === "dirty" || saveState === "saving" || saveState === "error");
  const label = title ?? "No note open";
  const crumbs = folder.split("/").filter(Boolean);
  const shownCrumbs = collapseCrumbs(crumbs);

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
      className="group/title flex min-w-0 items-center gap-0.5 text-ui-footnote text-fg-faint"
    >
      {onGripDragStart && !editing && (
        <Button
          variant="unstyled"
          draggable
          onDragStart={onGripDragStart}
          aria-label="Drag to move pane"
          title="Drag to move pane"
          className="flex h-7 w-5 shrink-0 cursor-grab items-center justify-center rounded-lg opacity-0 transition-opacity duration-150 hover:text-fg group-hover/title:opacity-100 focus-visible:opacity-100"
        >
          <TbGripVertical size={14} aria-hidden="true" />
        </Button>
      )}
      {crumbs.length > 0 && (
        // Shrinks before the name does; the slash before the name never goes.
        <span className="hidden min-w-0 shrink-[2] items-center pl-2 sm:flex" title={crumbs.join(" / ")}>
          <span className="truncate">{shownCrumbs.join(" / ")}</span>
          <span aria-hidden="true" className="shrink-0 px-1.5 opacity-60">/</span>
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
          aria-label={`${label}. Rename`}
          className={`${TITLE_CLASS} flex min-w-0 items-center truncate text-fg-muted transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--fg)_6%,var(--surface))] hover:text-fg focus-visible:text-fg`}
        >
          <span className="truncate">{label}</span>
        </Button>
      ) : (
        <span className={`${TITLE_CLASS} flex min-w-0 items-center truncate text-fg-muted`}>
          <span className="truncate">{label}</span>
        </span>
      )}
      {badge && !editing && <span className="shrink-0 pl-1 text-ui-caption text-fg-faint">{badge}</span>}
      {showDot && !editing && <SaveDot state={saveState} errorMessage={saveErrorMessage} onSave={onSave} />}
      {onMenu && !editing && (
        <Button
          ref={menuButtonRef}
          variant="unstyled"
          onClick={(e) => { e.stopPropagation(); onMenu(e.currentTarget.getBoundingClientRect()); }}
          title="Note actions"
          aria-label="Note actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-[color,background-color,opacity] duration-150 hover:bg-[color-mix(in_srgb,var(--fg)_6%,var(--surface))] hover:text-fg focus-visible:text-fg focus-visible:opacity-100 ${
            menuOpen ? "text-fg opacity-100" : "opacity-0 group-hover/title:opacity-100 [@media(hover:none)]:opacity-100"
          }`}
        >
          <HiOutlineDotsHorizontal size={15} aria-hidden="true" />
        </Button>
      )}
      {scrollLocked && !editing && (
        <Button
          variant="unstyled"
          onClick={(e) => { e.stopPropagation(); onToggleScrollLock?.(); }}
          aria-label="Unlock scroll"
          aria-pressed={true}
          title="Scroll locked with the other pane — click to unlock"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--fg)_6%,var(--surface))] hover:text-fg focus-visible:text-fg"
        >
          <TbLock size={14} aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}

// The dot after the name, as a document window's close button shows unsaved
// changes: grey while edited, pulsing while saving, warm red when the save
// failed. Hover or focus turns it into the save glyph (retry after a
// failure), and a click saves, as Ctrl/Cmd+S does. Not a button while saving.
function SaveDot({ state, errorMessage, onSave }: { state: SaveState; errorMessage?: string; onSave?: () => void }) {
  const error = state === "error";
  const label = error ? errorMessage || "Couldn't save" : state === "saving" ? "Saving…" : "Unsaved changes";
  const dot = (
    <span
      className={`h-1.5 w-1.5 rounded-full ${error ? "bg-danger" : state === "saving" ? "bg-fg-faint motion-safe:animate-pulse" : "bg-fg-muted"} ${onSave ? "group-hover:hidden group-focus-visible:hidden" : ""}`}
    />
  );
  if (state === "saving" || !onSave) {
    return <span role="status" aria-label={label} title={label} className="flex h-7 w-7 shrink-0 items-center justify-center">{dot}</span>;
  }
  const Glyph = error ? HiOutlineRefresh : HiOutlineSave;
  return (
    <Button
      variant="unstyled"
      onClick={(e) => { e.stopPropagation(); onSave(); }}
      title={`${error ? `${label} — click to try again` : "Save"} (${formatShortcut("S")})`}
      aria-label={`${label}. ${error ? "Try saving again" : "Save"}`}
      className={`group flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--fg)_6%,var(--surface))] ${error ? "text-danger" : "text-fg-muted hover:text-fg focus-visible:text-fg"}`}
    >
      {dot}
      <Glyph size={14} aria-hidden="true" className="hidden group-hover:block group-focus-visible:block" />
    </Button>
  );
}
