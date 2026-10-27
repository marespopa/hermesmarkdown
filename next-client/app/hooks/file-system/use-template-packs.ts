"use client";

import { useCallback } from "react";
import { useStore } from "jotai";
import toast from "react-hot-toast";
import { atom_templatesFolder } from "@/app/atoms/template-atoms";
import { atom_vaultHandle, resolveFileHandleAtPath } from "@/app/atoms/vault-atoms";
import { writeFileContent } from "@/app/services/file-writer";
import { folderTemplateDisplayName } from "@/app/utils/templates/folder-template";
import { sanitizePackName } from "@/app/utils/templates/template-registry";
import type { FolderTemplate, TemplateEntry, TemplatePack } from "@/app/utils/templates/template-registry";
import { useDialog } from "../use-dialog";
import { useFileSystem } from "../use-file-system";
import { withRetry } from "./shared";
import { ensureVaultFolder } from "./unique-file";

export { sanitizePackName };

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
// duplicating copies the files into a new folder (new packs are made by the
// template wizard, with their first template), and deleting moves the folder, one template, or a folder template,
// to the vault's Trash (Undo).
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

  // Moves one template file to the vault's Trash, after asking.
  const deleteTemplate = useCallback(async (template: TemplateEntry): Promise<boolean> => {
    const vaultHandle = store.get(atom_vaultHandle);
    if (!vaultHandle) return false;
    const ok = await dialog.confirm(`Move the ${template.name} template to the Trash?`, "Delete template", "Delete", "Cancel");
    if (!ok) return false;
    try {
      await trashItems([{ handle: await resolveFileHandleAtPath(vaultHandle, template.path), path: template.path }]);
      return true;
    } catch (err) {
      console.warn("Couldn't delete template:", err);
      toast.error("Couldn't delete the template");
      return false;
    }
  }, [store, dialog, trashItems]);

  // Moves a folder template (its whole folder) to the vault's Trash, after asking.
  const deleteFolderTemplate = useCallback(async (template: FolderTemplate): Promise<boolean> => {
    const vaultHandle = store.get(atom_vaultHandle);
    if (!vaultHandle) return false;
    const name = folderTemplateDisplayName(template.name, new Date());
    const ok = await dialog.confirm(`Move the ${name} folder template to the Trash?`, "Delete folder template", "Delete", "Cancel");
    if (!ok) return false;
    try {
      await trashItems([{ handle: await folderHandle(vaultHandle, template.folder), path: template.folder }]);
      return true;
    } catch (err) {
      console.warn("Couldn't delete folder template:", err);
      toast.error("Couldn't delete the folder template");
      return false;
    }
  }, [store, dialog, trashItems]);

  return { duplicatePack, deletePack, deleteTemplate, deleteFolderTemplate };
}
