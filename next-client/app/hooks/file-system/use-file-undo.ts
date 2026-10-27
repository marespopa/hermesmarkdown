"use client";

import { useSetAtom, useStore } from "jotai";
import { useCallback } from "react";
import toast from "react-hot-toast";
import {
  atom_fileUndoStack,
  atom_remapVaultPaths,
  atom_undoneFileGroups,
  atom_vaultHandle,
  FILE_UNDO_LIMIT,
  resolveFileHandleAtPath,
  type FileUndoGroup,
  type FileUndoOutcome,
  type FileUndoStep,
} from "@/app/atoms/vault-atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { useRewriteLinksAfterMove } from "./use-rewrite-links";
import { useNoteBuffer } from "./use-note-buffer";
import { isTrashPath } from "@/app/services/vault-trash";
import { textFingerprint } from "@/app/workers/replace-search";
import { directoryAtPath, relocateEntry } from "./directory-ops";
import { removeEmptyTrashSlot } from "./trash-ops";
import { withRetry } from "./shared";
import { withBusyPaths } from "./busy-paths";
import type { BusyPath } from "@/app/atoms/busy-path-atoms";

interface UseFileUndoProps {
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
  indexVaultTags: (passedHandle?: FileSystemDirectoryHandle) => Promise<void>;
}

// A group many changes share (an AI companion turn): its id and the label
// it's created with.
export interface FileUndoGroupRef {
  id: string;
  label: string;
}

const splitPath = (path: string) => {
  const at = path.lastIndexOf("/");
  return { folder: at < 0 ? "" : path.slice(0, at), name: path.slice(at + 1) };
};

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

