import { isMacPlatform } from "@/app/utils/platform";
import { parentFolderPath, type VisibleRow } from "./tree-model";
import type { useTreeSelection } from "./use-tree-selection";

export interface TreeKeyContext {
  rows: VisibleRow[];
  selection: ReturnType<typeof useTreeSelection>;
  isFolderCollapsed: (path: string) => boolean;
  toggleFolder: (path: string) => void;
  openRow: (row: VisibleRow) => void;
  startRename: (path: string) => void;
  trashSelection: () => void;
  undo?: () => void;
}

// Keyboard control of the focused file tree, as in Finder (and Explorer on
// Windows/Linux):
//   ↑/↓ move (⇧ extends the selection) · → opens a folder / steps in ·
//   ← closes it / steps out · Return renames (Mac; elsewhere F2, and Enter
//   opens) · ⌘O or ⌘↓ opens · ⌘⌫ (Delete elsewhere) moves to Trash ·
//   ⌘Z undoes · ⌘A selects all · Esc clears the selection.
// Returns the path to bring into view, null when the key was handled without
// moving, or undefined when the key isn't the tree's.
export function handleTreeKey(e: React.KeyboardEvent, ctx: TreeKeyContext): string | null | undefined {
  const { rows, selection } = ctx;
  const mac = isMacPlatform();
  const mod = mac ? e.metaKey : e.ctrlKey;
  const index = rows.findIndex((row) => row.path === selection.focusPath);
  const row = index === -1 ? undefined : rows[index];

  const moveTo = (target: VisibleRow | undefined) => {
    if (!target) return null;
    if (e.shiftKey) selection.selectRange(target.path);
    else selection.selectOnly(target.path);
    return target.path;
  };

  switch (e.key) {
    case "ArrowDown":
      if (mod && mac) {
        if (row) ctx.openRow(row);
        return null;
      }
      return moveTo(index === -1 ? rows[0] : rows[Math.min(index + 1, rows.length - 1)]);
    case "ArrowUp":
      return moveTo(index === -1 ? rows[rows.length - 1] : rows[Math.max(index - 1, 0)]);
    case "ArrowRight":
      if (!row || row.type !== "folder") return null;
      if (ctx.isFolderCollapsed(row.path)) {
        ctx.toggleFolder(row.path);
        return null;
      }
      return rows[index + 1]?.depth > row.depth ? moveTo(rows[index + 1]) : null;
    case "ArrowLeft": {
      if (!row) return null;
      if (row.type === "folder" && !ctx.isFolderCollapsed(row.path)) {
        ctx.toggleFolder(row.path);
        return null;
      }
      const parent = parentFolderPath(row.path);
      return parent ? moveTo(rows.find((r) => r.path === parent)) : null;
    }
    case "Enter":
      if (!row) return undefined;
      if (mac) ctx.startRename(row.path);
      else ctx.openRow(row);
      return null;
    case "F2":
      if (row) ctx.startRename(row.path);
      return row ? null : undefined;
    case "Backspace":
    case "Delete":
      if ((mac && !(e.metaKey && e.key === "Backspace")) || (!mac && e.key !== "Delete")) return undefined;
      if (selection.selected.size > 0) ctx.trashSelection();
      return null;
    case "Escape":
      if (selection.selected.size === 0) return undefined;
      selection.clear();
      return null;
  }

  if (!mod || e.altKey) return undefined;
  switch (e.key.toLowerCase()) {
    case "o":
      if (row) ctx.openRow(row);
      return null;
    case "a":
      selection.selectAll();
      return null;
    case "z":
      if (e.shiftKey || !ctx.undo) return undefined;
      ctx.undo();
      return null;
  }
  return undefined;
}
