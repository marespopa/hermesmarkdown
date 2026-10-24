import { entryExists, moveDirectoryByCopy } from "@/app/hooks/file-system/directory-ops";
import { writeFileContent } from "@/app/services/file-writer";

// The vault's own data folder: pins (`pins.yaml`), the Trash (`trash/`) and
// AI skill overrides (`skills/`). Hidden like any dotfolder, synced with a
// GitHub vault, never indexed as notes.
export const VAULT_DATA_DIR = ".hermesmarkdown";
// Its name before 2026-10-24. Other tools (Hermes Agent) use a `.hermes/`
// folder too, so only HermesMarkdown's own entries are moved out of it.
export const LEGACY_VAULT_DATA_DIR = ".hermes";
const LEGACY_ENTRIES = ["pins.yaml", "trash", "skills/create-template.md", "skills/tasks.md"];

export function isVaultDataPath(path: string): boolean {
  return path === VAULT_DATA_DIR || path.startsWith(`${VAULT_DATA_DIR}/`);
}

async function childDirectory(dir: FileSystemDirectoryHandle, name: string, create = false): Promise<FileSystemDirectoryHandle | null> {
  try {
    return await dir.getDirectoryHandle(name, { create });
  } catch {
    return null;
  }
}

// A file into another folder: written there first, then removed here.
async function moveFile(sourceParent: FileSystemDirectoryHandle, targetParent: FileSystemDirectoryHandle, name: string): Promise<void> {
  const bytes = await (await (await sourceParent.getFileHandle(name)).getFile()).arrayBuffer();
  await writeFileContent(await targetParent.getFileHandle(name, { create: true }), bytes);
  await (sourceParent as any).removeEntry(name);
}

async function isEmpty(dir: FileSystemDirectoryHandle): Promise<boolean> {
  for await (const _entry of (dir as any).values()) return false;
  return true;
}

// Moves HermesMarkdown's entries from `.hermes/` to `.hermesmarkdown/` when a
// vault is opened, once: an entry already in the new folder is kept and the
// old one left alone. `.hermes/` (and its `skills/`) are removed only when
// nothing else is left in them. Never throws: a vault that can't be migrated
// opens as it is.
export async function migrateVaultDataDir(vault: FileSystemDirectoryHandle): Promise<void> {
  try {
    const legacy = await childDirectory(vault, LEGACY_VAULT_DATA_DIR);
    if (!legacy) return;
    for (const path of LEGACY_ENTRIES) {
      const parts = path.split("/");
      const name = parts.pop()!;
      let sourceParent: FileSystemDirectoryHandle | null = legacy;
      for (const part of parts) sourceParent = sourceParent && await childDirectory(sourceParent, part);
      if (!sourceParent || !(await entryExists(sourceParent, name))) continue;

      let targetParent: FileSystemDirectoryHandle | null = await childDirectory(vault, VAULT_DATA_DIR, true);
      for (const part of parts) targetParent = targetParent && await childDirectory(targetParent, part, true);
      if (!targetParent || await entryExists(targetParent, name)) continue;

      const directory = await childDirectory(sourceParent, name);
      if (directory) await moveDirectoryByCopy(directory, sourceParent, targetParent, name);
      else await moveFile(sourceParent, targetParent, name);
    }
    const skills = await childDirectory(legacy, "skills");
    if (skills && await isEmpty(skills)) await (legacy as any).removeEntry("skills");
    if (await isEmpty(legacy)) await (vault as any).removeEntry(LEGACY_VAULT_DATA_DIR);
  } catch (err) {
    console.warn("Failed to move the vault's data folder to .hermesmarkdown:", err);
  }
}
