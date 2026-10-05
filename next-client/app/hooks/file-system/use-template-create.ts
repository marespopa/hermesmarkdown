"use client";

import { useCallback } from "react";
import { useStore } from "jotai";
import toast from "react-hot-toast";
import { atom_vaultHandle, resolveFileHandleAtPath } from "@/app/atoms/vault-atoms";
import { atom_newNoteFolder, atom_pendingScrollTarget } from "@/app/atoms/ui-atoms";
import { atom_templates, atom_templatesFolder } from "@/app/atoms/template-atoms";
import { writeFileContent } from "@/app/services/file-writer";
import { useDialog } from "../use-dialog";
import { useTemplateDialog } from "../use-template-dialog";
import { withRetry } from "./shared";
import { createUniqueFile, ensureVaultFolder, normalizeFolderPath } from "./unique-file";
import { useTemplateNotes } from "./use-template-notes";
import {
  matchTemplateForFolder,
  parseMissingLink,
  sanitizeNoteName,
  sanitizeTemplateFileName,
} from "@/app/utils/templates/template-registry";
import { offsetToLineColumn, type ExpandedTemplate } from "@/app/utils/templates/template-tokens";

interface UseTemplateCreateProps {
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
  indexVaultTags: (passedHandle?: FileSystemDirectoryHandle) => Promise<void>;
  openFile: (fileHandle: FileSystemFileHandle, providedPath?: string, force?: boolean) => Promise<void>;
}

const BLANK_NOTE: ExpandedTemplate = { text: "\n", cursor: null };
const joinPath = (folder: string, name: string) => (folder ? `${folder}/${name}` : name);

// Fresh handle for a vault path, or null when it doesn't exist.
export async function findExisting(vaultHandle: FileSystemDirectoryHandle, path: string) {
  try {
    return await resolveFileHandleAtPath(vaultHandle, path);
  } catch (err: any) {
    if (err?.name === "NotFoundError" || err?.name === "TypeMismatchError") return null;
    throw err;
  }
}

function reportCreateError(err: any) {
  console.warn("File System Error:", err?.message || err);
  const isInvalidState = err?.name === "InvalidStateError" || err?.message?.includes("state cached");
  toast.error(isInvalidState ? "Google Drive is syncing. Please wait a moment and try again." : "Failed to create file");
}

