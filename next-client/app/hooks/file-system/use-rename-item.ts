"use client";

import { useAtom, useSetAtom, useStore } from "jotai";
import { useCallback } from "react";
import toast from "react-hot-toast";
import {
  atom_vaultHandle,
  atom_currentDirectoryHandle,
} from "@/app/atoms/atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_remapVaultPaths, type FileUndoGroup } from "@/app/atoms/vault-atoms";
import type { FileUndoGroupRef } from "./use-file-undo";
import { useRewriteLinksAfterMove } from "./use-rewrite-links";
import { useDialog } from "../use-dialog";
import { withBusyPaths } from "./busy-paths";
import { caseStepName, moveDirectoryByCopy, moveFileByCopy } from "./directory-ops";

// Whether `from` is gone from `dir` and `to` is there, by the names as
// listed: on storage that ignores case (Android, Windows, macOS) a lookup of
// "draft.md" also finds "Draft.md".
async function renamedOnDisk(dir: FileSystemDirectoryHandle, from: string, to: string): Promise<boolean> {
  try {
    const names = new Set<string>();
    for await (const entry of (dir as any).values()) names.add(entry.name);
    return !names.has(from) && names.has(to);
  } catch {
    return false;
  }
}

interface UseRenameItemProps {
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
  indexVaultTags: (passedHandle?: FileSystemDirectoryHandle) => Promise<void>;
  recordUndo: (label: string, moves: FileUndoGroup["moves"], group?: FileUndoGroupRef) => FileUndoGroup | null;
}

