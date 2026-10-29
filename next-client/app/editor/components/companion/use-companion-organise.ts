"use client";

import { useCallback } from "react";
import { useStore } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { directoryAtPath, entryAtPath } from "@/app/hooks/file-system/directory-ops";
import { useNoteBuffer } from "@/app/hooks/file-system/use-note-buffer";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { isMarkdownPath } from "@/app/utils/file-kinds";
import { isPrivateContent, isPrivateFrontmatter } from "@/app/utils/note-privacy";
import { guardFolderPath, guardItemPath, guardNewName } from "./tools/path-guard";
import { PRIVATE_HIDDEN } from "./tools/read-tools";
import { askToTrash } from "./trash-confirm";
import { turnUndoGroup, type WriteResult } from "./use-companion-writes";

type Located = { path: string; handle: FileSystemHandle };
type Lookup = { ok: true; items: Located[] } | { ok: false; result: WriteResult };

const NO_VAULT: WriteResult = { output: "No vault is open, so nothing can be changed.", detail: "no vault" };
const nameOf = (path: string) => path.slice(path.lastIndexOf("/") + 1);
const folderOf = (path: string) => path.slice(0, Math.max(0, path.lastIndexOf("/")));

// The companion's organising tools: rename (links follow, through the app's
// renameFile), move (moveItems) and trash (trashItems, after the user says
// so on the TrashConfirmCard). Each goes through the app's own file
// operation, recorded in the turn's group on the file-undo stack, so Undo
// turn takes it back with the turn's edits, in order. Paths go through the
// path guard; private notes, and folders holding one, are never touched.
export function useCompanionOrganise() {
  const store = useStore();
  const { readCurrentText } = useNoteBuffer();
  const { renameFile, moveItems, trashItems } = useFileSystem();

  // Private notes stay put: one by its frontmatter or its text, a folder
  // when a note in it is private by its frontmatter.
  const isPrivateItem = useCallback(async (path: string, kind: FileSystemHandle["kind"]) => {
    const notes = store.get(atom_fileMetadata);
    if (kind === "directory") {
      return Object.entries(notes).some(([notePath, note]) => notePath.startsWith(`${path}/`) && isPrivateFrontmatter(note.frontmatter));
    }
    if (!isMarkdownPath(path)) return false;
    if (isPrivateFrontmatter(notes[path]?.frontmatter)) return true;
    return isPrivateContent(await readCurrentText(path).catch(() => ""));
  }, [store, readCurrentText]);

  // Guards and finds each path; the first problem answers for all of them.
  const locate = useCallback(async (vault: FileSystemDirectoryHandle, rawPaths: string[]): Promise<Lookup> => {
    if (!rawPaths.length) return { ok: false, result: { output: "Name the files or folders.", detail: "refused" } };
    const items: Located[] = [];
    for (const raw of rawPaths) {
      const guarded = guardItemPath(raw);
      if (!guarded.ok) return { ok: false, result: { output: guarded.reason, detail: "refused" } };
      let handle: FileSystemHandle;
      try {
        ({ handle } = await entryAtPath(vault, guarded.path));
      } catch {
        return { ok: false, result: { output: `${guarded.path} doesn't exist. Check the path with list_folder.`, detail: "not found" } };
      }
      if (await isPrivateItem(guarded.path, handle.kind)) {
        const what = handle.kind === "directory" ? "holds a file that is" : "is";
        return { ok: false, result: { output: `${guarded.path} ${what} ${PRIVATE_HIDDEN}, so it stays where it is.`, detail: "private" } };
      }
      items.push({ path: guarded.path, handle });
    }
    return { ok: true, items };
  }, [isPrivateItem]);

  const rename = useCallback(async (turnId: string, rawPath: string, rawName: string): Promise<WriteResult> => {
    const vault = store.get(atom_vaultHandle);
    if (!vault) return NO_VAULT;
    const found = await locate(vault, [rawPath]);
    if (!found.ok) return found.result;
    const [{ path, handle }] = found.items;
    const newName = guardNewName(rawName, nameOf(path), handle.kind === "file");
    if (!newName.ok) return { output: newName.reason, detail: "refused" };
    if (newName.path === nameOf(path)) return { output: `${path} already has that name.`, detail: "not changed" };
    const target = folderOf(path) ? `${folderOf(path)}/${newName.path}` : newName.path;
    // A case-only change is the same item; anything else must be free.
    if (target.toLowerCase() !== path.toLowerCase() && await entryAtPath(vault, target).then(() => true, () => false)) {
      return { output: `${target} already exists. Pick another name.`, detail: "exists" };
    }
    const renamed = await renameFile(handle, newName.path, path, turnUndoGroup(turnId));
    if (!renamed) return { output: `Couldn't rename ${path}.`, detail: "failed" };
    return { output: `Renamed ${path} to ${renamed}. Links to it now point to the new name.`, detail: "" };
  }, [store, locate, renameFile]);

  const move = useCallback(async (turnId: string, rawPaths: string[], rawFolder: string): Promise<WriteResult> => {
    const vault = store.get(atom_vaultHandle);
    if (!vault) return NO_VAULT;
    const folder = guardFolderPath(rawFolder);
    if (!folder.ok) return { output: folder.reason, detail: "refused" };
    let targetDir: FileSystemDirectoryHandle;
    try {
      targetDir = await directoryAtPath(vault, folder.path);
    } catch {
      return { output: `The folder ${folder.path} doesn't exist. Create it with create_folder first.`, detail: "not found" };
    }
    const found = await locate(vault, rawPaths);
    if (!found.ok) return found.result;
    const into = folder.path || "the vault's top level";
    if (found.items.some(({ path }) => folder.path === path || folder.path.startsWith(`${path}/`))) {
      return { output: "A folder can't move into itself.", detail: "refused" };
    }
    const moves = await moveItems(found.items.map(({ handle }) => handle), targetDir, turnUndoGroup(turnId));
    if (!moves.length) return { output: `Nothing moved: the items are already in ${into}, or couldn't be moved.`, detail: "not changed" };
    const list = moves.map(({ from, to }) => `${from} → ${to}`).join("\n");
    const missed = found.items.length - moves.length;
    return {
      output: `Moved to ${into}:\n${list}${missed ? `\n${missed} item${missed === 1 ? "" : "s"} didn't move.` : ""}\nLinks to them were updated.`,
      detail: missed ? `${moves.length} of ${found.items.length}` : "",
    };
  }, [store, locate, moveItems]);

  // Waits for the user's answer on the card; the files stay unless they agree.
  const trash = useCallback(async (turnId: string, toolCallId: string, rawPaths: string[]): Promise<WriteResult> => {
    const vault = store.get(atom_vaultHandle);
    if (!vault) return NO_VAULT;
    const found = await locate(vault, rawPaths);
    if (!found.ok) return found.result;
    const paths = found.items.map(({ path }) => path);
    if (!(await askToTrash(store, toolCallId, paths))) {
      return { output: "The user kept the files; nothing was moved to the Trash. Don't ask again unless they do.", detail: "kept" };
    }
    const moves = await trashItems(found.items, turnUndoGroup(turnId));
    if (!moves.length) return { output: "Couldn't move the files to the Trash.", detail: "failed" };
    return { output: `Moved to the Trash (kept 30 days; Undo turn puts them back): ${moves.map(({ from }) => from).join(", ")}.`, detail: "" };
  }, [store, locate, trashItems]);

  return { rename, move, trash };
}
