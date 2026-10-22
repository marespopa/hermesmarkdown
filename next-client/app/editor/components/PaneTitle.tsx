"use client";

import React from "react";
import { HiOutlineRefresh, HiOutlineSave } from "react-icons/hi";
import Button from "@/app/components/Button";
import BareInput from "@/app/components/Input/BareInput";
import { formatShortcut } from "@/app/utils/platform";
import type { SaveState } from "./save-state";

interface PaneTitleProps {
  /** The note's name as shown, without `.md`; null when nothing is open. */
  title: string | null;
  /** The note's folder in the vault (`Work/Projects`); empty at the root. */
  folder?: string;
  /** Opens a breadcrumb's folder (FolderPopover) below `anchor`, or closes
   *  it when it is `openFolder`; absent leaves the breadcrumb plain text. */
  onOpenFolder?: (folder: string, anchor: DOMRect) => void;
  /** The folder whose popover is open: its crumb keeps the pressed look. */
  openFolder?: string | null;
  saveState: SaveState;
  saveErrorMessage?: string;
  /** Renames the note in place; absent when it can't be (the draft, no vault). */
  onRename?: (name: string) => void;
  /** Bumped to start renaming in place (the menu's Rename). */
  renameRequest?: number;
  /** Saves the note; absent makes the save state plain text. */
  onSave?: () => void;
  /** The note's menu (Copy Markdown, Pin, Close). */
  onContextMenu: (event: React.MouseEvent) => void;
  /** Opens (or closes) the same menu from a click on the name, below
   *  `anchor`; absent leaves the name plain text (no note open). */
  onMenu?: (anchor: DOMRect) => void;
  /** The menu is open from the name: keeps its pressed look. */
  menuOpen?: boolean;
  /** The name's button, so the menu can treat presses on it as a toggle. */
  menuButtonRef?: React.Ref<HTMLButtonElement>;
}

const TITLE_CLASS = "h-8 rounded-lg px-2 text-ui-footnote";
// The name and every folder crumb share one box, hover and pressed look, so
// a click on either reads the same. (Written out whole: Tailwind only sees
// literal class names.)
const PRESSABLE_CLASS = `${TITLE_CLASS} flex items-center truncate transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--fg)_6%,var(--surface))] hover:text-fg focus-visible:text-fg`;
const PRESSED_CLASS = "bg-[color-mix(in_srgb,var(--fg)_6%,var(--surface))] text-fg";

// A deep path keeps its first and last folders and folds the middle into
// "…": `Work / … / Clients`. The full path is the breadcrumb's tooltip.
export function collapseCrumbs(crumbs: string[]): string[] {
  return crumbs.length > 2 ? [crumbs[0], "…", crumbs[crumbs.length - 1]] : crumbs;
}

// The folder each shown crumb opens: its own path; the folded "…" opens the
// last folder it hides, and the popover's ← steps up through the rest.
export function crumbTargets(crumbs: string[]): { label: string; path: string; title?: string }[] {
  const pathAt = (i: number) => crumbs.slice(0, i + 1).join("/");
  if (crumbs.length <= 2) return crumbs.map((label, i) => ({ label, path: pathAt(i) }));
  const last = crumbs.length - 1;
  return [
    { label: crumbs[0], path: pathAt(0) },
    { label: "…", path: pathAt(last - 1), title: crumbs.slice(1, last).join(" / ") },
    { label: crumbs[last], path: pathAt(last) },
  ];
}

const CRUMB_CLASS = `${PRESSABLE_CLASS} shrink-0 max-w-[10rem]`;
// Between crumbs and before the name alike.
const SEPARATOR_CLASS = "shrink-0 px-0.5 opacity-60";

// The pane's header, at its top left: the note's folder as a faint
// breadcrumb (the middle of a deep one folded; with `onOpenFolder` each
// folder is a button that opens its contents), then its name, then a dot
// while the note is unsaved, saving or failed to save (SaveDot: hover shows
// the save glyph, a click saves; PaneLeaf keeps it quiet through autosave's
// wait). The name is the file name; a click on it (or a right-click on the
// header) opens the note's menu below it, a second click closes it. The
// menu's Rename (`renameRequest`) turns the name into a field in place:
// Enter or clicking away renames the file, Escape backs out (no prompt, no
// palette). The palette's SearchPill sits in the window's top-right corner
// (EditorShell). Quiet, and always shown: it stays while you type.
export default function PaneTitle({ title, folder = "", onOpenFolder, openFolder = null, saveState, saveErrorMessage, onRename, renameRequest = 0, onSave, onContextMenu, onMenu, menuOpen = false, menuButtonRef }: PaneTitleProps) {
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

  // The menu's Rename starts one.
  React.useEffect(() => {
    if (renameRequest && onRename) setEditing(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renameRequest]);

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
      className="flex min-w-0 items-center gap-0.5 text-ui-footnote text-fg-faint"
    >
      {crumbs.length > 0 && (
        // Shrinks before the name does; the slash before the name never goes.
        <span className="hidden min-w-0 shrink-[2] items-center sm:flex" title={onOpenFolder ? undefined : crumbs.join(" / ")}>
          {onOpenFolder ? (
            <nav aria-label="Folder" className="flex min-w-0 items-center overflow-hidden">
              {crumbTargets(crumbs).map((crumb, i) => (
                <React.Fragment key={crumb.path}>
                  {i > 0 && <span aria-hidden="true" className={SEPARATOR_CLASS}>/</span>}
                  <Button
                    variant="unstyled"
                    // As the name's menu: a second click closes the popover, so
                    // the press mustn't reach its click-outside handler first.
                    onMouseDown={(e) => { if (openFolder === crumb.path) e.stopPropagation(); }}
                    onClick={(e) => { e.stopPropagation(); onOpenFolder(crumb.path, e.currentTarget.getBoundingClientRect()); }}
                    title={crumb.title ?? crumb.path.split("/").join(" / ")}
                    aria-label={crumb.title ? `Folders ${crumb.title}` : `Folder ${crumb.label}`}
                    aria-haspopup="dialog"
                    aria-expanded={openFolder === crumb.path}
                    className={`${CRUMB_CLASS} ${openFolder === crumb.path ? PRESSED_CLASS : ""}`}
                  >
                    {crumb.label}
                  </Button>
                </React.Fragment>
              ))}
            </nav>
          ) : (
            <span className={`${TITLE_CLASS} flex items-center truncate`}>{shownCrumbs.join(" / ")}</span>
          )}
          <span aria-hidden="true" className={SEPARATOR_CLASS}>/</span>
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
      ) : onMenu ? (
        <Button
          ref={menuButtonRef}
          variant="unstyled"
          onClick={(e) => { e.stopPropagation(); onMenu(e.currentTarget.getBoundingClientRect()); }}
          title="Note actions"
          aria-label={`${label}. Note actions`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className={`${PRESSABLE_CLASS} min-w-0 text-fg-muted ${menuOpen ? PRESSED_CLASS : ""}`}
        >
          <span className="truncate">{label}</span>
        </Button>
      ) : (
        <span className={`${TITLE_CLASS} flex min-w-0 items-center truncate text-fg-muted`}>
          <span className="truncate">{label}</span>
        </span>
      )}
      {showDot && !editing && <SaveDot state={saveState} errorMessage={saveErrorMessage} onSave={onSave} />}
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
