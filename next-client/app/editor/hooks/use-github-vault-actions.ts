import { useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import toast from "react-hot-toast";
import {
  atom_activeFilePath,
  atom_content,
  atom_lastSavedContent,
  atom_openFiles,
  atom_rebindHandles,
  atom_vaultDescriptor,
} from "@/app/atoms/atoms";
import { useDialog } from "@/app/hooks/use-dialog";
import type { useFileSystem } from "@/app/hooks/use-file-system";
import { pullGitHubVault, syncGitHubVault } from "@/app/services/github-vault-sync";

type FileSystemApi = ReturnType<typeof useFileSystem>;

interface GitHubVaultActionOptions {
  vaultHandle: FileSystemApi["vaultHandle"];
  activeFileHandle: FileSystemApi["activeFileHandle"];
  saveFile: FileSystemApi["saveFile"];
  refreshVault: () => void;
}

// The GitHub vault commands: commit (asks for a message; commits straight to
// the branch) and pull (merges remote changes into the local notes). Both save
// the active note first and refuse to run over other unsaved tabs.
export function useGitHubVaultActions({ vaultHandle, activeFileHandle, saveFile, refreshVault }: GitHubVaultActionOptions) {
  const dialog = useDialog();
  const content = useAtomValue(atom_content);
  const lastSavedContent = useAtomValue(atom_lastSavedContent);
  const activeFilePath = useAtomValue(atom_activeFilePath);
  const openFiles = useAtomValue(atom_openFiles);
  const setOpenFiles = useSetAtom(atom_openFiles);
  const rebindHandles = useSetAtom(atom_rebindHandles);
  const vaultDescriptor = useAtomValue(atom_vaultDescriptor);
  const setVaultDescriptor = useSetAtom(atom_vaultDescriptor);

  const syncGitHub = useCallback(async (message: string) => {
    if (!vaultHandle || vaultDescriptor?.kind !== "github") {
      throw new Error("Open a GitHub vault before committing.");
    }
    if (activeFileHandle && content !== lastSavedContent) {
      const saved = await saveFile(content);
      if (!saved) throw new Error("Save the active note before committing.");
    }
    const result = await syncGitHubVault(vaultHandle, vaultDescriptor, message.trim());
    setVaultDescriptor(result.descriptor);
    return result;
  }, [activeFileHandle, content, lastSavedContent, saveFile, setVaultDescriptor, vaultDescriptor, vaultHandle]);

  const runGitHubPullCommand = useCallback(async () => {
    if (!vaultHandle || vaultDescriptor?.kind !== "github") return;
    try {
      const inactiveUnsavedFile = Object.entries(openFiles).find(([path, file]) =>
        path !== activeFilePath && path !== "draft" && file.content !== file.lastSavedContent,
      );
      if (inactiveUnsavedFile) {
        throw new Error(`Save ${inactiveUnsavedFile[0]} before pulling remote changes.`);
      }
      if (activeFileHandle && content !== lastSavedContent && !await saveFile(content)) {
        throw new Error("Save the active note before pulling.");
      }
      const result = await pullGitHubVault(vaultHandle, vaultDescriptor);
      setVaultDescriptor(result.descriptor);
      await rebindHandles(vaultHandle);
      if (result.files.length) {
        const updates = new Map(result.files.map((file) => [file.path, file.content]));
        setOpenFiles((previous) => Object.fromEntries(Object.entries(previous).map(([path, file]) => {
          const nextContent = updates.get(path);
          return nextContent === undefined || nextContent === null
            ? [path, file]
            : [path, { ...file, content: nextContent, lastSavedContent: nextContent }];
        })));
      }
      refreshVault();
      toast.success(result.conflicts
        ? `Merged remote changes with ${result.conflicts} conflict${result.conflicts === 1 ? "" : "s"} to resolve.`
        : result.changes ? `Merged ${result.changes} remote file${result.changes === 1 ? "" : "s"}.` : "GitHub vault is already up to date.");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "GitHub pull failed.");
    }
  }, [activeFileHandle, activeFilePath, content, refreshVault, lastSavedContent, openFiles, rebindHandles, saveFile, setOpenFiles, setVaultDescriptor, vaultDescriptor, vaultHandle]);

  const runGitHubCommitCommand = useCallback(async () => {
    if (vaultDescriptor?.kind !== "github") return;
    const response = await dialog.textarea(
      "Describe this set of note changes.",
      "",
      "Commit & Sync",
      `Commits directly to ${vaultDescriptor.branch}.`,
    );
    const message = typeof response === "string"
      ? response
      : typeof response?.text === "string" ? response.text : "";
    if (!message.trim()) return;
    try {
      const result = await syncGitHub(message);
      toast.success(result?.changes ? `Committed ${result.changes} change${result.changes === 1 ? "" : "s"}.` : "GitHub vault is already up to date.");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "GitHub vault sync failed.");
    }
  }, [dialog, syncGitHub, vaultDescriptor]);

  return { isGitHubVault: vaultDescriptor?.kind === "github", runGitHubCommitCommand, runGitHubPullCommand };
}