// Records undoable file actions and takes the latest one back, newest step
// first: every moved item goes from its `to` path back to `from` (out of the
// Trash, back to its old folder, or back to its old name); in a group with
// steps (an AI companion turn), edited files get their text from before
// (through the note buffer, so an open tab shows it) and created files and
// folders are removed, each only while it still holds what the group left.
export function useFileUndo({ scanVault, indexVaultTags }: UseFileUndoProps) {
  const store = useStore();
  const remapVaultPaths = useSetAtom(atom_remapVaultPaths);
  const rewriteLinks = useRewriteLinksAfterMove();
  const { writeThrough, readCurrentText } = useNoteBuffer();

  // Adds `steps` to the group with `ref.id` (made, newest, when there's
  // none), or with a function, replaces its steps with what it returns.
  const recordSteps = useCallback((
    ref: FileUndoGroupRef,
    update: FileUndoStep[] | ((steps: FileUndoStep[]) => FileUndoStep[]),
  ): FileUndoGroup | null => {
    const vault = store.get(atom_vaultHandle);
    if (!vault) return null;
    let group: FileUndoGroup | null = null;
    store.set(atom_fileUndoStack, (prev) => {
      const stack = prev.filter((g) => g.vault === vault);
      const existing = stack.find((g) => g.id === ref.id);
      const current = existing?.steps ?? [];
      const steps = typeof update === "function" ? update(current) : [...current, ...update];
      if (steps.length === 0) return prev;
      const moves = steps.flatMap((step) => (step.kind === "move" ? [{ from: step.from, to: step.to }] : []));
      group = { vault, label: existing?.label ?? ref.label, id: ref.id, steps, moves };
      return existing
        ? stack.map((g) => (g === existing ? group! : g))
        : [...stack.slice(-(FILE_UNDO_LIMIT - 1)), group];
    });
    return group;
  }, [store]);

  // With `ref`, the moves join that group instead of making their own.
  const recordUndo = useCallback((label: string, moves: FileUndoGroup["moves"], ref?: FileUndoGroupRef): FileUndoGroup | null => {
    if (ref) return recordSteps(ref, moves.map((move) => ({ kind: "move" as const, ...move })));
    const vault = store.get(atom_vaultHandle);
    if (!vault || moves.length === 0) return null;
    const group = { vault, label, moves };
    store.set(atom_fileUndoStack, (prev) => [
      ...prev.filter((g) => g.vault === vault).slice(-(FILE_UNDO_LIMIT - 1)),
      group,
    ]);
    return group;
  }, [store, recordSteps]);

  // One step back. Moves throw on failure; the rest answer how it went.
  const undoStep = useCallback(async (vault: FileSystemDirectoryHandle, step: FileUndoStep): Promise<"restored" | "skipped"> => {
    if (step.kind === "move") {
      await relocateEntry(vault, step.to, step.from);
      if (isTrashPath(step.to)) await removeEmptyTrashSlot(vault, step.to);
      else await remapVaultPaths({ oldPath: step.to, newPath: step.from });
      return "restored";
    }
    if (step.kind === "content") {
      const handle = await resolveFileHandleAtPath(vault, step.path);
      const { result } = await writeThrough(step.path, handle, (text) => (textFingerprint(text) === step.afterFingerprint ? step.before : null));
      if (result === "failed") throw new Error(`Couldn't save ${step.path}`);
      return result === "written" ? "restored" : "skipped";
    }
    const { folder, name } = splitPath(step.path);
    const parent = await directoryAtPath(vault, folder);
    if (step.kind === "create") {
      if (textFingerprint(await readCurrentText(step.path)) !== step.afterFingerprint) return "skipped";
      await withRetry(() => parent.removeEntry(name));
      return "restored";
    }
    // A folder the group made goes only while it's empty.
    const dir = await parent.getDirectoryHandle(name);
    for await (const entry of (dir as any).values()) {
      if (entry) return "skipped";
    }
    await withRetry(() => parent.removeEntry(name));
    return "restored";
  }, [remapVaultPaths, writeThrough, readCurrentText]);

  // With `expected` (a toast's Undo, or Undo turn), only that action is
  // undone, and only while it is still the latest one.
  const undoFileOperation = useCallback(async (expected?: FileUndoGroup): Promise<boolean> => {
    const vault = store.get(atom_vaultHandle);
    const stack = store.get(atom_fileUndoStack);
    const group = stack[stack.length - 1];
    if (!vault || !group || group.vault !== vault) {
      toast("Nothing to undo", { id: "file-undo" });
      return false;
    }
    // A group with an id is replaced as it grows, so it's matched by id.
    const isExpected = (g: FileUndoGroup) => g === expected || (!!expected?.id && g.id === expected.id);
    if (expected && !isExpected(group)) {
      toast(stack.some(isExpected) ? "Undo the later changes first" : "That change can no longer be undone", { id: "file-undo" });
      return false;
    }
    store.set(atom_fileUndoStack, stack.slice(0, -1));

    const steps: FileUndoStep[] = group.steps ?? group.moves.map((move) => ({ kind: "move" as const, ...move }));
    // Every path a step touches: the item shows at one of them meanwhile.
    const busy = steps
      .flatMap((step) => (step.kind === "move" ? [step.from, step.to] : [step.path]))
      .map((path): [string, BusyPath] => [path, { op: "undo" }]);
    return withBusyPaths(store, busy, async () => {
      const outcome: FileUndoOutcome = { restored: 0, skipped: [], failed: [] };
      const before = store.get(atom_fileMetadata);
      const reverseMoves: { from: string; to: string }[] = [];
      for (const step of [...steps].reverse()) {
        const path = step.kind === "move" ? step.from : step.path;
        try {
          if ((await undoStep(vault, step)) === "skipped") outcome.skipped.push(path);
          else {
            outcome.restored++;
            if (step.kind === "move" && !isTrashPath(step.to)) reverseMoves.push({ from: step.to, to: step.from });
          }
        } catch (err) {
          console.error(`Failed to undo ${group.label} for ${path}:`, err);
          outcome.failed.push(path);
        }
      }
      // Undoing a rename/move restores the link text with the reverse mapping
      // (never for Trash moves). Failures only toast; the undo stands.
      if (reverseMoves.length > 0) {
        try {
          const links = await rewriteLinks(before, reverseMoves);
          if (links.failed > 0) {
            toast.error(`Couldn't update links in ${plural(links.failed, "note")}`, { id: "file-undo-links" });
          }
        } catch (err) {
          console.error("Link update failed:", err);
          toast.error("Couldn't update links", { id: "file-undo-links" });
        }
      }
      if (group.id) store.set(atom_undoneFileGroups, (prev) => ({ ...prev, [group.id!]: outcome }));
      await scanVault(vault);
      void indexVaultTags();
      const { failed, skipped } = outcome;
      if (failed.length === 0) {
        const note = skipped.length ? ` · ${plural(skipped.length, "file")} changed since, left as is` : "";
        toast.success(`Undo ${group.label}${note}`, { id: "file-undo" });
        return true;
      }
      toast.error(
        failed.length === steps.length
          ? `Couldn't undo ${group.label}`
          : `Undo ${group.label}: ${failed.length} of ${steps.length} items couldn't be restored`,
        { id: "file-undo" },
      );
      return false;
    });
  }, [store, undoStep, rewriteLinks, scanVault, indexVaultTags]);

  return { recordUndo, recordSteps, undoFileOperation };
}
