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
import { ensureVaultFolder, normalizeFolderPath } from "./unique-file";
import { useTemplateNotes } from "./use-template-notes";
import {
  matchTemplateForName,
  parseMissingLink,
  sanitizeNoteName,
  sanitizeTemplateFileName,
  type TemplateEntry,
} from "@/app/utils/templates/template-registry";
import { splitTemplate } from "@/app/utils/templates/template-frontmatter";
import { offsetToLineColumn, usesToken, type ExpandedTemplate } from "@/app/utils/templates/template-tokens";

interface UseTemplateCreateProps {
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
  indexVaultTags: (passedHandle?: FileSystemDirectoryHandle) => Promise<void>;
  openFile: (fileHandle: FileSystemFileHandle, providedPath?: string, force?: boolean) => Promise<void>;
}

// The body "New template…" starts from.
export const NEW_TEMPLATE_BODY = "# {{title}}\n\n{{cursor}}\n";

const BLANK_NOTE: ExpandedTemplate = { text: "\n", cursor: null };
const joinPath = (folder: string, name: string) => (folder ? `${folder}/${name}` : name);

// A `file_name` that names the note by itself (a date, a week, an answer),
// not from its title: no title is asked for.
export function namesItsNote(fileName: string | undefined): boolean {
  return !!fileName?.trim() && !usesToken(fileName, "title") && !usesToken(fileName, "slug");
}

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

