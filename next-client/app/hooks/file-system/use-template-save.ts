"use client";

import { useCallback } from "react";
import { useStore } from "jotai";
import toast from "react-hot-toast";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_templates, atom_templatesFolder } from "@/app/atoms/template-atoms";
import { writeFileContent } from "@/app/services/file-writer";
import { useDialog } from "../use-dialog";
import { withRetry } from "./shared";
import { ensureVaultFolder } from "./unique-file";
import { findExisting } from "./use-template-create";
import { sanitizeTemplateFileName } from "@/app/utils/templates/template-registry";

interface UseTemplateSaveProps {
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
}

const joinPath = (folder: string, name: string) => (folder ? `${folder}/${name}` : name);

// "Save as template…": the note's text, as is, becomes
// `<templates folder>/<name>.md`. Only a name is asked (prefilled); an
// existing template of that name (any case) is replaced after a confirm. The
// note stays open; the template is a plain file to open and edit later.
export function useTemplateSave({ scanVault }: UseTemplateSaveProps) {
  const store = useStore();
  const dialog = useDialog();

  return useCallback(async (text: string, suggestedName: string): Promise<boolean> => {
    const vaultHandle = store.get(atom_vaultHandle);
    if (!vaultHandle) return false;
    const name = String((await dialog.prompt("Template name:", suggestedName, "Save as template")) ?? "").trim();
    if (!name) return false;
    const baseName = sanitizeTemplateFileName(name).slice(0, -".md".length);
    const folder = store.get(atom_templatesFolder).folder;
    const indexed = store.get(atom_templates).find((t) => t.name.toLowerCase() === baseName.toLowerCase());
    const path = indexed?.path ?? joinPath(folder, `${baseName}.md`);
    try {
      const existing = await findExisting(vaultHandle, path);
      if (existing) {
        const replace = await dialog.confirm(
          `A template named "${indexed?.name ?? baseName}" already exists. Replace it with this note?`,
          "Save as template",
          "Replace",
          "Cancel",
        );
        if (!replace) return false;
      }
      const handle = existing ?? await withRetry(async () =>
        (await ensureVaultFolder(vaultHandle, folder)).getFileHandle(`${baseName}.md`, { create: true }));
      // Never a 0-byte file: Google Drive hangs syncing those.
      await withRetry(() => writeFileContent(handle, text || "\n"));
      await scanVault(vaultHandle);
      toast.success(`Saved template: ${path}`);
      return true;
    } catch (err: any) {
      console.warn("Failed to save template:", err?.message || err);
      toast.error("Couldn't save the template");
      return false;
    }
  }, [store, dialog, scanVault]);
}
