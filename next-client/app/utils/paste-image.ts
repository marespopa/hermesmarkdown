import { withRetry } from "@/app/hooks/file-system/shared";
import { writeFileContent } from "@/app/services/file-writer";
import { isMountRoot } from "@/app/services/library-roots";

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

// Writes a pasted/dropped image into the `assets/` folder at the root of the
// folder the note is in (the vault's, or for a library's added folder, that
// folder's own, so it still works opened anywhere else) and returns the
// markdown-relative path from the open note's directory to that file (e.g.
// "assets/foo.png" for a root-level note, "../assets/foo.png" for a note one
// folder deep).
export async function savePastedImage(
  vaultHandle: FileSystemDirectoryHandle,
  currentDirectoryHandle: FileSystemDirectoryHandle | null,
  blob: Blob,
): Promise<string> {
  // The note's folder as path segments from the library's root; [] at the root.
  let segments: string[] = [];
  if (currentDirectoryHandle && currentDirectoryHandle !== vaultHandle) {
    try {
      segments = (await (vaultHandle as any).resolve(currentDirectoryHandle)) ?? [];
    } catch (e) {
      console.warn("Failed to resolve relative path for pasted image:", e);
    }
  }
  const mount = segments.length > 0 && isMountRoot(segments[0]) ? segments[0] : null;
  const folderRoot = mount ? await vaultHandle.getDirectoryHandle(mount) : vaultHandle;
  const depth = mount ? segments.length - 1 : segments.length;

  const assetsHandle = await withRetry(() =>
    folderRoot.getDirectoryHandle("assets", { create: true }),
  );
  const fileName = generateImageFileName(blob);
  const fileHandle = await withRetry(() =>
    assetsHandle.getFileHandle(fileName, { create: true }),
  );
  await withRetry(() => writeFileContent(fileHandle, blob));
  return `${"../".repeat(depth)}assets/${fileName}`;
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
