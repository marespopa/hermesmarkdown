"use client";

import { useSetAtom, useStore } from "jotai";
import { useCallback } from "react";
import toast from "react-hot-toast";
import {
  atom_fileUndoStack,
  atom_remapVaultPaths,
  atom_vaultHandle,
  FILE_UNDO_LIMIT,
  type FileUndoGroup,
} from "@/app/atoms/vault-atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { useRewriteLinksAfterMove } from "./use-rewrite-links";
import { isTrashPath } from "@/app/services/vault-trash";
import { relocateEntry } from "./directory-ops";
import { removeEmptyTrashSlot } from "./trash-ops";

interface UseFileUndoProps {
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
  indexVaultTags: (passedHandle?: FileSystemDirectoryHandle) => Promise<void>;
}

// Records undoable file actions and takes the latest one back: every item
// moves from its `to` path back to `from` (out of the Trash, back to its old
// folder, or back to its old name), newest first.
export function useFileUndo({ scanVault, indexVaultTags }: UseFileUndoProps) {
  const store = useStore();
  const remapVaultPaths = useSetAtom(atom_remapVaultPaths);
  const rewriteLinks = useRewriteLinksAfterMove();

  const recordUndo = useCallback((label: string, moves: FileUndoGroup["moves"]): FileUndoGroup | null => {
    const vault = store.get(atom_vaultHandle);
    if (!vault || moves.length === 0) return null;
    const group = { vault, label, moves };
    store.set(atom_fileUndoStack, (prev) => [
      ...prev.filter((g) => g.vault === vault).slice(-(FILE_UNDO_LIMIT - 1)),
      group,
    ]);
    return group;
  }, [store]);

  // With `expected` (a toast's Undo), only that action is undone, and only
  // while it is still the latest one.
  const undoFileOperation = useCallback(async (expected?: FileUndoGroup): Promise<boolean> => {
    const vault = store.get(atom_vaultHandle);
    const stack = store.get(atom_fileUndoStack);
    const group = stack[stack.length - 1];
    if (!vault || !group || group.vault !== vault) {
      toast("Nothing to undo", { id: "file-undo" });
      return false;
    }
    if (expected && group !== expected) {
      toast(stack.includes(expected) ? "Undo the later changes first" : "That change can no longer be undone", { id: "file-undo" });
      return false;
    }
    store.set(atom_fileUndoStack, stack.slice(0, -1));

    let failed = 0;
    const before = store.get(atom_fileMetadata);
    const reverseMoves: { from: string; to: string }[] = [];
    for (const { from, to } of [...group.moves].reverse()) {
      try {
        await relocateEntry(vault, to, from);
        if (isTrashPath(to)) await removeEmptyTrashSlot(vault, to);
        else {
          await remapVaultPaths({ oldPath: to, newPath: from });
          reverseMoves.push({ from: to, to: from });
        }
      } catch (err) {
        console.error(`Failed to undo ${group.label} for ${from}:`, err);
        failed++;
      }
    }
    // Undoing a rename/move restores the link text with the reverse mapping
    // (never for Trash moves). Failures only toast; the undo stands.
    if (reverseMoves.length > 0) {
      try {
        const outcome = await rewriteLinks(before, reverseMoves);
        if (outcome.failed > 0) {
          toast.error(`Couldn't update links in ${outcome.failed} note${outcome.failed === 1 ? "" : "s"}`, { id: "file-undo-links" });
        }
      } catch (err) {
        console.error("Link update failed:", err);
        toast.error("Couldn't update links", { id: "file-undo-links" });
      }
    }
    await scanVault(vault);
    void indexVaultTags();
    if (failed === 0) {
      toast.success(`Undo ${group.label}`, { id: "file-undo" });
      return true;
    }
    toast.error(
      failed === group.moves.length
        ? `Couldn't undo ${group.label}`
        : `Undo ${group.label}: ${failed} of ${group.moves.length} items couldn't be restored`,
      { id: "file-undo" },
    );
    return false;
  }, [store, remapVaultPaths, rewriteLinks, scanVault, indexVaultTags]);

  return { recordUndo, undoFileOperation };
}
