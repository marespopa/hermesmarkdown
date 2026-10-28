"use client";

import { useCallback } from "react";
import { useStore } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_templatesFolder } from "@/app/atoms/template-atoms";
import { atom_fileUndoStack, atom_vaultHandle, resolveFileHandleAtPath, type FileUndoStep } from "@/app/atoms/vault-atoms";
import { withRetry } from "@/app/hooks/file-system/shared";
import { useNoteBuffer } from "@/app/hooks/file-system/use-note-buffer";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { writeFileContent } from "@/app/services/file-writer";
import { isMarkdownPath } from "@/app/utils/file-kinds";
import { FM_REGEX } from "@/app/utils/frontmatter-utils";
import { isPrivateContent, isPrivateFrontmatter } from "@/app/utils/note-privacy";
import { lintTemplate } from "@/app/utils/templates/template-lint";
import { sanitizeTemplateFileName } from "@/app/utils/templates/template-registry";
import { loadYaml } from "@/app/utils/load-yaml";
import { applyEdits, repairFrontmatter, replaceCodeBlock, withNewNoteFrontmatter, type CodeBlockTarget, type EditResult, type FindReplace } from "./tools/edit-tools";
import { guardFilePath, guardFolderPath } from "./tools/path-guard";
import { PRIVATE_HIDDEN } from "./tools/read-tools";
import { recordContent, recordCreate } from "./turn-journal";

export type WriteResult = { output: string; detail: string };

// A companion turn's group on the app's file-undo stack, by the id of the
// user message that started it.
export const TURN_UNDO_LABEL = "AI changes";
export const turnUndoGroup = (turnId: string) => ({ id: turnId, label: TURN_UNDO_LABEL });

const frontmatterOf = (text: string) => FM_REGEX.exec(text)?.[0] ?? "";

const splitPath = (path: string) => {
  const at = path.lastIndexOf("/");
  return { folder: at < 0 ? "" : path.slice(0, at), name: path.slice(at + 1) };
};

