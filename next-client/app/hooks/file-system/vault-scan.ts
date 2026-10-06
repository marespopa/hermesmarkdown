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

// Saving through a picked folder on Chrome for Android can leave an empty
// `document` folder at the vault root (from the storage URI path it writes
// through). It is hidden while it holds nothing visible; a `document` folder
// with notes or subfolders in it is the user's own and always shows.
export async function isStrayDocumentFolder(entry: FileSystemHandle, parentPath: string): Promise<boolean> {
  if (parentPath || entry.kind !== "directory" || entry.name !== "document") return false;
  try {
    for await (const child of (entry as any).values() as AsyncIterable<FileSystemHandle>) {
      if (!child.name.startsWith(".")) return false;
    }
    return true;
  } catch {
    return false;
  }
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
    } else if (
      entry.kind === "directory" &&
      (includeHidden || !entry.name.startsWith(".")) &&
      !(await isStrayDocumentFolder(entry, dirPath))
    ) {
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
  /** Every folder walked (vault-relative paths), empty ones included. */
  folders: string[];
  /** Subfolders that couldn't be read (usually missing permission). */
  failedSubdirs: number;
  /** The walk hit the time limit; `files` holds what was found so far. */
  timedOut: boolean;
}

// Never walked, even with hidden files shown: version control, dependency
// and cache folders hold no notes and can be huge.
const SKIPPED_DIRS = new Set(["node_modules", "vendor", ".git", ".svn", ".hg", "__pycache__", ".venv", ".cache", ".Trash"]);
// The one hidden folder whose non-Markdown files are vault data (index.yaml,
// schema.yaml, …). Other dotfolders (.obsidian, .vscode, …) only add notes.
const VAULT_DATA_DIR = ".hermes";
// Folders listed at once; the walk is bound by per-folder listing latency.
const WALK_CONCURRENCY = 8;

// Secrets-style files (.env, .env.local, …) are never read or indexed.
export function isSecretFile(name: string): boolean {
  return /^\.env(\..*)?$/i.test(name);
}

// Recursively collects the vault's markdown files for indexing, and the
// folders walked for the file tree, listing up to WALK_CONCURRENCY folders
// at once. Skips SKIPPED_DIRS and dotfolders
// unless `includeHidden`, in which case non-.md files in .hermes/ (e.g.
// .hermes/index.yaml) are included too. Secret files never are. Gives up
// after `timeoutMs` so a huge tree can never pin the indexer.
export async function collectVaultFiles(
  root: FileSystemDirectoryHandle,
  includeHidden: boolean,
  timeoutMs = 60000,
): Promise<CollectResult> {
  const files: CollectedFile[] = [];
  const folders: string[] = [];
  let failedSubdirs = 0;
  let timedOut = false;
  let finished = false;

  const isIgnoredDir = (name: string) => SKIPPED_DIRS.has(name) || (!includeHidden && name.startsWith("."));
  const isWanted = (name: string, path: string) =>
    !isSecretFile(name) &&
    (name.endsWith(".md") || (includeHidden && path.split("/")[0] === VAULT_DATA_DIR));

  async function listDir(dirHandle: FileSystemDirectoryHandle, path: string, queue: Array<[FileSystemDirectoryHandle, string]>) {
    try {
      for await (const entry of (dirHandle as any).values()) {
        if (finished) return;
        const currentPath = path ? `${path}/${entry.name}` : entry.name;
        if (entry.kind === "file" && isWanted(entry.name, currentPath)) {
          files.push({ handle: entry as FileSystemFileHandle, path: currentPath });
        } else if (
          entry.kind === "directory" &&
          !isIgnoredDir(entry.name) &&
          !(await isStrayDocumentFolder(entry, path))
        ) {
          if (finished) return;
          folders.push(currentPath);
          queue.push([entry as FileSystemDirectoryHandle, currentPath]);
        }
      }
    } catch (err: any) {
      console.warn(`Failed to collect files from ${path || "root"}:`, err);
      if (path) failedSubdirs++;
    }
  }

  await new Promise<void>((resolve) => {
    const queue: Array<[FileSystemDirectoryHandle, string]> = [[root, ""]];
    let head = 0;
    let active = 0;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      timedOut = true;
      finish();
    }, timeoutMs);
    const pump = () => {
      while (!finished && active < WALK_CONCURRENCY && head < queue.length) {
        const [dirHandle, path] = queue[head++];
        active++;
        listDir(dirHandle, path, queue).then(() => {
          active--;
          if (active === 0 && head >= queue.length) finish();
          else pump();
        });
      }
    };
    pump();
  });
  // A copy: listings still in flight after a timeout must not change it.
  return { files: files.slice(), folders: folders.slice(), failedSubdirs, timedOut };
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