// Renames quietly (the new name shows where the item is); ⌘Z in the file
// tree takes it back.
export function useRenameItem({ scanVault, indexVaultTags, recordUndo }: UseRenameItemProps) {
  const [vaultHandle] = useAtom(atom_vaultHandle);
  const [currentDirectoryHandle] = useAtom(atom_currentDirectoryHandle);
  const remapVaultPaths = useSetAtom(atom_remapVaultPaths);
  const dialog = useDialog();
  const store = useStore();
  const rewriteLinks = useRewriteLinksAfterMove();

  const renameFile = useCallback(
    // Resolves to the item's new vault path once renamed.
    async (handle: FileSystemHandle, requestedName?: string, itemPath?: string, undoGroup?: FileUndoGroupRef): Promise<string | undefined> => {
      if (!vaultHandle) return;
      // The item's name now: from the caller's path, which follows renames,
      // rather than the handle's, which can be an older handle's (a note in
      // front renamed before) and then isn't found.
      const currentName = itemPath?.split("/").filter(Boolean).pop() ?? handle.name;

      // Resolve the real parent directory by walking the item's vault path —
      // given by the caller (the Files tree, current file), else looked up with
      // resolve() — rather than assuming it's whatever directory the user last
      // navigated to (atom_currentDirectoryHandle): that breaks for items
      // outside the last-visited folder, and resolve() returns null for a
      // handle that's no longer current (e.g. after a rescan).
      let parentDir: FileSystemDirectoryHandle = currentDirectoryHandle || vaultHandle;
      let dirParts: string[] | null = null;
      try {
        const pathParts: string[] | null = itemPath
          ? itemPath.split("/").filter(Boolean)
          : await (vaultHandle as any).resolve(handle);
        if (pathParts) dirParts = pathParts.slice(0, -1);
        if (pathParts && pathParts.length > 1) {
          let dir: FileSystemDirectoryHandle = vaultHandle;
          for (let i = 0; i < pathParts.length - 1; i++) {
            dir = await dir.getDirectoryHandle(pathParts[i]);
          }
          parentDir = dir;
        } else if (pathParts && pathParts.length === 1) {
          parentDir = vaultHandle;
        }
      } catch {
        // fall back to currentDirectoryHandle/vaultHandle above
      }

      const newName = String(requestedName ?? await dialog.prompt(
        "Enter new name:",
        currentName,
        "Rename Item",
      ) ?? "").trim();
      if (!newName || newName === currentName) return;
      if (/[\\/]/.test(newName)) {
        toast.error(`${handle.kind === "file" ? "File" : "Folder"} names cannot contain slashes.`);
        return;
      }

      // Vault-relative paths before and after, for tabs/metadata/tree
      let oldPath: string;
      let newPath: string;
      try {
        const parentParts: string[] = dirParts ?? (parentDir === vaultHandle
          ? []
          : (await (vaultHandle as any).resolve(parentDir)) || []);
        oldPath = [...parentParts, currentName].join("/");
        newPath = [...parentParts, newName].join("/");
      } catch (err: any) {
        console.error("File System Error:", err?.message || err);
        toast.error(err?.message || "Failed to rename");
        return;
      }

      // Only the move itself is retried, and only while nothing has been
      // written yet: retrying after the fallback created the target left a
      // trail of empty copies (browsers backed by Android storage name each
      // new one "name (1)", "name (2)", …).
      const attemptRename = async (from: string, to: string, retryCount = 0): Promise<void> => {
        let sideEffects = false;
        try {
          // 1. Get a FRESH handle from the parent to avoid "state changed" errors
          const freshHandle: FileSystemHandle = handle.kind === "file"
            ? await (parentDir as any).getFileHandle(from)
            : await (parentDir as any).getDirectoryHandle(from);

          // 2. Attempt Native Move with Fallback
          if ((freshHandle as any).move) {
            try {
              // Use explicit parentDir for maximum compatibility on some browsers/OSs
              await (freshHandle as any).move(parentDir, to);
              return;
            } catch (moveErr) {
              if (await renamedOnDisk(parentDir, from, to)) return;
              console.warn("Native move failed, falling back to copy/delete:", moveErr);
            }
          }

          sideEffects = true;
          if (freshHandle.kind === "file") {
            await moveFileByCopy(freshHandle as FileSystemFileHandle, parentDir, to);
          } else {
            await moveDirectoryByCopy(
              freshHandle as FileSystemDirectoryHandle,
              parentDir,
              parentDir,
              to,
            );
          }
        } catch (err: any) {
          const isRetryable =
            err.name === "InvalidStateError" ||
            err.name === "NoModificationAllowedError" ||
            err.name === "NotFoundError" ||
            err.message?.includes("state had changed") ||
            err.message?.includes("locked");

          // A missing item rarely comes back: two quick tries, not a long stall.
          const maxRetries = err.name === "NotFoundError" ? 2 : 6;
          if (!sideEffects && isRetryable && retryCount < maxRetries) {
            console.warn(`Rename operation issues, retrying (${retryCount + 1})...`);
            await new Promise((resolve) =>
              setTimeout(resolve, 400 * Math.pow(1.5, retryCount)),
            );
            return attemptRename(from, to, retryCount + 1);
          }
          throw err;
        }
      };

      // Only the letter case changes ("Draft.md" → "draft.md"): storage that
      // ignores case sees the new name as taken (the copy fallback then made
      // "draft (1).md"), so it goes through an unused name first.
      const caseOnly = newName !== currentName && newName.toLowerCase() === currentName.toLowerCase();
      const rename = async () => {
        if (!caseOnly) return attemptRename(currentName, newName);
        const step = caseStepName(currentName);
        await attemptRename(currentName, step);
        try {
          await attemptRename(step, newName);
        } catch (err) {
          await attemptRename(step, currentName).catch(() => {});
          throw err;
        }
      };

      // The row shows the new name and a spinner until it's all done.
      return withBusyPaths(store, [[oldPath, { op: "rename", newName }], [newPath, { op: "rename" }]], async () => {
        const before = store.get(atom_fileMetadata);
        try {
          await rename();
        } catch (err: any) {
          console.error("File System Error:", err?.message || err);
          // A browser that reports a rename that went through as failed: the
          // disk has the new name and not the old, so it's done.
          if (!(await renamedOnDisk(parentDir, currentName, newName))) {
            if (err?.name === "NotFoundError") {
              // Gone from disk (removed or renamed elsewhere): say so in plain
              // words, and bring the Files list back in step.
              toast.error(`Couldn't rename "${currentName}": it's no longer in this folder.`);
              void scanVault(vaultHandle);
            } else {
              toast.error(err.message || "Failed to rename");
            }
            return;
          }
        }

        // 3. Follow the rename in open tabs (keeping unsaved edits, with fresh
        // handles), pane layouts, metadata and the file tree — for a folder,
        // that includes everything inside it.
        try {
          await remapVaultPaths({ oldPath, newPath });
          recordUndo("Rename", [{ from: oldPath, to: newPath }], undoGroup);
          // Links to the renamed note(s) follow it; a failure here never
          // undoes the rename or skips the rescan.
          try {
            const { updated, failed } = await rewriteLinks(before, [{ from: oldPath, to: newPath }]);
            if (updated > 0) toast.success(`Updated links in ${updated} note${updated === 1 ? "" : "s"}`);
            if (failed > 0) toast.error(`Couldn't update links in ${failed} note${failed === 1 ? "" : "s"}`);
          } catch (err: any) {
            console.error("Link update failed:", err?.message || err);
            toast.error("Couldn't update links");
          }
          // The whole vault: listing just the parent would replace the root
          // listing the file tree reads its top-level folders from.
          await scanVault(vaultHandle);
          indexVaultTags();
        } catch (err: any) {
          console.error("Rename follow-up failed:", err?.message || err);
          toast.error("Renamed, but the workspace could not be refreshed");
        }
        return newPath;
      });
    },
    [
      vaultHandle,
      currentDirectoryHandle,
      scanVault,
      indexVaultTags,
      remapVaultPaths,
      recordUndo,
      dialog,
      store,
      rewriteLinks,
    ],
  );

  return { renameFile };
}