// Note creation from templates: clicking a missing [[link]] (the link decides
// the path) and the palette's "New note from template…" (the template's
// target_folder / file_name decide). Also "New template…", which creates a
// template file with a starter body.
export function useTemplateCreate({ scanVault, indexVaultTags, openFile }: UseTemplateCreateProps) {
  const store = useStore();
  const dialog = useDialog();
  const { pickTemplate, pickStarter } = useTemplateDialog();
  const { readTemplate, instantiate } = useTemplateNotes();

  // Writes `<folder>/<baseName>.md`, rescans, opens it and puts the caret at
  // `{{cursor}}`. `unique` adds ` (1)`… on a name clash; otherwise an existing
  // file on disk is opened unchanged (what's on disk wins) and `onExisting`
  // is told its path.
  const writeNewNote = useCallback(async (
    folder: string,
    baseName: string,
    expanded: ExpandedTemplate,
    { unique, onExisting }: { unique: boolean; onExisting?: (path: string) => void },
  ) => {
    const vaultHandle = store.get(atom_vaultHandle);
    if (!vaultHandle) return;
    try {
      if (!unique) {
        const existingPath = joinPath(folder, `${baseName}.md`);
        const existing = await findExisting(vaultHandle, existingPath);
        if (existing) {
          await openFile(existing, existingPath, true);
          onExisting?.(existingPath);
          return;
        }
      }
      const dir = await ensureVaultFolder(vaultHandle, folder);
      const { handle, fileName } = unique
        ? await createUniqueFile(dir, baseName)
        : { handle: await withRetry(() => dir.getFileHandle(`${baseName}.md`, { create: true })), fileName: `${baseName}.md` };
      // Never a 0-byte file: Google Drive hangs syncing those.
      await withRetry(() => writeFileContent(handle, expanded.text || "\n"));
      const path = joinPath(folder, fileName);
      await scanVault(vaultHandle);
      await indexVaultTags();
      await openFile(handle, path, true);
      if (expanded.cursor !== null) {
        store.set(atom_pendingScrollTarget, { path, ...offsetToLineColumn(expanded.text, expanded.cursor) });
      }
      toast.success(`Created: ${path}`);
    } catch (err) {
      reportCreateError(err);
    }
  }, [store, scanVault, indexVaultTags, openFile]);

  // Template text for a picked entry, or null (read failed: toast shown).
  const readOrReport = useCallback(async (entry: Parameters<typeof readTemplate>[0]) => {
    try {
      return await readTemplate(entry);
    } catch (err: any) {
      console.warn("Failed to read template:", err?.message || err);
      toast.error(`Couldn't read template ${entry.name}`);
      return null;
    }
  }, [readTemplate]);

  const createNoteFromMissingLink = useCallback(async (link: string) => {
    const vaultHandle = store.get(atom_vaultHandle);
    const shown = link.split("|")[0].trim();
    if (!vaultHandle) {
      toast.error(`File not found: ${shown}`);
      return;
    }
    const parsed = parseMissingLink(link);
    if (!parsed) {
      toast.error(`Can't create a note named "${shown}"`);
      return;
    }
    // The link decides the path: its own folder (vault-root relative), else the New Notes Folder.
    const folder = parsed.folder ?? normalizeFolderPath(store.get(atom_newNoteFolder));
    const notePath = joinPath(folder, `${parsed.baseName}.md`);
    try {
      const existing = await findExisting(vaultHandle, notePath);
      if (existing) {
        await scanVault(vaultHandle);
        await openFile(existing, notePath, true);
        return;
      }
    } catch (err) {
      reportCreateError(err);
      return;
    }

    const display = joinPath(parsed.folder ?? "", parsed.baseName);
    const match = parsed.folder
      ? matchTemplateForFolder(parsed.folder.split("/").pop()!, store.get(atom_templates))
      : null;
    let expanded = BLANK_NOTE;
    if (match) {
      const ok = await dialog.confirm(`Create ${display} from template ${match.name}?`, "New note", "Create", "Cancel");
      if (!ok) return;
    }
    const chosen = match ?? (await pickTemplate({ includeBlank: true, title: `New note: ${display}` }));
    if (!chosen) return;
    if (chosen !== "blank") {
      const raw = await readOrReport(chosen);
      if (raw === null) return;
      // Template routing keys are ignored here: the link already decided the path.
      const result = await instantiate(raw, parsed.baseName, "Create");
      if (!result) return;
      expanded = result.expanded;
    }
    await writeNewNote(folder, parsed.baseName, expanded, { unique: false });
  }, [store, dialog, pickTemplate, readOrReport, instantiate, writeNewNote, scanVault, openFile]);

  const createNoteFromTemplate = useCallback(async () => {
    if (!store.get(atom_vaultHandle)) return;
    const chosen = await pickTemplate({ includeBlank: false, title: "New note from template" });
    if (!chosen || chosen === "blank") return;
    const title = String((await dialog.prompt("Note title:", "", "New note from template")) ?? "").trim();
    if (!title) return;
    const raw = await readOrReport(chosen);
    if (raw === null) return;
    const result = await instantiate(raw, title, "Create");
    if (!result) return;
    const folder =
      normalizeFolderPath(result.routing.targetFolder ?? "") || normalizeFolderPath(store.get(atom_newNoteFolder));
    const baseName = sanitizeNoteName(result.routing.fileName || title);
    await writeNewNote(folder, baseName, result.expanded, { unique: true });
  }, [store, dialog, pickTemplate, readOrReport, instantiate, writeNewNote]);

  // "New template…": pick a starter, then `<templates folder>/<name>.md` with
  // its raw body. The name prompt is prefilled from the starter. A
  // template with the same name (any case) is opened unchanged instead.
  const createTemplate = useCallback(async () => {
    const vaultHandle = store.get(atom_vaultHandle);
    if (!vaultHandle) return;
    const starter = await pickStarter();
    if (!starter) return;
    const name = String((await dialog.prompt("Template name:", starter.suggestedName, "New template")) ?? "").trim();
    if (!name) return;
    const baseName = sanitizeTemplateFileName(name).slice(0, -".md".length);
    const folder = store.get(atom_templatesFolder).folder;
    const openedExisting = (path: string) => toast.success(`Opened existing template: ${path}`);
    // The registry check catches `RFC` vs `rfc.md` on case-sensitive backends (OPFS).
    const indexed = store.get(atom_templates).find((t) => t.name.toLowerCase() === baseName.toLowerCase());
    if (indexed) {
      try {
        const handle = await findExisting(vaultHandle, indexed.path);
        if (handle) {
          await openFile(handle, indexed.path, true);
          openedExisting(indexed.path);
          return;
        }
      } catch (err) {
        reportCreateError(err);
        return;
      }
      // A stale index entry falls through to the create.
    }
    await writeNewNote(folder, baseName, { text: starter.body, cursor: null }, {
      unique: false,
      onExisting: openedExisting,
    });
  }, [store, dialog, pickStarter, openFile, writeNewNote]);

  return { writeNewNote, createNoteFromMissingLink, createNoteFromTemplate, createTemplate };
}
