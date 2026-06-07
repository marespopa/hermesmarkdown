"use client";

import { useAtom, useSetAtom } from "jotai";
import { useCallback } from "react";
import toast from "react-hot-toast";
import {
  atom_vaultHandle,
  atom_currentDirectoryHandle,
  atom_activeFileHandle,
  atom_openFiles,
  atom_workspaceLayout,
} from "@/app/atoms/atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_vaultFiles } from "@/app/atoms/vault-atoms";
import { useDialog } from "../use-dialog";

interface UseDeleteItemProps {
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
  indexVaultTags: (passedHandle?: FileSystemDirectoryHandle) => Promise<void>;
}

export function useDeleteItem({ scanVault, indexVaultTags }: UseDeleteItemProps) {
  const [vaultHandle] = useAtom(atom_vaultHandle);
  const [currentDirectoryHandle] = useAtom(atom_currentDirectoryHandle);
  const [activeFileHandle, setActiveFileHandle] = useAtom(atom_activeFileHandle);
  const [, setOpenFiles] = useAtom(atom_openFiles);
  const [, setWorkspaceLayout] = useAtom(atom_workspaceLayout);
  const setFileMetadata = useSetAtom(atom_fileMetadata);
  const setVaultFiles = useSetAtom(atom_vaultFiles);
  const dialog = useDialog();

  const deleteFile = useCallback(
    async (handle: FileSystemHandle) => {
      const type = handle.kind === "file" ? "file" : "folder";
      const confirmed = await dialog.confirm(
        `Are you sure you want to delete this ${type}: ${handle.name}?`,
        "Delete Item",
      );
      if (!confirmed) return;

      const attemptDelete = async (retryCount = 0): Promise<void> => {
        const parentDir = currentDirectoryHandle || vaultHandle;
        if (!parentDir) return;

        try {
          await (parentDir as any).removeEntry(handle.name, { recursive: true });

          // Eagerly remove the deleted entry from sidebar caches so it disappears
          // immediately without waiting for the async re-index to complete.
          // (indexVaultTags merge-mode never removes entries, so this is the only
          // mechanism that clears a deleted file from fileMetadata.)
          const isDeletedPath = (path: string) =>
            handle.kind === "file"
              ? path.split("/").pop() === handle.name
              : path.startsWith(handle.name + "/") || path === handle.name;

          setFileMetadata((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((path) => { if (isDeletedPath(path)) delete next[path]; });
            return next;
          });
          setVaultFiles((prev) => prev.filter((f) => !isDeletedPath((f as any).path || f.name)));

          // Update workspace layout to remove all tabs matching the deleted item
          setWorkspaceLayout((prev) => {
            const removePathFromNode = (node: any): any => {
              if ("type" in node && node.type === "editor") {
                const newPaths = node.openFilePaths.filter((p: string) => {
                  if (handle.kind === "file") {
                    // Check if the filename matches (simplistic but often enough if path not stored)
                    return p.split("/").pop() !== handle.name;
                  } else {
                    // Directory: remove any path that starts with this directory
                    return !p.startsWith(handle.name + "/") && p !== handle.name;
                  }
                });

                let newActive = node.activeFilePath;
                if (newPaths.length === 0) {
                  newPaths.push("draft");
                  newActive = "draft";
                } else if (!newPaths.includes(newActive)) {
                  newActive = newPaths[newPaths.length - 1];
                }

                return {
                  ...node,
                  openFilePaths: newPaths,
                  activeFilePath: newActive,
                };
              }
              if ("children" in node) {
                return {
                  ...node,
                  children: node.children.map(removePathFromNode),
                };
              }
              return node;
            };

            return {
              ...prev,
              rootContainer: removePathFromNode(prev.rootContainer),
            };
          });

          // Clean up openFiles registry
          setOpenFiles((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((path) => {
              if (handle.kind === "file") {
                if (path.split("/").pop() === handle.name) delete next[path];
              } else {
                if (path.startsWith(handle.name + "/") || path === handle.name)
                  delete next[path];
              }
            });
            return next;
          });

          if (
            activeFileHandle?.name === handle.name ||
            (handle.kind === "directory" && activeFileHandle)
          ) {
            setActiveFileHandle(null);
          }

          await scanVault(parentDir);
          indexVaultTags();
          toast.success(`${handle.name} deleted`);
        } catch (err: any) {
          const isRetryable =
            err.name === "InvalidStateError" ||
            err.name === "NoModificationAllowedError" ||
            err.message?.includes("state had changed") ||
            err.message?.includes("locked");

          if (isRetryable && retryCount < 3) {
            console.warn(`Delete operation issues, retrying (${retryCount + 1})...`);
            await new Promise((resolve) =>
              setTimeout(resolve, 300 * (retryCount + 1)),
            );
            return attemptDelete(retryCount + 1);
          }
          throw err;
        }
      };

      try {
        await attemptDelete();
      } catch (err: any) {
        console.error("File System Error:", err?.message || err);
        toast.error("Failed to delete");
      }
    },
    [
      vaultHandle,
      currentDirectoryHandle,
      activeFileHandle,
      scanVault,
      indexVaultTags,
      setWorkspaceLayout,
      setOpenFiles,
      setActiveFileHandle,
      setFileMetadata,
      setVaultFiles,
      dialog,
    ],
  );

  return { deleteFile };
}
