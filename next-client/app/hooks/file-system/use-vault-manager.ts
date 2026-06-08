"use client";

import { useAtom, useSetAtom } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import {
  atom_vaultHandle,
  atom_currentDirectoryHandle,
  atom_vaultFiles,
  atom_isVaultPending,
  atom_hasLoadedVault,
  atom_activeFileHandle,
  atom_activeFilePath,
  atom_openFiles,
  atom_workspaceLayout,
  atom_rebindHandles,
  atom_isCloudVault,
  atom_fileSystemVersion,
  atom_autoInjectFrontmatter,
  atom_frontmatterHasPrompted,
  atom_indexerState,
  atom_vaultSetupStatus,
  atom_vaultSetupWizardOpen,
} from "@/app/atoms/atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import {
  saveVaultHandle,
  loadVaultHandle,
  clearVaultHandle,
  verifyPermission,
} from "@/app/services/idb";
import { useDialog } from "../use-dialog";
import { metadataWorker, withPickerLock, isVaultSupported, isIdbSupported } from "./shared";
import { LATEST_AGENT_VERSION, compareVersions } from "@/app/utils/agent-version";

export function useVaultManager() {
  const [vaultHandle, setVaultHandle] = useAtom(atom_vaultHandle);
  const [currentDirectoryHandle, setCurrentDirectoryHandle] = useAtom(atom_currentDirectoryHandle);
  const [, setVaultFiles] = useAtom(atom_vaultFiles);
  const [isVaultPending, setIsVaultPending] = useAtom(atom_isVaultPending);
  const [hasLoadedVault, setHasLoadedVault] = useAtom(atom_hasLoadedVault);
  const [, setFileMetadata] = useAtom(atom_fileMetadata);
  const [, setActiveFileHandle] = useAtom(atom_activeFileHandle);
  const [, setActiveFilePath] = useAtom(atom_activeFilePath);
  const [, setOpenFiles] = useAtom(atom_openFiles);
  const [, setWorkspaceLayout] = useAtom(atom_workspaceLayout);
  const [, setIsCloudVault] = useAtom(atom_isCloudVault);
  const [, setFileSystemVersion] = useAtom(atom_fileSystemVersion);
  const [, setVaultSetupStatus] = useAtom(atom_vaultSetupStatus);
  const [, setVaultSetupWizardOpen] = useAtom(atom_vaultSetupWizardOpen);
  const rebindHandles = useSetAtom(atom_rebindHandles);
  const setIndexerState = useSetAtom(atom_indexerState);
  const [frontmatterHasPrompted, setFrontmatterHasPrompted] = useAtom(atom_frontmatterHasPrompted);
  const [, setAutoInjectFrontmatter] = useAtom(atom_autoInjectFrontmatter);
  const dialog = useDialog();
  const pendingHandlesRef = useRef<Map<string, FileSystemFileHandle>>(new Map());

  const checkVaultSetup = useCallback(async (handle: FileSystemDirectoryHandle) => {
    try {
      const skippedVersion = localStorage.getItem("hermesSkipVaultSetup");
      if (skippedVersion && compareVersions(skippedVersion, LATEST_AGENT_VERSION) >= 0) {
        setVaultSetupStatus("skipped");
        return;
      }

      setVaultSetupStatus("checking");
      const fileHandle = await handle.getFileHandle("_agent-context.md");
      const file = await fileHandle.getFile();
      const text = await file.text();
      const match = text.match(/^version:\s*"?(\d+\.\d+)"?/m);
      const localVersion = match ? match[1] : "0.0";

      if (compareVersions(localVersion, LATEST_AGENT_VERSION) < 0) {
        setVaultSetupStatus("needs_setup");
        setVaultSetupWizardOpen("vault-root");
      } else {
        setVaultSetupStatus("configured");
      }
    } catch (err: any) {
      if (err.name === "NotFoundError") {
        setVaultSetupStatus("needs_setup");
        setVaultSetupWizardOpen("vault-root"); // Use a sentinel to indicate vault-level setup
      } else {
        console.warn("Failed to check vault setup:", err);
        setVaultSetupStatus("idle");
      }
    }
  }, [setVaultSetupStatus, setVaultSetupWizardOpen]);

  const detectCloudVault = useCallback(
    (handle: FileSystemDirectoryHandle) => {
      const cloudFolderNames = [
        "icloud",
        "onedrive",
        "dropbox",
        "google drive",
        "google-drive",
        "googledrive",
        "gdrive",
        "g-drive",
        "box",
        "pcloud",
        "nextcloud",
        "mega",
        "synology",
        "nas",
        "owncloud",
        "kdrive",
        "terabox",
      ];
      const name = handle.name.toLowerCase();
      const isCloud = cloudFolderNames.some((cloudName) => name.includes(cloudName));
      
      if (isCloud) {
        setIsCloudVault(true);
        console.info(`Cloud folder detected: ${handle.name}. Enabling enhanced error recovery.`);
        toast.success("Cloud sync detected. Enhanced recovery enabled.", {
          icon: "☁️",
          id: "cloud-detect-toast",
        });
      }
      return isCloud;
    },
    [setIsCloudVault],
  );

  const scanVault = useCallback(
    async (handle: FileSystemDirectoryHandle) => {
      try {
        setFileSystemVersion((v) => v + 1);
        const entries: any[] = [];
        
        // Construct the base path for entries in this directory
        let dirPath = "";
        if (vaultHandle && handle !== vaultHandle) {
          try {
            const pathParts = await (vaultHandle as any).resolve(handle);
            if (pathParts) {
              dirPath = pathParts.join("/");
            }
          } catch (err) {
            console.warn("Failed to resolve directory path:", err);
          }
        }

        for await (const entry of (handle as any).values()) {
          const entryPath = dirPath ? `${dirPath}/${entry.name}` : entry.name;
          // Attach path to the handle object for easier access in UI components
          (entry as any).path = entryPath;

          if (entry.kind === "file" && entry.name.endsWith(".md")) {
            entries.push(entry);
          } else if (entry.kind === "directory" && !entry.name.startsWith(".")) {
            entries.push(entry);
          }
        }
        setVaultFiles(entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
      } catch (err: any) {
        console.warn("Failed to scan vault:", err);
      }
    },
    [setVaultFiles, vaultHandle, setFileSystemVersion],
  );

  const indexVaultTags = useCallback(
    async (passedHandle?: FileSystemDirectoryHandle) => {
      try {
        const handle = passedHandle || vaultHandle;
        if (!handle) return;

        setIndexerState({ status: "compiling", count: 0 });
        const fileHandles: { handle: FileSystemFileHandle; path: string }[] = [];

        let subdirFailCount = 0;

        // Directories that are never markdown vaults but can hold huge file trees.
        // Descending into these (e.g. node_modules) can take minutes and pins the
        // indexer, so we skip them entirely. Hidden/system dotfolders are skipped too.
        const isIgnoredDir = (name: string) =>
          name === "node_modules" ||
          name === "vendor" ||
          name.startsWith(".");

        async function collectFiles(
          dirHandle: FileSystemDirectoryHandle,
          path: string = "",
        ) {
          try {
            for await (const entry of (dirHandle as any).values()) {
              const currentPath = path ? `${path}/${entry.name}` : entry.name;
              if (entry.kind === "file" && entry.name.endsWith(".md")) {
                fileHandles.push({
                  handle: entry as FileSystemFileHandle,
                  path: currentPath,
                });
              } else if (entry.kind === "directory" && !isIgnoredDir(entry.name)) {
                await collectFiles(entry as FileSystemDirectoryHandle, currentPath);
              }
            }
          } catch (err: any) {
            console.warn(`Failed to collect files from ${path || "root"}:`, err);
            if (path) subdirFailCount++;
          }
        }

        // Fail-safe: never let a slow/huge tree pin the indexer. If the walk runs long,
        // commit whatever was collected so far and stop showing the scanning state.
        let timedOut = false;
        await Promise.race([
          collectFiles(handle),
          new Promise<void>((resolve) =>
            setTimeout(() => {
              timedOut = true;
              resolve();
            }, 60000), // 60s timeout for local vaults
          ),
        ]);

        if (timedOut) {
          toast.error(
            "Indexing is taking a while — some folders may be very large. Showing what we found so far.",
            { id: "index-timeout", duration: 6000 },
          );
        }


        if (subdirFailCount > 0) {
          toast.error(
            `Could not read ${subdirFailCount} subfolder(s). Grant full folder access and re-open the vault.`,
            { id: "subdir-access-error", duration: 6000 },
          );
        }

        if (fileHandles.length > 0) {
          if (passedHandle) {
            // Fresh vault open: replace metadata entirely so stale entries from a previous vault never block display
            setFileMetadata(() => {
              const next: Record<string, any> = {};
              fileHandles.forEach(({ handle: fh, path }) => {
                next[path] = { path, name: fh.name, handle: fh, tags: [], links: [], frontmatter: {}, modifiedAt: 0, wordCount: 0 };
              });
              return next;
            });
          } else {
            // Re-index after save: merge so existing tag metadata is preserved until the worker responds
            setFileMetadata((prev) => {
              const next = { ...prev };
              fileHandles.forEach(({ handle: fh, path }) => {
                if (!next[path]) {
                  next[path] = { path, name: fh.name, handle: fh, tags: [], links: [], frontmatter: {}, modifiedAt: 0, wordCount: 0 };
                }
              });
              return next;
            });
          }
        }

        // Tag extraction below is secondary; it must not block the visible state.
        // setIndexerState("idle"); // REMOVED - it's too early

        // Read file contents in the main thread (permissions are scoped here, not in the worker)
        const filesWithContent = await Promise.all(
          fileHandles.map(async (f) => {
            try {
              const file = await f.handle.getFile();
              const content = await file.text();
              return { path: f.path, name: f.handle.name, content, modifiedAt: file.lastModified };
            } catch {
              return null;
            }
          })
        );
        const readable = filesWithContent.filter((f): f is NonNullable<typeof f> => f !== null);

        // Store handles locally so we can re-attach them after the worker responds
        pendingHandlesRef.current = new Map(fileHandles.map((f) => [f.path, f.handle]));

        if (metadataWorker && readable.length > 0) {
          metadataWorker.postMessage({ files: readable });
        } else {
          setIndexerState("idle");
        }
      } catch (err: any) {
        console.error("Failed to index vault tags:", err);
        setIndexerState("idle");
      }
    },
    [vaultHandle, setIndexerState, setFileMetadata],
  );


  const promptFrontmatter = useCallback(async () => {
    if (frontmatterHasPrompted) return;
    const enabled = await dialog.confirm(
      "Automatically prepend id, title, type, and tags to new or unstructured files when they are saved? You can change this any time in Settings.",
      "Auto-inject Frontmatter?",
      "Enable",
      "Skip",
    );
    setAutoInjectFrontmatter(enabled);
    setFrontmatterHasPrompted(true);
  }, [frontmatterHasPrompted, setAutoInjectFrontmatter, setFrontmatterHasPrompted, dialog]);

  const openVault = useCallback(async () => {
    if (!isVaultSupported) {
      toast.error("Your browser does not support local folder access. Try Chrome or Edge.");
      return;
    }

    const handle = await withPickerLock(async () => {
      try {
        return await window.showDirectoryPicker();
      } catch (err: any) {
        if (err.name === "AbortError" || err.name === "NotAllowedError") return undefined;
        throw err;
      }
    });

    if (!handle) return;

    try {
      setFileMetadata({});
      setOpenFiles({});
      setWorkspaceLayout({
        rootContainer: {
          id: "default-pane",
          type: "editor",
          openFilePaths: [],
          activeFilePath: null as any,
          isPinned: false,
        },
      });
      setVaultHandle(handle);
      setCurrentDirectoryHandle(handle);
      setIsVaultPending(false);
      detectCloudVault(handle);
      await saveVaultHandle(handle);
      await scanVault(handle);
      await indexVaultTags(handle);
      await rebindHandles(handle);
      await checkVaultSetup(handle);
      toast.success("Vault opened: " + handle.name);
      await promptFrontmatter();
    } catch (err: any) {
      console.error("File System Error:", err?.message || err);
      toast.error("Failed to open vault");
    }
  }, [setVaultHandle, setCurrentDirectoryHandle, setIsVaultPending, setFileMetadata, setOpenFiles, setWorkspaceLayout, scanVault, indexVaultTags, rebindHandles, detectCloudVault, promptFrontmatter, checkVaultSetup]);

  const restoreVault = useCallback(async () => {
    if (!vaultHandle) return;

    try {
      const granted = await verifyPermission(vaultHandle);
      if (granted) {
        setIsVaultPending(false);
        setCurrentDirectoryHandle(vaultHandle);
        detectCloudVault(vaultHandle);
        await scanVault(vaultHandle);
        await indexVaultTags(vaultHandle);
        await rebindHandles(vaultHandle);
        await checkVaultSetup(vaultHandle);
        toast.success("Vault restored");
        await promptFrontmatter();
      }
    } catch (err: any) {
      console.error("File System Error:", err?.message || err);
      toast.error("Failed to restore vault");
    }
  }, [vaultHandle, setIsVaultPending, setCurrentDirectoryHandle, scanVault, indexVaultTags, rebindHandles, detectCloudVault, promptFrontmatter, checkVaultSetup]);

  const syncSidebarToPath = useCallback(
    async (path: string) => {
      if (!vaultHandle || !path || path === "draft") return;

      const parts = path.split("/");
      let targetHandle: FileSystemDirectoryHandle = vaultHandle;

      if (parts.length > 1) {
        const folderParts = parts.slice(0, -1);
        try {
          for (const part of folderParts) {
            targetHandle = await targetHandle.getDirectoryHandle(part);
          }
        } catch (err) {
          console.warn("Failed to find parent directory for path:", path, err);
          return;
        }
      }

      // Check if we are already in the target directory
      let isSame = false;
      if (currentDirectoryHandle) {
        try {
          isSame = await (targetHandle as any).isSameEntry(currentDirectoryHandle);
        } catch {
          isSame = targetHandle.name === currentDirectoryHandle.name;
        }
      }

      if (!isSame) {
        setCurrentDirectoryHandle(targetHandle);
        await scanVault(targetHandle);
      }
    },
    [vaultHandle, currentDirectoryHandle, setCurrentDirectoryHandle, scanVault],
  );

  const navigateTo = useCallback(
    async (handle: FileSystemDirectoryHandle) => {
      setCurrentDirectoryHandle(handle);
      await scanVault(handle);
    },
    [setCurrentDirectoryHandle, scanVault],
  );

  const navigateBack = useCallback(async () => {
    if (
      !vaultHandle ||
      !currentDirectoryHandle ||
      vaultHandle.name === currentDirectoryHandle.name
    )
      return;

    setCurrentDirectoryHandle(vaultHandle);
    await scanVault(vaultHandle);
  }, [vaultHandle, currentDirectoryHandle, setCurrentDirectoryHandle, scanVault]);

  const closeVault = useCallback(() => {
    setVaultHandle(null);
    setCurrentDirectoryHandle(null);
    setVaultFiles([]);
    setFileMetadata({});
    setActiveFileHandle(null);
    setActiveFilePath("draft");
    setIsVaultPending(false);
    setIsCloudVault(false);
    
    setOpenFiles({
      draft: {
        content: "",
        lastSavedContent: "",
        fileName: "untitled",
        activeFilePath: "draft",
      }
    });

    setWorkspaceLayout({
      rootContainer: {
        id: "default-pane",
        type: "editor",
        openFilePaths: ["draft"],
        activeFilePath: "draft",
        isPinned: false
      }
    });

    clearVaultHandle();
    toast.success("Vault closed");
  }, [setVaultHandle, setCurrentDirectoryHandle, setVaultFiles, setFileMetadata, setActiveFileHandle, setActiveFilePath, setIsVaultPending, setOpenFiles, setWorkspaceLayout, setIsCloudVault]);

  // Worker Message Listener — only active when using a local (non-Drive) vault
  useEffect(() => {
    if (!metadataWorker) return;

    const handleMessage = (event: MessageEvent) => {
      const { results } = event.data;
      if (!results) return;
      // Ignore messages when a Drive vault is handling the worker output
      if (pendingHandlesRef.current.size === 0) return;

      setFileMetadata((prev) => {
        const next = { ...prev };
        results.forEach((res: any) => {
          const handle = pendingHandlesRef.current.get(res.path);
          if (handle) next[res.path] = { ...res, handle };
        });
        return next;
      });
      setIndexerState("idle");
    };

    metadataWorker.addEventListener("message", handleMessage);
    return () => metadataWorker?.removeEventListener("message", handleMessage);
  }, [setFileMetadata, setIndexerState]);

  // Load vault on mount — skipped when a Google Drive vault is configured
  useEffect(() => {
    if (hasLoadedVault || !isIdbSupported) return;
    const driveVaultId = typeof window !== 'undefined' ? localStorage.getItem('hermes_drive_vault_id') : null;
    if (driveVaultId && driveVaultId !== 'null') return;

    async function init() {
      setHasLoadedVault(true);
      const savedHandle = await loadVaultHandle();
      if (savedHandle) {
        setVaultHandle(savedHandle);
        setIsVaultPending(true);
      }
    }
    init();
  }, [setVaultHandle, setIsVaultPending, hasLoadedVault, setHasLoadedVault]);

  return {
    vaultHandle,
    currentDirectoryHandle,
    isVaultPending,
    scanVault,
    indexVaultTags,
    openVault,
    restoreVault,
    closeVault,
    navigateTo,
    navigateBack,
    syncSidebarToPath,
  };
}
