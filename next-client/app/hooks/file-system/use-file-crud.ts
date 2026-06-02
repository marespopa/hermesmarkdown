"use client";

import { useAtom } from "jotai";
import { useCallback } from "react";
import toast from "react-hot-toast";
import {
  atom_vaultHandle,
  atom_currentDirectoryHandle,
  atom_activeFileHandle,
  atom_fileName,
  atom_activeFilePath,
  atom_openFiles,
  atom_workspaceLayout,
} from "@/app/atoms/atoms";
import { useDialog } from "../use-dialog";
import { withPickerLock } from "./shared";

interface UseFileCrudProps {
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
  indexVaultTags: (passedHandle?: FileSystemDirectoryHandle) => Promise<void>;
  openFile: (fileHandle: FileSystemFileHandle, providedPath?: string, force?: boolean) => Promise<void>;
}

export function useFileCrud({ scanVault, indexVaultTags, openFile }: UseFileCrudProps) {
  const [vaultHandle] = useAtom(atom_vaultHandle);
  const [currentDirectoryHandle] = useAtom(atom_currentDirectoryHandle);
  const [activeFileHandle, setActiveFileHandle] = useAtom(atom_activeFileHandle);
  const [, setFileName] = useAtom(atom_fileName);
  const [, setActiveFilePath] = useAtom(atom_activeFilePath);
  const [, setOpenFiles] = useAtom(atom_openFiles);
  const [, setWorkspaceLayout] = useAtom(atom_workspaceLayout);
  const dialog = useDialog();

  const createFile = useCallback(
    async (name: string, content: string = "") => {
      const targetDir = currentDirectoryHandle || vaultHandle;
      if (!targetDir) return null;

      const baseName = name.endsWith(".md") ? name.slice(0, -3) : name;
      let fileName = `${baseName}.md`;
      let counter = 1;
      let newFileHandle: FileSystemFileHandle | null = null;

      try {
        // Conflict Resolution Loop: find a unique filename
        while (true) {
          try {
            await targetDir.getFileHandle(fileName, { create: false });
            // If the above doesn't throw, the file already exists
            fileName = `${baseName} (${counter++}).md`;
          } catch (err: any) {
            if (err.name === "NotFoundError") {
              // Found a unique name!
              newFileHandle = await targetDir.getFileHandle(fileName, { create: true });
              break;
            }
            // If it's any other error (like security/permission), rethrow to the outer catch
            throw err;
          }
        }

        if (!newFileHandle) throw new Error("Failed to resolve file handle");

        // Write content immediately if provided
        const writable = await (newFileHandle as any).createWritable();
        await writable.write(content);
        await writable.close();

        await scanVault(targetDir);
        await indexVaultTags();

        // Calculate path for opening
        let path = fileName;
        if (vaultHandle && currentDirectoryHandle) {
          let isRoot = false;
          try {
            isRoot = await (vaultHandle as any).isSameEntry(currentDirectoryHandle);
          } catch {
            isRoot = vaultHandle.name === currentDirectoryHandle.name;
          }

          if (!isRoot) {
            try {
              const relativePath = await (vaultHandle as any).resolve(currentDirectoryHandle);
              if (relativePath) {
                path = [...relativePath, fileName].join("/");
              }
            } catch (e) {
              console.warn("Failed to resolve relative path:", e);
            }
          }
        }

        await openFile(newFileHandle, path, true);
        
        // Reset the draft state now that it's a real file
        setOpenFiles((prev) => ({
          ...prev,
          draft: {
            content: "",
            lastSavedContent: "",
            fileName: "untitled.md",
            activeFilePath: null,
          },
        }));

        toast.success("Created: " + fileName);
        return newFileHandle;
      } catch (err: any) {
        console.error("File System Error:", err?.message || err);
        toast.error("Failed to create file");
        return null;
      }
    },
    [vaultHandle, currentDirectoryHandle, scanVault, indexVaultTags, openFile, setOpenFiles],
  );

  const createNewFile = useCallback(async () => {
    const targetDir = currentDirectoryHandle || vaultHandle;
    if (!targetDir) return;

    const name = await dialog.prompt("Enter file name (without .md):", "", "New File");
    if (!name) return;

    return await createFile(name, "");
  }, [vaultHandle, currentDirectoryHandle, createFile, dialog]);

  const createNewFolder = useCallback(async () => {
    const targetDir = currentDirectoryHandle || vaultHandle;
    if (!targetDir) return;

    const name = await dialog.prompt("Enter folder name:", "", "New Folder");
    if (!name) return;

    try {
      await targetDir.getDirectoryHandle(name, {
        create: true,
      });
      await scanVault(targetDir);
      toast.success("Folder created: " + name);
    } catch (err: any) {
      console.error("File System Error:", err?.message || err);
      toast.error("Failed to create folder");
    }
  }, [vaultHandle, currentDirectoryHandle, scanVault, dialog]);

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
      dialog,
    ],
  );

  const renameFile = useCallback(
    async (handle: FileSystemHandle) => {
      const parentDir = currentDirectoryHandle || vaultHandle;
      if (!parentDir) return;

      const newName = await dialog.prompt(
        "Enter new name:",
        handle.name,
        "Rename Item",
      );
      if (!newName || newName === handle.name) return;

      const attemptRename = async (retryCount = 0): Promise<void> => {
        try {
          // 1. Get a FRESH handle from the parent to avoid "state changed" errors
          let freshHandle: FileSystemHandle;
          try {
            if (handle.kind === "file") {
              freshHandle = await (parentDir as any).getFileHandle(handle.name);
            } else {
              freshHandle = await (parentDir as any).getDirectoryHandle(handle.name);
            }
          } catch (e) {
            console.error("Failed to get fresh handle for rename:", e);
            throw new Error("Item no longer exists or is inaccessible");
          }

          // 2. Check if this is the active file
          let isActive = false;
          if (activeFileHandle) {
            try {
              isActive = await (freshHandle as any).isSameEntry(activeFileHandle);
            } catch {
              // Comparison failed
            }
          }

          // 3. Attempt Native Move with Fallback
          let moveSuccessful = false;
          if ((freshHandle as any).move) {
            try {
              // Use explicit parentDir for maximum compatibility on some browsers/OSs
              await (freshHandle as any).move(parentDir, newName);
              moveSuccessful = true;
            } catch (moveErr) {
              console.warn("Native move failed, falling back to copy/delete:", moveErr);
            }
          }

          if (moveSuccessful) {
            if (isActive) {
              setActiveFileHandle(freshHandle as FileSystemFileHandle);
              setFileName(newName.replace(".md", ""));

              // Recalculate path for metadata/tracking
              if (vaultHandle) {
                const pathParts = await (vaultHandle as any).resolve(freshHandle);
                if (pathParts) {
                  setActiveFilePath(pathParts.join("/"));
                } else {
                  setActiveFilePath(newName);
                }
              }
            }
          } else {
            // Fallback for files: manual copy and delete
            if (freshHandle.kind === "file") {
              const file = await (freshHandle as FileSystemFileHandle).getFile();
              const content = await file.text();
              const newFileHandle = await parentDir.getFileHandle(newName, {
                create: true,
              });
              let writable: FileSystemWritableFileStream | null = null;
              try {
                writable = await newFileHandle.createWritable();
                if (writable) {
                  await writable.write(content);
                  await writable.close();
                  writable = null;
                }
                await (parentDir as any).removeEntry(freshHandle.name);

                if (isActive) {
                  setActiveFileHandle(newFileHandle);
                  setFileName(newName.replace(".md", ""));

                  // Recalculate path for metadata/tracking
                  if (vaultHandle) {
                    const pathParts = await (vaultHandle as any).resolve(newFileHandle);
                    if (pathParts) {
                      setActiveFilePath(pathParts.join("/"));
                    } else {
                      setActiveFilePath(newName);
                    }
                  }
                }
              } finally {
                if (writable) {
                  try {
                    await (writable as any).close();
                  } catch {
                    // Ignore cleanup error
                  }
                }
              }
            } else {
              throw new Error("Folder renaming not supported in this browser");
            }
          }
          await scanVault(parentDir);
          indexVaultTags();
          toast.success("Renamed successfully");
        } catch (err: any) {
          const isRetryable =
            err.name === "InvalidStateError" ||
            err.name === "NoModificationAllowedError" ||
            err.message?.includes("state had changed") ||
            err.message?.includes("locked");

          if (isRetryable && retryCount < 3) {
            console.warn(`Rename operation issues, retrying (${retryCount + 1})...`);
            await new Promise((resolve) =>
              setTimeout(resolve, 300 * (retryCount + 1)),
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
      }
    },
    [
      vaultHandle,
      currentDirectoryHandle,
      activeFileHandle,
      scanVault,
      indexVaultTags,
      setFileName,
      setActiveFileHandle,
      setActiveFilePath,
      dialog,
    ],
  );

  const moveItem = useCallback(
    async (handle: FileSystemHandle, targetDir: FileSystemDirectoryHandle) => {
      const sourceParent = currentDirectoryHandle || vaultHandle;
      if (!sourceParent || !targetDir) return;

      const attemptMove = async (retryCount = 0): Promise<void> => {
        try {
          // 1. Get a FRESH handle from the parent to avoid "state changed" errors
          let freshHandle: FileSystemHandle;
          try {
            if (handle.kind === "file") {
              freshHandle = await (sourceParent as any).getFileHandle(handle.name);
            } else {
              freshHandle = await (sourceParent as any).getDirectoryHandle(handle.name);
            }
          } catch (e) {
            console.error("Failed to get fresh handle for move:", e);
            throw e;
          }

          // 2. Prevent moving into itself or same directory
          let isSameEntry = false;
          try {
            isSameEntry = await (freshHandle as any).isSameEntry(targetDir);
          } catch {
            // Comparison failed
          }
          if (isSameEntry) {
            toast.error("Cannot move item into itself");
            return;
          }

          let isSameDir = false;
          try {
            isSameDir = await (sourceParent as any).isSameEntry(targetDir);
          } catch {
            // Comparison failed
          }
          if (isSameDir) return;

          let isActive = false;
          if (activeFileHandle) {
            try {
              isActive = await (freshHandle as any).isSameEntry(activeFileHandle);
            } catch {
            // Comparison failed
          }
          }

          // 3. Attempt Native Move, with Fallback
          try {
            if ((freshHandle as any).move) {
              await (freshHandle as any).move(targetDir, freshHandle.name);
              if (isActive) {
                setActiveFileHandle(freshHandle as FileSystemFileHandle);
                
                // Recalculate path for metadata/tracking
                if (vaultHandle) {
                  const pathParts = await (vaultHandle as any).resolve(freshHandle);
                  if (pathParts) {
                    setActiveFilePath(pathParts.join("/"));
                  }
                }
              }
            } else {
              throw new Error("Native move not supported");
            }
          } catch (moveErr: any) {
            // Fallback for files: manual copy and delete
            if (freshHandle.kind === "file") {
              console.warn("Native move failed or unsupported, using fallback:", moveErr);
              const file = await (freshHandle as FileSystemFileHandle).getFile();
              const content = await file.text();
              const newFileHandle = await targetDir.getFileHandle(freshHandle.name, {
                create: true,
              });
              
              let writable: FileSystemWritableFileStream | null = null;
              try {
                writable = await newFileHandle.createWritable();
                if (writable) {
                  await writable.write(content);
                  await writable.close();
                  writable = null;
                }
                await (sourceParent as any).removeEntry(freshHandle.name);

                if (isActive) {
                  setActiveFileHandle(newFileHandle);
                  
                  // Recalculate path for metadata/tracking
                  if (vaultHandle) {
                    const pathParts = await (vaultHandle as any).resolve(newFileHandle);
                    if (pathParts) {
                      setActiveFilePath(pathParts.join("/"));
                    }
                  }
                }
              } finally {
                if (writable) {
                  try {
                    await (writable as any).close();
                  } catch {
                    // Ignore cleanup error
                  }
                }
              }
            } else {
              throw moveErr;
            }
          }

          await scanVault(sourceParent);
          indexVaultTags();
          toast.success(`Moved ${handle.name} to ${targetDir.name}`);
        } catch (err: any) {
          // If locked or stale, retry a few times
          const isRetryable = 
            err.name === "NoModificationAllowedError" || 
            err.name === "InvalidStateError" ||
            err.message?.includes("locked") || 
            err.message?.includes("state had changed");

          if (isRetryable && retryCount < 3) {
            console.warn(`Move operation issues (locked/stale), retrying (${retryCount + 1})...`);
            await new Promise((resolve) => setTimeout(resolve, 300 * (retryCount + 1)));
            return attemptMove(retryCount + 1);
          }
          throw err;
        }
      };

      try {
        await attemptMove();
      } catch (err: any) {
        console.error("File System Error:", err?.message || err);
        toast.error(err.message || "Failed to move item");
      }
    },
    [
      vaultHandle,
      currentDirectoryHandle,
      activeFileHandle,
      scanVault,
      indexVaultTags,
      setActiveFileHandle,
      setActiveFilePath,
    ],
  );

  const importFile = useCallback(async () => {
    // 1. Try Desktop File System Access API
    if ("showOpenFilePicker" in window) {
      try {
        const handle = await withPickerLock(async () => {
          try {
            const [handle] = await (window as any).showOpenFilePicker({
              types: [
                {
                  description: "Markdown",
                  accept: { "text/markdown": [".md", ".txt", ".markdown"] },
                },
              ],
              startIn: currentDirectoryHandle || vaultHandle || undefined,
            });
            return handle;
          } catch (err: any) {
            if (err.name === "AbortError" || err.name === "NotAllowedError") return undefined;
            throw err;
          }
        });

        if (handle) {
          await openFile(handle);
          return true;
        }
        return false;
      } catch (err: any) {
        if (err.name === "AbortError") return false;
        console.error("Picker failed, trying fallback:", err);
        return null;
      }
    }
    return null; // Signals to use fallback input
  }, [currentDirectoryHandle, vaultHandle, openFile]);

  return {
    createFile,
    createNewFile,
    createNewFolder,
    deleteFile,
    renameFile,
    moveItem,
    importFile,
  };
}
