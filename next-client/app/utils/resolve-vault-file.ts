// Resolves a markdown image path (relative to the currently open note, may
// include "../" segments) back to a FileSystemFileHandle inside the vault.
// Mirrors the inverse of the path-building logic in app/utils/paste-image.ts.
export async function resolveVaultFileHandle(
  vaultHandle: FileSystemDirectoryHandle,
  currentDirectoryHandle: FileSystemDirectoryHandle | null,
  relativePath: string,
): Promise<FileSystemFileHandle> {
  let baseSegments: string[] = [];
  if (currentDirectoryHandle) {
    let isRoot = false;
    try {
      isRoot = await (vaultHandle as any).isSameEntry(currentDirectoryHandle);
    } catch {
      isRoot = vaultHandle.name === currentDirectoryHandle.name;
    }
    if (!isRoot) {
      baseSegments = (await (vaultHandle as any).resolve(currentDirectoryHandle)) ?? [];
    }
  }

  const segments = [...baseSegments];
  for (const part of relativePath.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") segments.pop();
    else segments.push(part);
  }

  const fileName = segments.pop();
  if (!fileName) throw new Error("Invalid image path");

  let dir: FileSystemDirectoryHandle = vaultHandle;
  for (const segment of segments) {
    dir = await (dir as any).getDirectoryHandle(segment);
  }
  return (dir as any).getFileHandle(fileName);
}
