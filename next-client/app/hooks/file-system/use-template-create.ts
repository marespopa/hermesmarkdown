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
  sanitizeTemplateFileName,
  type TemplateEntry,
} from "@/app/utils/templates/template-registry";
import { offsetToLineColumn, type ExpandedTemplate } from "@/app/utils/templates/template-tokens";
import { NEW_BOARD_MARKDOWN } from "@/app/utils/board/board-format";

interface UseTemplateCreateProps {
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
  indexVaultTags: (passedHandle?: FileSystemDirectoryHandle) => Promise<void>;
  openFile: (fileHandle: FileSystemFileHandle, providedPath?: string, force?: boolean) => Promise<void>;
}

// The body "New template…" starts from.
export const NEW_TEMPLATE_BODY = "# {{title}}\n\n{{cursor}}\n";

const BLANK_NOTE: ExpandedTemplate = { text: "\n", cursor: null };
const NEW_BOARD: ExpandedTemplate = { text: NEW_BOARD_MARKDOWN, cursor: null };
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

// Note creation from links (a missing [[link]], the WikiLink dialog), with or
// without a template: the note goes in the link's folder when it has one,
// else the New Files folder, and the link names it; a note of that name
// already there is opened (or linked) as it is, never duplicated or
// overwritten. Also "New template…", which creates a template file with a
// minimal body.
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

  // Note text for a link-named note: blank, an empty board, or `entry`
  // expanded with the link's name as the title. null = cancelled.
  const linkedNoteText = useCallback(async (entry: TemplateEntry | "blank" | "board", title: string) => {
    if (entry === "blank") return BLANK_NOTE;
    if (entry === "board") return NEW_BOARD;
    const raw = await readOrReport(entry);
    if (raw === null) return null;
    return (await instantiate(raw, title, "Create"))?.expanded ?? null;
  }, [readOrReport, instantiate]);

  // Clicking a missing [[link]]: an existing note opens; otherwise the
  // template picker (with Blank note and Board; the template the name points to comes
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

  // A pack's "New template": asks the name, then `_templates/<name>.md` (in
  // `<pack>/` when given) with a minimal body. With `from`, no question: its
  // name and body (the template wizard, copying a built-in to change it). A
  // template with the same name (any case) in the same place is opened
  // unchanged instead. True once a template is open.
  const createTemplate = useCallback(async (pack?: string, from?: { name: string; body: string }): Promise<boolean> => {
    const vaultHandle = store.get(atom_vaultHandle);
    if (!vaultHandle) return false;
    const name = (from?.name ?? String((await dialog.prompt("Template name:", "", "New template")) ?? "")).trim();
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
    return (await writeNewNote(folder, baseName, { text: from?.body ?? NEW_TEMPLATE_BODY, cursor: null }, {
      onExisting: openedExisting,
    })) !== null;
  }, [store, dialog, openFile, writeNewNote]);

  // The WikiLink dialog's "Create and link" (no `entry`) and "From
  // template", and `/board` ("board"): creates the linked note without
  // opening it and returns its link path (no `.md`), or null. A note of that
  // name already there is linked as it is.
  const createLinkedNote = useCallback(async (name: string, entry?: TemplateEntry | "board"): Promise<string | null> => {
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
  // The palette's `~` templates (Ctrl/Cmd+Enter, or Enter with no note
  // open): asks the new note's name, then creates it from `entry` in the
  // New Files folder (or the name's own folder) and opens it. A note of that
  // name already there opens unchanged. Resolves to its path, or null.
  const createNoteFromTemplate = useCallback(async (entry: TemplateEntry): Promise<string | null> => {
    const name = await dialog.prompt("Name the new note", entry.name, "New note from template");
    if (typeof name !== "string" || !name.trim()) return null;
    const parsed = parseMissingLink(name);
    if (!parsed) {
      toast.error(`Can't create a note named "${name.trim()}"`);
      return null;
    }
    const expanded = await linkedNoteText(entry, parsed.baseName);
    if (!expanded) return null;
    const created = await writeNewNote(parsed.folder ?? newNotesFolder(), parsed.baseName, expanded);
    return created?.path ?? null;
  }, [dialog, newNotesFolder, linkedNoteText, writeNewNote]);
  // `name` ends in `.board` (boardBaseName).
  const createLinkedBoard = useCallback((name: string) => createLinkedNote(name, "board"), [createLinkedNote]);

  return {
    writeNewNote,
    createNoteFromMissingLink,
    createTemplate,
    createWikiLinkFile,
    createLinkedNoteFromTemplate,
    createNoteFromTemplate,
    createLinkedBoard,
  };
}
