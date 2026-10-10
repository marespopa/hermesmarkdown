"use client";

import { useCallback } from "react";
import { useStore } from "jotai";
import toast from "react-hot-toast";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_vaultHandle, resolveFileHandleAtPath } from "@/app/atoms/vault-atoms";
import { atom_newNoteFolder, atom_pendingScrollTarget, atom_todayFolder } from "@/app/atoms/ui-atoms";
import { atom_templates, atom_templatesFolder } from "@/app/atoms/template-atoms";
import { writeFileContent } from "@/app/services/file-writer";
import { useDialog } from "../use-dialog";
import { useTemplateDialog } from "../use-template-dialog";
import { withRetry } from "./shared";
import { createUniqueFile, ensureVaultFolder, normalizeFolderPath } from "./unique-file";
import { useTemplateNotes } from "./use-template-notes";
import {
  matchTemplateForFolder,
  matchTemplateForName,
  parseMissingLink,
  sanitizeNoteName,
  sanitizeTemplateFileName,
  type TemplateEntry,
} from "@/app/utils/templates/template-registry";
import { offsetToLineColumn, type ExpandedTemplate } from "@/app/utils/templates/template-tokens";
import { DEFAULT_TODAY_FOLDER, findTodayNote, resolveTodayFolder, todayNoteHeading, todayNoteName } from "@/app/utils/today-note";

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
  // is told its path. With `open: false` nothing is opened and no toast is
  // shown (Quick jot). Resolves to the note's path and a fresh handle, or
  // null on error.
  const writeNewNote = useCallback(async (
    folder: string,
    baseName: string,
    expanded: ExpandedTemplate,
    { unique, onExisting, open = true }: { unique: boolean; onExisting?: (path: string) => void; open?: boolean },
  ): Promise<{ path: string; handle: FileSystemFileHandle } | null> => {
    const vaultHandle = store.get(atom_vaultHandle);
    if (!vaultHandle) return null;
    try {
      if (!unique) {
        const existingPath = joinPath(folder, `${baseName}.md`);
        const existing = await findExisting(vaultHandle, existingPath);
        if (existing) {
          if (open) await openFile(existing, existingPath, true);
          onExisting?.(existingPath);
          return { path: existingPath, handle: existing };
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
      if (open) {
        await openFile(handle, path, true);
        if (expanded.cursor !== null) {
          store.set(atom_pendingScrollTarget, { path, ...offsetToLineColumn(expanded.text, expanded.cursor) });
        }
        toast.success(`Created: ${path}`);
      }
      return { path, handle };
    } catch (err) {
      reportCreateError(err);
      return null;
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

  // Today's worklog sheet (`<date>.md`): found in the index (in the Daily
  // Sheets folder, else anywhere), otherwise created in that folder — asked
  // for the first time, with `{{year}}` / `{{month}}` allowed — from a
  // journal-like template when one exists, else as a dated heading with the
  // caret below it. A sheet on disk that the index hasn't seen yet is used
  // unchanged. `open` opens it (Today's sheet); Quick jot only needs it to
  // exist. Null when a prompt was cancelled or the write failed.
  const resolveTodayNote = useCallback(async (now: Date, open: boolean) => {
    if (!store.get(atom_vaultHandle)) return null;
    let pattern = store.get(atom_todayFolder);
    const folderFor = (value: string | null) =>
      normalizeFolderPath(value === null ? store.get(atom_newNoteFolder) : resolveTodayFolder(value, now));
    const baseName = todayNoteName(now);
    const text = `# ${todayNoteHeading(now)}\n\n`;
    const dated: ExpandedTemplate = { text, cursor: text.length };
    const existingPath = findTodayNote(Object.keys(store.get(atom_fileMetadata)), now, folderFor(pattern));
    if (existingPath) {
      // Used as is; the dated sheet is only written if the file is gone.
      const folder = existingPath.split("/").slice(0, -1).join("/");
      return writeNewNote(folder, baseName, dated, { unique: false, open });
    }
    if (pattern === null) {
      const answer = await dialog.prompt(
        "Folder for daily sheets. {{year}} and {{month}} make one per year or month; leave empty for the vault root. Change it later in Settings → Files.",
        DEFAULT_TODAY_FOLDER,
        "Today's sheet",
      );
      if (answer === null || answer === undefined) return null;
      pattern = normalizeFolderPath(String(answer));
      store.set(atom_todayFolder, pattern);
    }
    const folder = folderFor(pattern);
    // The folder setting decides the path; a template only gives the body.
    const template = matchTemplateForName(baseName, store.get(atom_templates));
    if (template) {
      const raw = await readOrReport(template);
      if (raw === null) return null;
      const result = await instantiate(raw, baseName, "Create");
      if (!result) return null;
      return writeNewNote(folder, baseName, result.expanded, { unique: false, open });
    }
    return writeNewNote(folder, baseName, dated, { unique: false, open });
  }, [store, dialog, readOrReport, instantiate, writeNewNote]);

  const openTodayNote = useCallback(
    (now: Date = new Date()) => resolveTodayNote(now, true).then(() => undefined),
    [resolveTodayNote],
  );
  // Today's sheet, created if needed, without opening it: `{ path, handle }`
  // or null (cancelled or failed).
  const ensureTodayNote = useCallback((now: Date = new Date()) => resolveTodayNote(now, false), [resolveTodayNote]);

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

  // The WikiLink dialog's "From template": creates the linked note from
  // `entry` and returns its link path (no `.md`), or null. The name decides the
  // note's name and, with a folder in it, the folder; otherwise the template's
  // target_folder, else the New Notes folder. A clash gets ` (1)`, and the
  // link follows. The note isn't opened, like "Create and link".
  const createLinkedNoteFromTemplate = useCallback(async (name: string, entry: TemplateEntry): Promise<string | null> => {
    const vaultHandle = store.get(atom_vaultHandle);
    if (!vaultHandle) return null;
    const parsed = parseMissingLink(name);
    if (!parsed) {
      toast.error(`Can't create a note named "${name.trim()}"`);
      return null;
    }
    const raw = await readOrReport(entry);
    if (raw === null) return null;
    const result = await instantiate(raw, parsed.baseName, "Create");
    if (!result) return null;
    const folder = parsed.folder
      ?? (normalizeFolderPath(result.routing.targetFolder ?? "") || normalizeFolderPath(store.get(atom_newNoteFolder)));
    try {
      const dir = await ensureVaultFolder(vaultHandle, folder);
      const { handle, fileName } = await createUniqueFile(dir, parsed.baseName);
      // Never a 0-byte file: Google Drive hangs syncing those.
      await withRetry(() => writeFileContent(handle, result.expanded.text || "\n"));
      await scanVault(vaultHandle);
      await indexVaultTags();
      const path = joinPath(folder, fileName);
      toast.success(`Created: ${path}`);
      return path.replace(/\.md$/, "");
    } catch (err) {
      reportCreateError(err);
      return null;
    }
  }, [store, readOrReport, instantiate, scanVault, indexVaultTags]);

  return { writeNewNote, createNoteFromMissingLink, createNoteFromTemplate, createTemplate, createLinkedNoteFromTemplate, openTodayNote, ensureTodayNote };
}