// Note creation from templates and links. One rule everywhere: the note goes
// in the link's folder when it has one, else the folder whose menu was used,
// else the New Notes folder; a note of that name already there is opened (or
// linked) as it is, never duplicated or overwritten. A template's file_name
// names the note, except in link flows, where the link already names it.
// Also "New template…", which creates a template file with a minimal body.
export function useTemplateCreate({ scanVault, indexVaultTags, openFile }: UseTemplateCreateProps) {
  const store = useStore();
  const dialog = useDialog();
  const { pickTemplate } = useTemplateDialog();
  const { readTemplate, instantiate } = useTemplateNotes();

  const newNotesFolder = useCallback(() => normalizeFolderPath(store.get(atom_newNoteFolder)), [store]);

  // Writes `<folder>/<baseName>.md`, rescans, opens it and puts the caret at
  // `{{cursor}}`. A file already there is opened unchanged instead (what's
  // on disk wins) and `onExisting` is told its path. With `open: false`
  // nothing is opened. Resolves to the note's path and a fresh handle, or
  // null on error.
  const writeNewNote = useCallback(async (
    folder: string,
    baseName: string,
    expanded: ExpandedTemplate,
    { onExisting, open = true }: { onExisting?: (path: string) => void; open?: boolean } = {},
  ): Promise<{ path: string; handle: FileSystemFileHandle } | null> => {
    const vaultHandle = store.get(atom_vaultHandle);
    if (!vaultHandle) return null;
    const path = joinPath(folder, `${baseName}.md`);
    try {
      const existing = await findExisting(vaultHandle, path);
      if (existing) {
        if (open) await openFile(existing, path, true);
        onExisting?.(path);
        return { path, handle: existing };
      }
      const dir = await ensureVaultFolder(vaultHandle, folder);
      const handle = await withRetry(() => dir.getFileHandle(`${baseName}.md`, { create: true }));
      // Never a 0-byte file: Google Drive hangs syncing those.
      await withRetry(() => writeFileContent(handle, expanded.text || "\n"));
      await scanVault(vaultHandle);
      await indexVaultTags();
      if (open) {
        await openFile(handle, path, true);
        if (expanded.cursor !== null) {
          store.set(atom_pendingScrollTarget, { path, ...offsetToLineColumn(expanded.text, expanded.cursor) });
        }
      }
      toast.success(`Created: ${path}`);
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

  // Note text for a link-named note: blank, or `entry` expanded with the
  // link's name as the title (its file_name is ignored). null = cancelled.
  const linkedNoteText = useCallback(async (entry: TemplateEntry | "blank", title: string) => {
    if (entry === "blank") return BLANK_NOTE;
    const raw = await readOrReport(entry);
    if (raw === null) return null;
    return (await instantiate(raw, title, "Create"))?.expanded ?? null;
  }, [readOrReport, instantiate]);

  // Clicking a missing [[link]]: an existing note opens; otherwise the
  // template picker (with Blank note; the template the name points to comes
  // first, highlighted), then the note is created and opened.
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
    const folder = parsed.folder ?? newNotesFolder();
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
    const chosen = await pickTemplate({
      includeBlank: true,
      title: `New note: ${display}`,
      preselect: matchTemplateForName(link, store.get(atom_templates)),
    });
    if (!chosen) return;
    const expanded = await linkedNoteText(chosen, parsed.baseName);
    if (!expanded) return;
    await writeNewNote(folder, parsed.baseName, expanded);
  }, [store, newNotesFolder, pickTemplate, linkedNoteText, writeNewNote, scanVault, openFile]);

  // "New note from template…" (palette, the Templates page's Use with
  // `picked`, a folder's menu with `folder`). The template's file_name names
  // the note; a title is asked only when there's no file_name or it uses
  // {{title}}. True once the note is open.
  const createNoteFromTemplate = useCallback(async (picked?: TemplateEntry, folder?: string): Promise<boolean> => {
    if (!store.get(atom_vaultHandle)) return false;
    const chosen = picked ?? (await pickTemplate({ includeBlank: false, title: "New note from template" }));
    if (!chosen || chosen === "blank") return false;
    const raw = await readOrReport(chosen);
    if (raw === null) return false;
    const named = namesItsNote(splitTemplate(raw).routing.fileName);
    let title = "";
    if (!named) {
      title = String((await dialog.prompt("Note title:", "", "New note from template")) ?? "").trim();
      if (!title) return false;
    }
    const result = await instantiate(raw, title, "Create", "", { titleFromFileName: named });
    if (!result) return false;
    const target = normalizeFolderPath(folder ?? "") || newNotesFolder();
    const baseName = sanitizeNoteName(result.routing.fileName || title);
    return (await writeNewNote(target, baseName, result.expanded)) !== null;
  }, [store, dialog, pickTemplate, readOrReport, instantiate, newNotesFolder, writeNewNote]);

  // "New template…": asks the name, then `templates/<name>.md` (in
  // `<pack>/` when given) with a minimal body. A template with the same name
  // (any case) in the same place is opened unchanged instead. True once a
  // template is open.
  const createTemplate = useCallback(async (pack?: string): Promise<boolean> => {
    const vaultHandle = store.get(atom_vaultHandle);
    if (!vaultHandle) return false;
    const name = String((await dialog.prompt("Template name:", "", "New template")) ?? "").trim();
    if (!name) return false;
    const baseName = sanitizeTemplateFileName(name).slice(0, -".md".length);
    const root = store.get(atom_templatesFolder).folder;
    const folder = pack ? `${root}/${pack}` : root;
    const openedExisting = (path: string) => toast.success(`Opened existing template: ${path}`);
    // The registry check catches `RFC` vs `rfc.md` on case-sensitive backends (OPFS).
    const indexed = store.get(atom_templates)
      .find((t) => (t.pack ?? "") === (pack ?? "") && t.name.toLowerCase() === baseName.toLowerCase());
    if (indexed) {
      try {
        const handle = await findExisting(vaultHandle, indexed.path);
        if (handle) {
          await openFile(handle, indexed.path, true);
          openedExisting(indexed.path);
          return true;
        }
      } catch (err) {
        reportCreateError(err);
        return false;
      }
      // A stale index entry falls through to the create.
    }
    return (await writeNewNote(folder, baseName, { text: NEW_TEMPLATE_BODY, cursor: null }, {
      onExisting: openedExisting,
    })) !== null;
  }, [store, dialog, openFile, writeNewNote]);

  // The WikiLink dialog's "Create and link" (no `entry`) and "From
  // template": creates the linked note without opening it and returns its
  // link path (no `.md`), or null. A note of that name already there is
  // linked as it is.
  const createLinkedNote = useCallback(async (name: string, entry?: TemplateEntry): Promise<string | null> => {
    const vaultHandle = store.get(atom_vaultHandle);
    if (!vaultHandle) return null;
    const parsed = parseMissingLink(name);
    if (!parsed) {
      toast.error(`Can't create a note named "${name.trim()}"`);
      return null;
    }
    const folder = parsed.folder ?? newNotesFolder();
    const path = joinPath(folder, `${parsed.baseName}.md`);
    try {
      if (await findExisting(vaultHandle, path)) {
        toast.success(`Linked existing note: ${path}`);
        return path.replace(/\.md$/, "");
      }
    } catch (err) {
      reportCreateError(err);
      return null;
    }
    const expanded = await linkedNoteText(entry ?? "blank", parsed.baseName);
    if (!expanded) return null;
    const created = await writeNewNote(folder, parsed.baseName, expanded, { open: false });
    return created ? created.path.replace(/\.md$/, "") : null;
  }, [store, newNotesFolder, linkedNoteText, writeNewNote]);

  const createWikiLinkFile = useCallback((name: string) => createLinkedNote(name), [createLinkedNote]);
  const createLinkedNoteFromTemplate = useCallback(
    (name: string, entry: TemplateEntry) => createLinkedNote(name, entry),
    [createLinkedNote],
  );

  return {
    writeNewNote,
    createNoteFromMissingLink,
    createNoteFromTemplate,
    createTemplate,
    createWikiLinkFile,
    createLinkedNoteFromTemplate,
  };
}
