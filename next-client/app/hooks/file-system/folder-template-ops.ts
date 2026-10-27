import { writeFileContent } from "@/app/services/file-writer";
import type { FolderTemplate } from "@/app/utils/templates/template-registry";
import type { ScaffoldPlan, ScaffoldSource, ScaffoldSourceEntry } from "@/app/utils/templates/folder-template";
import { directoryAtPath, emptyDirectory, entryExists } from "./directory-ops";
import { withRetry } from "./shared";

// Disk side of folder templates (use-folder-template.ts): reads the source
// folder, writes the planned structure into a new top folder, removes it again
// on failure. No React.

// A target was already there: another writer got in first. Nothing of ours to
// roll back when it comes from the top folder check.
export class ScaffoldClashError extends Error {
  constructor(message: string, readonly beforeWrites = false) {
    super(message);
    this.name = "ScaffoldClashError";
  }
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

// Walks the folder template with fresh handles: dot entries skipped, folders
// before their contents, siblings by name. `.md` files as text, the rest as bytes.
export async function readScaffoldSource(
  vault: FileSystemDirectoryHandle,
  template: FolderTemplate,
): Promise<ScaffoldSource> {
  const root = await directoryAtPath(vault, template.folder);
  const entries: ScaffoldSourceEntry[] = [];
  const visit = async (dir: FileSystemDirectoryHandle, prefix: string): Promise<void> => {
    const children: FileSystemHandle[] = [];
    for await (const child of (dir as any).values()) {
      if (!(child as FileSystemHandle).name.startsWith(".")) children.push(child as FileSystemHandle);
    }
    children.sort(byName);
    for (const child of children.filter((c) => c.kind === "directory")) {
      const path = prefix ? `${prefix}/${child.name}` : child.name;
      entries.push({ path, kind: "folder" });
      await visit(child as FileSystemDirectoryHandle, path);
    }
    for (const child of children.filter((c) => c.kind === "file")) {
      const path = prefix ? `${prefix}/${child.name}` : child.name;
      const file = await (child as FileSystemFileHandle).getFile();
      if (child.name.toLowerCase().endsWith(".md")) entries.push({ path, kind: "file", text: await file.text() });
      else entries.push({ path, kind: "file", bytes: await file.arrayBuffer() });
    }
  };
  await visit(root, "");
  return { name: template.name, entries };
}

// Creates the plan's top folder (which must be new) and everything in it.
// Never overwrites: a file that is already there throws ScaffoldClashError.
export async function writeScaffold(
  destination: FileSystemDirectoryHandle,
  plan: Extract<ScaffoldPlan, { ok: true }>,
): Promise<{ rootReadme: FileSystemFileHandle | null }> {
  const top = await withRetry(() => destination.getDirectoryHandle(plan.topName, { create: true }));
  if (!(await (top as any).values().next()).done) {
    throw new ScaffoldClashError(`${plan.topName} already exists`, true);
  }
  let rootReadme: FileSystemFileHandle | null = null;
  for (const entry of plan.entries) {
    const segments = entry.path.split("/").slice(1);
    if (segments.length === 0) continue;
    const name = segments.pop()!;
    let dir = top;
    for (const segment of segments) dir = await withRetry(() => dir.getDirectoryHandle(segment, { create: true }));
    if (entry.kind === "folder") {
      await withRetry(() => dir.getDirectoryHandle(name, { create: true }));
      continue;
    }
    if (await entryExists(dir, name)) {
      throw new ScaffoldClashError(`${entry.path} already exists`);
    }
    const handle = await withRetry(() => dir.getFileHandle(name, { create: true }));
    const content = entry.content;
    // Never a 0-byte note: Google Drive hangs syncing those.
    await withRetry(() => writeFileContent(handle, content || "\n"));
    if (entry.isRootReadme) rootReadme = handle;
  }
  return { rootReadme };
}

// Removes the top folder and what was written into it. False when cleanup failed.
export async function rollbackScaffold(destination: FileSystemDirectoryHandle, topName: string): Promise<boolean> {
  try {
    const top = await destination.getDirectoryHandle(topName);
    await emptyDirectory(top);
    await (destination as any).removeEntry(topName);
    return true;
  } catch (err: any) {
    if (err?.name === "NotFoundError") return true;
    console.warn("Failed to remove a partly created folder template:", err);
    return false;
  }
}
