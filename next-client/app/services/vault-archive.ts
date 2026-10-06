// Whole-vault export and import, so a vault is never tied to one browser or
// one storage kind. Export produces a zip (every browser) or a folder copy
// (Chromium). Import accepts a zip, a folder selection, or loose files, and
// never overwrites: a name clash gets a " (n)" suffix.
import { unzipSync, zipSync, type Zippable } from "fflate";
import { writeFileContent } from "./file-writer";
import { isTrashPath } from "./vault-trash";

export interface ArchiveFile {
  path: string;
  data: Uint8Array | Blob;
}

export interface ImportResult {
  imported: number;
  renamed: number;
}

// Never part of a vault's notes, and can be huge.
const IGNORED_DIRECTORIES = new Set([".git", "node_modules", "vendor", "__MACOSX"]);
const IGNORED_FILES = new Set([".DS_Store", "Thumbs.db", "desktop.ini"]);
// Already compressed; deflating again only costs time.
const STORED_EXTENSIONS = /\.(png|jpe?g|gif|webp|avif|heic|mp3|mp4|m4a|webm|zip|gz|pdf)$/i;

// Vault-relative path check: no traversal, no absolute paths, no ignored
// folders or OS clutter. Returns the clean path, or null to skip the entry.
export function sanitizeArchivePath(path: string): string | null {
  const segments = path.replace(/\\/g, "/").split("/").filter((segment) => segment && segment !== ".");
  if (segments.length === 0 || segments.some((segment) => segment === "..")) return null;
  if (segments.slice(0, -1).some((segment) => IGNORED_DIRECTORIES.has(segment))) return null;
  if (IGNORED_FILES.has(segments[segments.length - 1])) return null;
  return segments.join("/");
}

// Drops a single top-level folder every path shares (a zipped folder, or the
// picked folder's own name in a folder selection).
export function stripSharedRoot(paths: string[]): string[] {
  if (paths.length === 0) return paths;
  const first = paths[0].split("/")[0];
  const shared = paths.every((path) => path.includes("/") && path.split("/")[0] === first);
  return shared ? paths.map((path) => path.slice(first.length + 1)) : paths;
}

export async function collectArchiveFiles(root: FileSystemDirectoryHandle): Promise<ArchiveFile[]> {
  const files: ArchiveFile[] = [];

  async function walk(directory: FileSystemDirectoryHandle, parent: string) {
    for await (const entry of (directory as any).values()) {
      const path = parent ? `${parent}/${entry.name}` : entry.name;
      if (entry.kind === "directory") {
        if (!IGNORED_DIRECTORIES.has(entry.name) && !isTrashPath(path)) await walk(entry, path);
      } else if (!IGNORED_FILES.has(entry.name)) {
        files.push({ path, data: await (entry as FileSystemFileHandle).getFile() });
      }
    }
  }

  await walk(root, "");
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

async function toBytes(data: Uint8Array | Blob): Promise<Uint8Array> {
  return data instanceof Uint8Array ? data : new Uint8Array(await data.arrayBuffer());
}

function safeFolderName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "-").trim() || "vault";
}

// Entries sit under a folder named after the vault, like a zipped folder, so
// import can always strip it without eating a vault's own single top folder.
export async function createVaultZipBytes(root: FileSystemDirectoryHandle): Promise<Uint8Array> {
  const zippable: Zippable = {};
  const folder = safeFolderName(root.name);
  for (const file of await collectArchiveFiles(root)) {
    const bytes = await toBytes(file.data);
    const path = `${folder}/${file.path}`;
    zippable[path] = STORED_EXTENSIONS.test(file.path) ? [bytes, { level: 0 as const }] : bytes;
  }
  return zipSync(zippable, { level: 6 });
}

