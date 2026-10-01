"use client";

import { useAtom, useSetAtom } from "jotai";
import { useCallback } from "react";
import toast from "react-hot-toast";
import {
  atom_vaultHandle,
  atom_currentDirectoryHandle,
} from "@/app/atoms/atoms";
import { atom_remapVaultPaths } from "@/app/atoms/vault-atoms";
import { useDialog } from "../use-dialog";
import { moveDirectoryByCopy, moveFileByCopy } from "./directory-ops";

interface UseRenameItemProps {
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
  indexVaultTags: (passedHandle?: FileSystemDirectoryHandle) => Promise<void>;
}

export function useRenameItem({ scanVault, indexVaultTags }: UseRenameItemProps) {
  const [vaultHandle] = useAtom(atom_vaultHandle);
  const [currentDirectoryHandle] = useAtom(atom_currentDirectoryHandle);
  const remapVaultPaths = useSetAtom(atom_remapVaultPaths);
  const dialog = useDialog();

  const renameFile = useCallback(
    async (handle: FileSystemHandle, requestedName?: string, itemPath?: string) => {
      if (!vaultHandle) return;

      // Resolve the real parent directory by walking the item's vault path —
      // given by the caller (Explorer, current file), else looked up with
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
        handle.name,
        "Rename Item",
      ) ?? "").trim();
      if (!newName || newName === handle.name) return;
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
        oldPath = [...parentParts, handle.name].join("/");
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
      const attemptRename = async (retryCount = 0): Promise<void> => {
        let sideEffects = false;
        try {
          // 1. Get a FRESH handle from the parent to avoid "state changed" errors
          const freshHandle: FileSystemHandle = handle.kind === "file"
            ? await (parentDir as any).getFileHandle(handle.name)
            : await (parentDir as any).getDirectoryHandle(handle.name);

          // 2. Attempt Native Move with Fallback
          if ((freshHandle as any).move) {
            try {
              // Use explicit parentDir for maximum compatibility on some browsers/OSs
              await (freshHandle as any).move(parentDir, newName);
              return;
            } catch (moveErr) {
              console.warn("Native move failed, falling back to copy/delete:", moveErr);
            }
          }

          sideEffects = true;
          if (freshHandle.kind === "file") {
            await moveFileByCopy(freshHandle as FileSystemFileHandle, parentDir, newName);
          } else {
            await moveDirectoryByCopy(
              freshHandle as FileSystemDirectoryHandle,
              parentDir,
              parentDir,
              newName,
            );
          }
        } catch (err: any) {
          const isRetryable =
            err.name === "InvalidStateError" ||
            err.name === "NoModificationAllowedError" ||
            err.name === "NotFoundError" ||
            err.message?.includes("state had changed") ||
            err.message?.includes("locked");

          if (!sideEffects && isRetryable && retryCount < 6) {
            console.warn(`Rename operation issues, retrying (${retryCount + 1})...`);
            await new Promise((resolve) =>
              setTimeout(resolve, 400 * Math.pow(1.5, retryCount)),
            );
            return attemptRename(retryCount + 1);
          }
          throw err;
        }
      };

      try {
        await attemptRename();
      } catch (err: any) {
        console.error("File System Error:", err?.message || err);
        toast.error(err.message || "Failed to rename");
        return;
      }

      // 3. Follow the rename in open tabs (keeping unsaved edits, with fresh
      // handles), pane layouts, metadata and the file tree — for a folder,
      // that includes everything inside it.
      try {
        await remapVaultPaths({ oldPath, newPath });
        await scanVault(parentDir);
        indexVaultTags();
        toast.success("Renamed successfully");
      } catch (err: any) {
        console.error("Rename follow-up failed:", err?.message || err);
        toast.error("Renamed, but the workspace could not be refreshed");
      }
    },
    [
      vaultHandle,
      currentDirectoryHandle,
      scanVault,
      indexVaultTags,
      remapVaultPaths,
      dialog,
    ],
  );

  return { renameFile };
}
