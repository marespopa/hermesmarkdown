"use client";

import { useCallback } from "react";
import { useStore } from "jotai";
import toast from "react-hot-toast";
import { atom_templatesFolder } from "@/app/atoms/template-atoms";
import { atom_vaultHandle, resolveFileHandleAtPath } from "@/app/atoms/vault-atoms";
import { writeFileContent } from "@/app/services/file-writer";
import type { BuiltinPack } from "@/app/utils/templates/template-packs";
import type { TemplatePack } from "@/app/utils/templates/template-registry";
import { useDialog } from "../use-dialog";
import { useFileSystem } from "../use-file-system";
import { withRetry } from "./shared";
import { ensureVaultFolder } from "./unique-file";
import { findExisting } from "./use-template-create";

// A pack's folder name: one path segment, no leading dots (hidden folders
// aren't indexed), no characters file systems reject. Empty when nothing is left.
export function sanitizePackName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "-").trim().replace(/^\.+/, "").trim();
}

async function folderHandle(vaultHandle: FileSystemDirectoryHandle, path: string): Promise<FileSystemDirectoryHandle> {
  let current = vaultHandle;
  for (const part of path.split("/").filter(Boolean)) current = await current.getDirectoryHandle(part);
  return current;
}

async function folderExists(vaultHandle: FileSystemDirectoryHandle, path: string): Promise<boolean> {
  try {
    await folderHandle(vaultHandle, path);
    return true;
  } catch {
    return false;
  }
}

// The Templates page's pack actions. A pack is a subfolder of the templates
// folder (template-registry.ts), so every action is a plain file operation:
// adding a built-in pack writes its templates there (never over a file that
// exists), a new pack is an empty folder, duplicating copies the files into
// a new folder, and deleting moves the folder to the vault's Trash (Undo).
export function useTemplatePacks() {
  const store = useStore();
  const dialog = useDialog();
  const { scanVault, indexVaultTags, trashItems } = useFileSystem();

  const refresh = useCallback(async (vaultHandle: FileSystemDirectoryHandle) => {
    await scanVault(vaultHandle);
    await indexVaultTags();
  }, [scanVault, indexVaultTags]);

  // Asks for a pack name not taken yet; null when cancelled.
  const askPackName = useCallback(async (title: string, suggested: string): Promise<string | null> => {
    const vaultHandle = store.get(atom_vaultHandle);
    if (!vaultHandle) return null;
    const answer = await dialog.prompt("Pack name:", suggested, title);
    if (answer === null || answer === undefined) return null;
    const name = sanitizePackName(String(answer));
    if (!name) return null;
    if (await folderExists(vaultHandle, `${store.get(atom_templatesFolder).folder}/${name}`)) {
      toast.error(`There's already a pack named ${name}`);
      return null;
    }
    return name;
  }, [store, dialog]);

  // Writes the pack's templates into `<templates>/<pack.name>/`, skipping
  // files that already exist (yours win). Resolves to the number written.
  const addBuiltinPack = useCallback(async (pack: BuiltinPack): Promise<number> => {
    const vaultHandle = store.get(atom_vaultHandle);
    if (!vaultHandle) return 0;
    const folder = `${store.get(atom_templatesFolder).folder}/${pack.name}`;
    let written = 0;
    try {
      const dir = await ensureVaultFolder(vaultHandle, folder);
      for (const template of pack.templates) {
        const fileName = `${template.name}.md`;
        if (await findExisting(vaultHandle, `${folder}/${fileName}`)) continue;
        const handle = await withRetry(() => dir.getFileHandle(fileName, { create: true }));
        await withRetry(() => writeFileContent(handle, template.body));
        written++;
      }
    } catch (err) {
      console.warn("Couldn't add template pack:", err);
      toast.error(`Couldn't add the ${pack.name} pack`);
    }
    if (written > 0) {
      await refresh(vaultHandle);
      toast.success(`Added ${pack.name}: ${written} template${written === 1 ? "" : "s"} in ${folder}`);
    }
    return written;
  }, [store, refresh]);

  // An empty pack folder; resolves to its name, or null.
  const createPack = useCallback(async (): Promise<string | null> => {
    const vaultHandle = store.get(atom_vaultHandle);
    const name = await askPackName("New pack", "");
    if (!vaultHandle || !name) return null;
    try {
      await ensureVaultFolder(vaultHandle, `${store.get(atom_templatesFolder).folder}/${name}`);
      await refresh(vaultHandle);
      return name;
    } catch (err) {
      console.warn("Couldn't create template pack:", err);
      toast.error("Couldn't create the pack");
      return null;
    }
  }, [store, askPackName, refresh]);

  // Copies the pack's templates (as saved on disk) into a new pack folder.
  const duplicatePack = useCallback(async (pack: TemplatePack): Promise<string | null> => {
    const vaultHandle = store.get(atom_vaultHandle);
    const name = await askPackName("Duplicate pack", `${pack.name || "Templates"} copy`);
    if (!vaultHandle || !name) return null;
    try {
      const dir = await ensureVaultFolder(vaultHandle, `${store.get(atom_templatesFolder).folder}/${name}`);
      for (const template of pack.templates) {
        const text = await (await (await resolveFileHandleAtPath(vaultHandle, template.path)).getFile()).text();
        const handle = await withRetry(() => dir.getFileHandle(template.path.split("/").pop()!, { create: true }));
        await withRetry(() => writeFileContent(handle, text || "\n"));
      }
      await refresh(vaultHandle);
      toast.success(`Duplicated as ${name}`);
      return name;
    } catch (err) {
      console.warn("Couldn't duplicate template pack:", err);
      toast.error("Couldn't duplicate the pack");
      return null;
    }
  }, [store, askPackName, refresh]);

  // Moves the pack's folder to the vault's Trash, after asking.
  const deletePack = useCallback(async (pack: TemplatePack): Promise<boolean> => {
    const vaultHandle = store.get(atom_vaultHandle);
    if (!vaultHandle || !pack.name) return false;
    const count = pack.templates.length;
    const ok = await dialog.confirm(
      `Move the ${pack.name} pack${count ? ` and its ${count} template${count === 1 ? "" : "s"}` : ""} to the Trash?`,
      "Delete pack",
      "Delete",
      "Cancel",
    );
    if (!ok) return false;
    try {
      await trashItems([{ handle: await folderHandle(vaultHandle, pack.folder), path: pack.folder }]);
      return true;
    } catch (err) {
      console.warn("Couldn't delete template pack:", err);
      toast.error("Couldn't delete the pack");
      return false;
    }
  }, [store, dialog, trashItems]);

  return { addBuiltinPack, createPack, duplicatePack, deletePack };
}