// The companion's writes: edit_file, write_file, edit_code_block, create_file,
// create_folder and create_template, applied at once (an open tab shows the
// new text straight away, and disk wins over its cached text, through
// useNoteBuffer().writeThrough), each recorded as a step of its turn's group
// on the app's file-undo stack (recordSteps), and undoTurn, which takes the
// whole group back through the app's own Undo. Paths go through the path
// guard; private notes are never written. Each write answers the text for
// the model and its chip's detail.
export function useCompanionWrites() {
  const store = useStore();
  const { writeThrough } = useNoteBuffer();
  const { scanVault, indexVaultTags, recordSteps, undoFileOperation } = useFileSystem();

  // The file tree is built from the vault index, not the root listing, so
  // a new file or folder shows only once the vault is indexed again (as the
  // app's own New File does).
  const refreshTree = useCallback((vault: FileSystemDirectoryHandle) => {
    void scanVault(vault).then(() => indexVaultTags());
  }, [scanVault, indexVaultTags]);

  const record = useCallback((turnId: string, update: (steps: FileUndoStep[]) => FileUndoStep[]) => {
    recordSteps(turnUndoGroup(turnId), update);
  }, [recordSteps]);

  // Walks to a vault folder, making the missing ones; each folder made is a
  // step of the turn, so its undo removes it again (while it's empty).
  const ensureFolder = useCallback(async (turnId: string, vault: FileSystemDirectoryHandle, folder: string) => {
    let dir = vault;
    let path = "";
    const made: FileUndoStep[] = [];
    for (const segment of folder.split("/").filter(Boolean)) {
      path = path ? `${path}/${segment}` : segment;
      try {
        dir = await dir.getDirectoryHandle(segment);
      } catch (err: any) {
        if (err?.name !== "NotFoundError") throw err;
        const parent = dir;
        dir = await withRetry(() => parent.getDirectoryHandle(segment, { create: true }));
        made.push({ kind: "folder", path });
      }
    }
    if (made.length) record(turnId, (steps) => [...steps, ...made]);
    return { dir, made: made.length };
  }, [record]);

  const transformFile = useCallback(async (
    turnId: string,
    rawPath: string,
    change: (text: string) => EditResult,
  ): Promise<WriteResult> => {
    const vault = store.get(atom_vaultHandle);
    if (!vault) return { output: "No vault is open, so nothing can be changed.", detail: "no vault" };
    const load = await loadYaml();
    const guarded = guardFilePath(rawPath);
    if (!guarded.ok) return { output: guarded.reason, detail: "refused" };
    const { path } = guarded;
    if (isPrivateFrontmatter(store.get(atom_fileMetadata)[path]?.frontmatter)) {
      return { output: `${path} is ${PRIVATE_HIDDEN} and can't be changed.`, detail: "private" };
    }
    let handle: FileSystemFileHandle;
    try {
      handle = await resolveFileHandleAtPath(vault, path);
    } catch {
      return { output: `${path} doesn't exist. Check the path with list_folder, or use create_file.`, detail: "not found" };
    }
    // Filled by the transform (a holder, so the narrowing survives the callback).
    const slot: { failure: string; applied?: { before: string; after: string; summary: string } } = { failure: "" };
    const { result } = await writeThrough(path, handle, (text) => {
      if (isMarkdownPath(path) && isPrivateContent(text)) {
        slot.failure = `${path} is ${PRIVATE_HIDDEN} and can't be changed.`;
        return null;
      }
      const edit = change(text);
      if (!edit.ok) {
        slot.failure = edit.reason;
        return null;
      }
      // Frontmatter the change touched is kept valid YAML (repairFrontmatter);
      // a block it left alone stays as the user wrote it.
      const after = isMarkdownPath(path) && frontmatterOf(edit.text) !== frontmatterOf(text)
        ? repairFrontmatter(edit.text, load)
        : edit.text;
      slot.applied = { before: text, after, summary: edit.summary };
      return after;
    });
    if (!slot.applied) return { output: slot.failure || `${path} wasn't changed.`, detail: "not changed" };
    const { before, after, summary } = slot.applied;
    record(turnId, (steps) => recordContent(steps, path, before, after));
    if (result === "failed") {
      return { output: `Couldn't save ${path}. The change is in its open tab and saves with the next autosave.`, detail: "save failed" };
    }
    return { output: `Saved ${path} (${summary}).`, detail: summary };
  }, [store, writeThrough, record]);

  const editFile = useCallback((turnId: string, path: string, edits: FindReplace[]) =>
    transformFile(turnId, path, (text) => applyEdits(text, edits)), [transformFile]);

  const editCodeBlock = useCallback((turnId: string, path: string, target: CodeBlockTarget, code: string) =>
    transformFile(turnId, path, (text) => replaceCodeBlock(text, target, code)), [transformFile]);

  // A new note gets a frontmatter block (withNewNoteFrontmatter), kept valid
  // YAML (repairFrontmatter); a template
  // (`asIs`) is written exactly as given.
  const createFile = useCallback(async (turnId: string, rawPath: string, content: string, asIs = false): Promise<WriteResult> => {
    const vault = store.get(atom_vaultHandle);
    if (!vault) return { output: "No vault is open, so nothing can be created.", detail: "no vault" };
    const guarded = guardFilePath(rawPath);
    if (!guarded.ok) return { output: guarded.reason, detail: "refused" };
    const { path } = guarded;
    const exists = await resolveFileHandleAtPath(vault, path).then(() => true, () => false);
    if (exists) return { output: `${path} already exists. Read it and use edit_file instead.`, detail: "exists" };
    try {
      const { folder, name } = splitPath(path);
      const { dir } = await ensureFolder(turnId, vault, folder);
      const handle = await withRetry(() => dir.getFileHandle(name, { create: true }));
      // Never a 0-byte file: Google Drive hangs syncing those.
      const text = !asIs && isMarkdownPath(path)
        ? repairFrontmatter(withNewNoteFrontmatter(path, content), await loadYaml())
        : content || "\n";
      await withRetry(() => writeFileContent(handle, text));
      record(turnId, (steps) => recordCreate(steps, path, text));
      refreshTree(vault);
      return { output: `Created ${path}.`, detail: "" };
    } catch (err) {
      console.warn("Companion: couldn't create", path, err);
      return { output: `Couldn't create ${path}.`, detail: "failed" };
    }
  }, [store, ensureFolder, record, refreshTree]);

  // A whole file's new text: replaces an existing file (a step of the turn's
  // undo group, like an edit) or creates it when the path is free.
  const writeFile = useCallback(async (turnId: string, rawPath: string, content: string): Promise<WriteResult> => {
    const vault = store.get(atom_vaultHandle);
    if (!vault) return { output: "No vault is open, so nothing can be changed.", detail: "no vault" };
    const guarded = guardFilePath(rawPath);
    if (!guarded.ok) return { output: guarded.reason, detail: "refused" };
    const exists = await resolveFileHandleAtPath(vault, guarded.path).then(() => true, () => false);
    if (!exists) return createFile(turnId, guarded.path, content);
    return transformFile(turnId, guarded.path, (text) => (text === (content || "\n")
      ? { ok: false, reason: `${guarded.path} already has exactly that text.` }
      : { ok: true, text: content || "\n", summary: "rewritten" }));
  }, [store, createFile, transformFile]);

  const createFolder = useCallback(async (turnId: string, rawPath: string): Promise<WriteResult> => {
    const vault = store.get(atom_vaultHandle);
    if (!vault) return { output: "No vault is open, so nothing can be created.", detail: "no vault" };
    const guarded = guardFolderPath(rawPath);
    if (!guarded.ok) return { output: guarded.reason, detail: "refused" };
    const { path } = guarded;
    if (!path) return { output: "Name the folder to create.", detail: "refused" };
    try {
      const { made } = await ensureFolder(turnId, vault, path);
      if (!made) return { output: `${path} already exists.`, detail: "exists" };
      refreshTree(vault);
      return { output: `Created the folder ${path}.`, detail: "" };
    } catch (err) {
      console.warn("Companion: couldn't create the folder", path, err);
      return { output: `Couldn't create the folder ${path}.`, detail: "failed" };
    }
  }, [store, ensureFolder, refreshTree]);

  // A new template in the templates folder, only once it passes the
  // template checks: their findings go back to the model and nothing is
  // written. An existing template is never replaced (edit_file changes it).
  const createTemplate = useCallback(async (turnId: string, name: string, body: string): Promise<WriteResult> => {
    const problems = lintTemplate(body);
    if (problems.length) {
      return {
        output: `The template wasn't saved. Fix these and call create_template again:\n${problems.map((p) => `- ${p}`).join("\n")}`,
        detail: "needs fixes",
      };
    }
    const folder = store.get(atom_templatesFolder).folder;
    const fileName = sanitizeTemplateFileName(name);
    const path = folder ? `${folder}/${fileName}` : fileName;
    const result = await createFile(turnId, path, body, true);
    if (result.detail === "exists") {
      return { output: `A template ${path} already exists. Read it and use edit_file to change it, or pick another name.`, detail: "exists" };
    }
    return result.detail ? result : { output: `Saved the template ${path}. It shows in the template picker.`, detail: "" };
  }, [store, createFile]);

  // Takes the turn's changes back with the app's Undo: only while the turn
  // is the latest change (the toast says so otherwise).
  const undoTurn = useCallback(async (turnId: string): Promise<boolean> => {
    const group = store.get(atom_fileUndoStack).find((g) => g.id === turnId);
    return group ? undoFileOperation(group) : false;
  }, [store, undoFileOperation]);

  return { editFile, writeFile, editCodeBlock, createFile, createFolder, createTemplate, undoTurn };
}
