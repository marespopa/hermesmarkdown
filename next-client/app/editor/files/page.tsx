"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAtom } from "jotai";
import { HiOutlineArrowLeft, HiOutlineDocumentAdd, HiOutlineFolderAdd } from "react-icons/hi";
import toast from "react-hot-toast";
import Button from "@/app/components/Button";
import { atom_activeFilePath } from "@/app/atoms/atoms";
import { useDialog } from "@/app/hooks/use-dialog";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { withRetry } from "@/app/hooks/file-system/shared";
import { useSidebarSearch } from "../hooks/useSidebarSearch";
import VaultSidebarFiles from "../components/VaultSidebarFiles";

export default function FilesPage() {
  const router = useRouter();
  const dialog = useDialog();
  const [activeFilePath, setActiveFilePath] = useAtom(atom_activeFilePath);
  const {
    createFile,
    createNewFile,
    deleteFile,
    duplicateFile,
    isMounted,
    moveItem,
    openFile,
    renameFile,
    scanVault,
    vaultHandle,
  } = useFileSystem();
  const { allFiles, folderPaths } = useSidebarSearch({ selectedTags: [], panel: "files" });

  const resolveFolderHandle = useCallback(async (path: string): Promise<FileSystemDirectoryHandle | null> => {
    if (!vaultHandle) return null;
    let directory = vaultHandle;
    for (const segment of path.split("/")) {
      try {
        directory = await directory.getDirectoryHandle(segment);
      } catch {
        return null;
      }
    }
    return directory;
  }, [vaultHandle]);

  const chooseFolder = useCallback(async (): Promise<FileSystemDirectoryHandle | null> => {
    if (!vaultHandle) return null;

    const directories = await Promise.all(folderPaths.map(resolveFolderHandle));
    const options = [
      { label: `/ ${vaultHandle.name} (root)`, value: "__root__" },
      ...folderPaths.flatMap((path, index) => {
        const directory = directories[index];
        return directory ? [{ label: path, value: path }] : [];
      }),
      { label: "+ New Folder", value: "__new_folder__" },
    ];
    const selected = await dialog.select("Choose a folder for the new file:", options, "New File");
    if (!selected) return null;
    if (selected === "__root__") return vaultHandle;

    if (selected === "__new_folder__") {
      const name = String(await dialog.prompt("Enter folder name:", "", "New Folder") ?? "").trim();
      if (!name) return null;
      if (/[\\/]/.test(name)) {
        toast.error("Folder names cannot contain slashes.");
        return null;
      }
      try {
        const directory = await withRetry(() => vaultHandle.getDirectoryHandle(name, { create: true }));
        await scanVault(vaultHandle);
        return directory;
      } catch (error) {
        console.error("Failed to create folder:", error);
        toast.error("Failed to create folder.");
        return null;
      }
    }

    return directories[folderPaths.indexOf(selected)] ?? null;
  }, [dialog, folderPaths, resolveFolderHandle, scanVault, vaultHandle]);

  const createNote = useCallback(async () => {
    const directory = await chooseFolder();
    if (!directory) return;
    const name = String(await dialog.prompt("Enter file name:", "", "New File") ?? "").trim();
    if (!name) return;
    await createFile(name, "", directory);
  }, [chooseFolder, createFile, dialog]);

  const createFolder = useCallback(async () => {
    if (!vaultHandle) return;
    const name = String(await dialog.prompt("Enter folder name:", "", "New Folder") ?? "").trim();
    if (!name) return;
    if (/[\\/]/.test(name)) {
      toast.error("Folder names cannot contain slashes.");
      return;
    }
    try {
      await withRetry(() => vaultHandle.getDirectoryHandle(name, { create: true }));
      await scanVault(vaultHandle);
      toast.success(`Created: ${name}`);
    } catch (error) {
      console.error("Failed to create folder:", error);
      toast.error("Failed to create folder.");
    }
  }, [dialog, scanVault, vaultHandle]);

  const openSelectedFile = useCallback((handle: FileSystemFileHandle, path?: string) => {
    void openFile(handle, path);
    setActiveFilePath(path ?? handle.name);
    router.push("/editor");
  }, [openFile, router, setActiveFilePath]);

  if (!isMounted) return null;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden overscroll-none bg-paper-pale font-sans text-ink-light dark:bg-paper-dark dark:text-ink-dark">
      <header className="shrink-0 border-b border-beige/70 px-5 py-4 dark:border-paper-dark sm:px-8">
        <Button
          variant="bare"
          onClick={() => router.push("/editor")}
          className="group text-stone hover:text-ink-light dark:hover:text-ink-dark"
          aria-label="Back to editor"
        >
          <HiOutlineArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
          Editor
        </Button>
      </header>
      <main className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-4 py-5 sm:px-8">
        <div className="mb-5 flex shrink-0 items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-ui-title-3 font-semibold">Explorer</h1>
            <p className="truncate text-ui-caption text-stone">{vaultHandle?.name ?? "No vault open"}</p>
          </div>
        {vaultHandle && (
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="secondary" onClick={() => void createNote()} className="h-8 px-2.5 text-ui-footnote" aria-label="New note">
              <HiOutlineDocumentAdd size={15} />
              <span className="hidden sm:inline">New Note</span>
            </Button>
            <Button variant="secondary" onClick={() => void createFolder()} className="h-8 px-2.5 text-ui-footnote" aria-label="New folder">
              <HiOutlineFolderAdd size={15} />
              <span className="hidden sm:inline">New Folder</span>
            </Button>
          </div>
        )}
        </div>
        {vaultHandle ? (
          <>
            <p className="mb-3 text-ui-footnote text-fg-muted">
              {allFiles.length} {allFiles.length === 1 ? "note" : "notes"}, {folderPaths.length} {folderPaths.length === 1 ? "folder" : "folders"}
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-edge-subtle bg-chrome">
              <VaultSidebarFiles
                processedFiles={allFiles}
                activeFilePath={activeFilePath}
                openFile={openSelectedFile}
                renameFile={renameFile}
                deleteFile={deleteFile}
                duplicateFile={duplicateFile}
                treeView
                folderPaths={folderPaths}
                resolveFolderHandle={resolveFolderHandle}
                createNewFile={createNewFile}
                moveItem={moveItem}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-ui-footnote text-fg-muted">
            Open a vault from the editor to manage its files.
          </div>
        )}
      </main>
    </div>
  );
}
