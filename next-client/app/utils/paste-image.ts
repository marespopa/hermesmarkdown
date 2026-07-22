import { withRetry } from "@/app/hooks/file-system/shared";

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/bmp": "bmp",
};

function extensionForBlob(blob: Blob): string {
  return MIME_TO_EXT[blob.type] || "png";
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function generateImageFileName(blob: Blob): string {
  const now = new Date();
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = Math.random().toString(36).slice(2, 6);
  return `image-${stamp}-${rand}.${extensionForBlob(blob)}`;
}

// Writes a pasted/dropped image into a single vault-root `assets/` folder
// and returns the markdown-relative path from the currently open note's
// directory to that file (e.g. "assets/foo.png" for a root-level note,
// "../assets/foo.png" for a note one folder deep).
export async function savePastedImage(
  vaultHandle: FileSystemDirectoryHandle,
  currentDirectoryHandle: FileSystemDirectoryHandle | null,
  blob: Blob,
): Promise<string> {
  const assetsHandle = await withRetry(() =>
    vaultHandle.getDirectoryHandle("assets", { create: true }),
  );
  const fileName = generateImageFileName(blob);
  const fileHandle = await withRetry(() =>
    assetsHandle.getFileHandle(fileName, { create: true }),
  );
  await withRetry(async () => {
    const writable = await (fileHandle as any).createWritable();
    await writable.write(blob);
    await writable.close();
  });

  let isRoot = !currentDirectoryHandle;
  if (currentDirectoryHandle) {
    try {
      isRoot = await (vaultHandle as any).isSameEntry(currentDirectoryHandle);
    } catch {
      isRoot = vaultHandle.name === currentDirectoryHandle.name;
    }
  }
  if (isRoot) return `assets/${fileName}`;

  try {
    const segments: string[] = await (vaultHandle as any).resolve(currentDirectoryHandle);
    if (segments) return `${"../".repeat(segments.length)}assets/${fileName}`;
  } catch (e) {
    console.warn("Failed to resolve relative path for pasted image:", e);
  }
  return `assets/${fileName}`;
}

const REGEX_ABSOLUTE_SRC = /^(https?:|data:|blob:)/i;

// Vault-relative image paths (e.g. "assets/foo.png", "../assets/foo.png")
// have no server behind them — a plain <img src="assets/foo.png"> can't
// load anything in the browser. Milkdown's image NodeView (image-view.ts)
// calls this to turn such a path into a `blob:` URL via the File System
// Access API, mirroring savePastedImage's directory-walk in reverse.
// Cached per resolved absolute path (module-level, for the session) so the
// same image referenced from multiple notes/positions doesn't re-read the
// file or mint a new blob URL each time.
const resolvedImageCache = new Map<string, Promise<string | null>>();

export async function resolveVaultImageSrc(
  vaultHandle: FileSystemDirectoryHandle,
  currentDirectoryHandle: FileSystemDirectoryHandle | null,
  src: string,
): Promise<string | null> {
  if (REGEX_ABSOLUTE_SRC.test(src)) return src;

  let baseSegments: string[] = [];
  if (currentDirectoryHandle) {
    try {
      const isRoot = await (vaultHandle as any).isSameEntry(currentDirectoryHandle);
      if (!isRoot) baseSegments = (await (vaultHandle as any).resolve(currentDirectoryHandle)) || [];
    } catch {
      // Treat as root if resolution fails.
    }
  }

  const segments = [...baseSegments];
  for (const part of src.split("/").filter(Boolean)) {
    if (part === "..") segments.pop();
    else if (part !== ".") segments.push(part);
  }
  const fileName = segments.pop();
  if (!fileName) return null;

  const cacheKey = [...segments, fileName].join("/");
  const cached = resolvedImageCache.get(cacheKey);
  if (cached) return cached;

  const promise = (async () => {
    try {
      let dir: FileSystemDirectoryHandle = vaultHandle;
      for (const seg of segments) dir = await dir.getDirectoryHandle(seg);
      const fileHandle = await dir.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      return URL.createObjectURL(file);
    } catch (err) {
      console.warn("Failed to resolve image:", cacheKey, err);
      return null;
    }
  })();
  resolvedImageCache.set(cacheKey, promise);
  return promise;
}

// Clipboard/DataTransfer items also fire for copied text, files of other
// kinds, etc. — callers must filter to images before invoking savePastedImage.
export function getImageFile(data: DataTransfer | null): File | null {
  if (!data) return null;
  for (const item of Array.from(data.files)) {
    if (item.type.startsWith("image/")) return item;
  }
  return null;
}

export function getImageFromClipboardItems(items: DataTransferItemList | null): File | null {
  if (!items) return null;
  for (const item of Array.from(items)) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      return item.getAsFile();
    }
  }
  return null;
}
