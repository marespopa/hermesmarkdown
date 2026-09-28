// Pure vault-walking helpers used by use-vault-manager.ts: directory listing,
// the recursive markdown walk for indexing, and cloud-folder detection. No
// React or atom access here, so they can be reasoned about (and tested) alone.

const CLOUD_FOLDER_NAMES = [
  "icloud", "onedrive", "dropbox", "box", "pcloud", "nextcloud",
  "mega", "synology", "nas", "owncloud", "kdrive", "terabox",
];

// Vault folders living inside a sync client get extra save/lock recovery.
export function isCloudFolderName(name: string): boolean {
  const lower = name.toLowerCase();
  return CLOUD_FOLDER_NAMES.some((cloudName) => lower.includes(cloudName));
}

// One directory level for the file views: .md files and (non-hidden unless
// `includeHidden`) folders, sorted by name, each tagged with its vault path.
export async function listDirectoryEntries(
  vaultHandle: FileSystemDirectoryHandle | null,
  handle: FileSystemDirectoryHandle,
  includeHidden: boolean,
): Promise<any[]> {
  let dirPath = "";
  if (vaultHandle && handle !== vaultHandle) {
    try {
      const pathParts = await (vaultHandle as any).resolve(handle);
      if (pathParts) dirPath = pathParts.join("/");
    } catch (err) {
      console.warn("Failed to resolve directory path:", err);
    }
  }

  const entries: any[] = [];
  for await (const entry of (handle as any).values()) {
    // Attach path to the handle object for easier access in UI components
    (entry as any).path = dirPath ? `${dirPath}/${entry.name}` : entry.name;
    if (entry.kind === "file" && entry.name.endsWith(".md")) {
      entries.push(entry);
    } else if (entry.kind === "directory" && (includeHidden || !entry.name.startsWith("."))) {
      entries.push(entry);
    }
  }
  return entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
}

export interface CollectedFile {
  handle: FileSystemFileHandle;
  path: string;
}

export interface CollectResult {
  files: CollectedFile[];
  /** Subfolders that couldn't be read (usually missing permission). */
  failedSubdirs: number;
  /** The walk hit the time limit; `files` holds what was found so far. */
  timedOut: boolean;
}

// Recursively collects the vault's markdown files for indexing. Skips
// node_modules/vendor (never vaults, can be huge) and dotfolders unless
// `includeHidden`, in which case non-.md files inside dotfolders (e.g.
// .hermes/index.yaml) are included too. Gives up after `timeoutMs` so a
// huge tree can never pin the indexer.
export async function collectVaultFiles(
  root: FileSystemDirectoryHandle,
  includeHidden: boolean,
  timeoutMs = 60000,
): Promise<CollectResult> {
  const files: CollectedFile[] = [];
  let failedSubdirs = 0;

  const isIgnoredDir = (name: string) =>
    name === "node_modules" || name === "vendor" || (!includeHidden && name.startsWith("."));
  const isInHiddenDir = (path: string) => path.split("/").some((seg) => seg.startsWith("."));

  async function walk(dirHandle: FileSystemDirectoryHandle, path = "") {
    try {
      for await (const entry of (dirHandle as any).values()) {
        const currentPath = path ? `${path}/${entry.name}` : entry.name;
        if (entry.kind === "file" && (entry.name.endsWith(".md") || (includeHidden && isInHiddenDir(currentPath)))) {
          files.push({ handle: entry as FileSystemFileHandle, path: currentPath });
        } else if (entry.kind === "directory" && !isIgnoredDir(entry.name)) {
          await walk(entry as FileSystemDirectoryHandle, currentPath);
        }
      }
    } catch (err: any) {
      console.warn(`Failed to collect files from ${path || "root"}:`, err);
      if (path) failedSubdirs++;
    }
  }

  let timedOut = false;
  await Promise.race([
    walk(root),
    new Promise<void>((resolve) => setTimeout(() => { timedOut = true; resolve(); }, timeoutMs)),
  ]);
  return { files, failedSubdirs, timedOut };
}

// Reads collected files for the metadata worker (file permissions are scoped
// to the main thread, so the worker gets contents, not handles). Unreadable
// files are skipped.
export async function readFilesForIndexing(files: CollectedFile[]) {
  const read = await Promise.all(
    files.map(async (f) => {
      try {
        const file = await f.handle.getFile();
        return { path: f.path, name: f.handle.name, content: await file.text(), modifiedAt: file.lastModified };
      } catch {
        return null;
      }
    }),
  );
  return read.filter((f): f is NonNullable<typeof f> => f !== null);
}

const EMPTY_METADATA = { tags: [], links: [], frontmatter: {}, modifiedAt: 0, wordCount: 0 };

// Metadata index entries for the collected files. With `previous`, parsed
// fields are kept and only handles refreshed (files no longer on disk drop
// out); without it, every entry starts empty (fresh vault open).
export function metadataForFiles(files: CollectedFile[], previous?: Record<string, any>): Record<string, any> {
  const next: Record<string, any> = {};
  files.forEach(({ handle, path }) => {
    next[path] = { ...(previous?.[path] || EMPTY_METADATA), path, name: handle.name, handle };
  });
  return next;
}

// Walks from the vault root to the folder containing `path` (a vault-relative
// file path, optionally prefixed with the vault name).
export async function resolveParentDirectory(
  vaultHandle: FileSystemDirectoryHandle,
  path: string,
): Promise<FileSystemDirectoryHandle> {
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === vaultHandle.name) parts.shift();
  let target = vaultHandle;
  for (const part of parts.slice(0, -1)) {
    target = await target.getDirectoryHandle(part);
  }
  return target;
}

export async function isSameDirectory(a: FileSystemDirectoryHandle, b: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    return await (a as any).isSameEntry(b);
  } catch {
    return a.name === b.name;
  }
}

// A workspace with one editor pane showing `openFilePaths`.
export function singlePaneLayout(openFilePaths: string[], activeFilePath: string | null) {
  return {
    rootContainer: {
      id: "default-pane",
      type: "editor" as const,
      openFilePaths,
      activeFilePath: activeFilePath as any,
      isPinned: false,
    },
  };
}