export async function createVaultZip(root: FileSystemDirectoryHandle): Promise<Blob> {
  return new Blob([(await createVaultZipBytes(root)) as BlobPart], { type: "application/zip" });
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

// The part of an Android storage document id ("primary:Notes/a.md") after
// the volume, or null when `encoded` is not one.
function documentIdPath(encoded: string): string | null {
  if (!/%3A/i.test(encoded)) return null;
  const id = decodeSegment(encoded);
  const colon = id.indexOf(":");
  return colon < 0 ? null : id.slice(colon + 1).replace(/^\/+|\/+$/g, "");
}

// Chrome on Android can report a picked folder's files by their storage URI
// path ("tree/primary%3ANotes/document/primary%3ANotes%2Fsub%2Fa.md") rather
// than a folder-relative one. Rebuilds "Notes/sub/a.md" from the document
// ids, ending in the file's real name; other paths pass through unchanged.
export function folderRelativePath(path: string, fileName: string): string {
  const segments = path.split("/");
  const marker = segments.lastIndexOf("document");
  if (marker < 0 || marker === segments.length - 1) return path;
  const documentPath = documentIdPath(segments.slice(marker + 1).join("/"));
  if (documentPath === null) return path;

  const folders = documentPath.split("/").filter(Boolean).slice(0, -1);
  const treeStart = segments.lastIndexOf("tree", marker) + 1;
  const treePath = documentIdPath(segments.slice(treeStart, marker).join("/"));
  if (treePath) {
    const treeFolders = treePath.split("/").filter(Boolean);
    const insideTree = treeFolders.every((folder, index) => folders[index] === folder);
    // Keep the picked folder's own name first, like a desktop folder pick.
    if (insideTree) folders.splice(0, treeFolders.length, ...treeFolders.slice(-1));
  }
  return [...folders, fileName].join("/");
}

// Reads what the user picked for import: .zip files are expanded, anything
// else is taken as-is using its folder-relative path when there is one.
export async function readImportSelection(selection: File[]): Promise<ArchiveFile[]> {
  const raw: ArchiveFile[] = [];
  for (const file of selection) {
    if (/\.zip$/i.test(file.name)) {
      const entries = unzipSync(new Uint8Array(await file.arrayBuffer()), {
        filter: (entry) => !entry.name.endsWith("/"),
      });
      for (const [path, data] of Object.entries(entries)) raw.push({ path, data });
    } else {
      const relativePath: string = (file as any).webkitRelativePath;
      raw.push({ path: relativePath ? folderRelativePath(relativePath, file.name) : file.name, data: file });
    }
  }

  const clean = raw
    .map((file) => ({ ...file, path: sanitizeArchivePath(file.path) }))
    .filter((file): file is ArchiveFile => file.path !== null);
  const paths = stripSharedRoot(clean.map((file) => file.path));
  return clean.map((file, index) => ({ ...file, path: paths[index] }));
}

async function fileExists(directory: FileSystemDirectoryHandle, name: string): Promise<boolean> {
  try {
    await directory.getFileHandle(name);
    return true;
  } catch (err: any) {
    if (err?.name === "NotFoundError") return false;
    // A folder with that name also counts as taken.
    if (err?.name === "TypeMismatchError") return true;
    throw err;
  }
}

// "note.md" -> "note (1).md", "note (2).md", …
export async function availableFileName(directory: FileSystemDirectoryHandle, name: string): Promise<string> {
  if (!(await fileExists(directory, name))) return name;
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const extension = dot > 0 ? name.slice(dot) : "";
  for (let counter = 1; ; counter++) {
    const candidate = `${base} (${counter})${extension}`;
    if (!(await fileExists(directory, candidate))) return candidate;
  }
}

export async function writeArchiveFiles(
  root: FileSystemDirectoryHandle,
  files: ArchiveFile[],
): Promise<ImportResult> {
  let imported = 0;
  let renamed = 0;
  for (const file of files) {
    const segments = file.path.split("/");
    const name = segments.pop()!;
    let directory = root;
    for (const segment of segments) {
      directory = await directory.getDirectoryHandle(segment, { create: true });
    }
    const target = await availableFileName(directory, name);
    if (target !== name) renamed++;
    const handle = await directory.getFileHandle(target, { create: true });
    await writeFileContent(handle, file.data);
    imported++;
  }
  return { imported, renamed };
}

// Copies the vault into a new folder named after it inside `parent`.
export async function copyVaultToDirectory(
  root: FileSystemDirectoryHandle,
  parent: FileSystemDirectoryHandle,
  folderName: string,
): Promise<{ folder: string; files: number }> {
  const base = safeFolderName(folderName);
  let folder = base;
  for (let counter = 1; ; counter++) {
    try {
      await parent.getDirectoryHandle(folder);
      folder = `${base} (${counter})`;
    } catch (err: any) {
      if (err?.name === "NotFoundError") break;
      // A file with that name also counts as taken.
      if (err?.name === "TypeMismatchError") {
        folder = `${base} (${counter})`;
        continue;
      }
      throw err;
    }
  }
  const target = await parent.getDirectoryHandle(folder, { create: true });
  const { imported } = await writeArchiveFiles(target, await collectArchiveFiles(root));
  return { folder, files: imported };
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Safari needs the URL alive until the download has started.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Opens a native file picker without a visible <input>. Resolves to [] when
// the user cancels (browsers without the "cancel" event just never resolve,
// which leaves nothing pending but this promise).
export function pickFiles(options: { accept?: string; multiple?: boolean; directory?: boolean }): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    if (options.accept) input.accept = options.accept;
    input.multiple = options.multiple ?? false;
    if (options.directory) (input as any).webkitdirectory = true;
    input.addEventListener("change", () => resolve(Array.from(input.files ?? [])));
    input.addEventListener("cancel", () => resolve([]));
    input.click();
  });
}

export function supportsDirectoryInput(): boolean {
  if (typeof document === "undefined") return false;
  // iOS reports the property but cannot pick folders.
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return !isIOS && "webkitdirectory" in document.createElement("input");
}
