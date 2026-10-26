"use client";

import { useCallback } from "react";
import { useSetAtom } from "jotai";
import toast from "react-hot-toast";
import { resolveFileHandleAtPath } from "@/app/atoms/atoms";
import { atom_lastReplace, type LastReplace } from "@/app/atoms/replace-atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { showUndoToast } from "@/app/hooks/file-system/undo-toast";
import { useNoteBuffer } from "@/app/hooks/file-system/use-note-buffer";
import { indexNoteContent } from "@/app/services/content-search-client";
import { boardFenceRanges } from "@/app/utils/board/board-format";
import { isMarkdownPath } from "@/app/utils/file-kinds";
import { applyReplacements, buildReplacePattern, textFingerprint, type ReplaceQuery } from "@/app/workers/replace-search";

export interface ApplyPlan {
  query: ReplaceQuery;
  template: string;
  /** Files with at least one included match; `skip` holds the excluded ordinals. */
  files: { path: string; fingerprint: string; skip: ReadonlySet<number> }[];
}

export type FileOutcome = "replaced" | "skipped" | "failed";
export type ApplyProgress = { path: string; state: "replacing" | FileOutcome; done: number; total: number };

export interface ApplyOutcome {
  /** Matches written, and the files they were in. */
  matches: number;
  files: number;
  skipped: number;
  failed: number;
  results: Record<string, FileOutcome>;
  /** Write permission was refused; nothing was written. */
  denied?: boolean;
}

interface Written {
  path: string;
  before: string;
  after: string;
  count: number;
}

type PermissionHandle = FileSystemDirectoryHandle & {
  queryPermission?: (descriptor: { mode: "readwrite" }) => Promise<PermissionState>;
  requestPermission?: (descriptor: { mode: "readwrite" }) => Promise<PermissionState>;
};

// A disk vault may have lost write access since it was opened; the click is
// the user gesture the prompt needs. Browser vaults have neither method.
async function canWrite(vault: FileSystemDirectoryHandle): Promise<boolean> {
  const handle = vault as PermissionHandle;
  if (typeof handle.queryPermission !== "function") return true;
  try {
    if ((await handle.queryPermission({ mode: "readwrite" })) === "granted") return true;
    return (await handle.requestPermission?.({ mode: "readwrite" })) === "granted";
  } catch {
    return false;
  }
}

const plural = (count: number, one: string, many: string) => `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;

// Writes a Replace in Files plan, one file at a time, and takes it back. Each
// file goes through the note buffer (an open tab gets the new text, disk
// wins on conflicts) and is written only if its text is still what was
// previewed. One failed file never stops the others; nothing is rolled back.
export function useApplyReplace() {
  const { vaultHandle, indexVaultTags } = useFileSystem();
  const { writeThrough } = useNoteBuffer();
  const setLastReplace = useSetAtom(atom_lastReplace);

  // Sends written notes to the text index and refreshes tags and links.
  const refreshIndexes = useCallback(async (vault: FileSystemDirectoryHandle, paths: { path: string; text: string }[]) => {
    const notes: { path: string; name: string; content: string; modifiedAt: number }[] = [];
    for (const { path, text } of paths) {
      if (!isMarkdownPath(path)) continue;
      try {
        const handle = await resolveFileHandleAtPath(vault, path);
        notes.push({ path, name: handle.name, content: text, modifiedAt: (await handle.getFile()).lastModified });
      } catch {
        // Gone since the write: the next rescan indexes what is there.
      }
    }
    indexNoteContent(notes);
    void indexVaultTags();
  }, [indexVaultTags]);

  const undo = useCallback(async (last: LastReplace): Promise<void> => {
    const vault = vaultHandle;
    if (!vault || last.vault !== vault) {
      setLastReplace(null);
      return;
    }
    if (!(await canWrite(vault))) {
      toast.error("Write permission denied. Re-open the vault to restore access.");
      return;
    }
    setLastReplace(null);
    let restored = 0;
    let changedSince = 0;
    let failed = 0;
    const written: { path: string; text: string }[] = [];
    for (const file of last.files) {
      try {
        const handle = await resolveFileHandleAtPath(vault, file.path);
        const { result } = await writeThrough(file.path, handle, (text) =>
          textFingerprint(text) === file.afterFingerprint ? file.before : null,
        );
        if (result === "written") {
          restored++;
          written.push({ path: file.path, text: file.before });
        } else if (result === "failed") failed++;
        else changedSince++;
      } catch {
        failed++;
      }
    }
    await refreshIndexes(vault, written);
    const notes = [
      changedSince > 0 ? `${plural(changedSince, "file", "files")} changed since and ${changedSince === 1 ? "was" : "were"} left as is` : "",
      failed > 0 ? `${plural(failed, "file", "files")} couldn't be restored` : "",
    ].filter(Boolean);
    const message = `Restored ${plural(restored, "file", "files")}${notes.length ? ` · ${notes.join(" · ")}` : ""}`;
    if (restored === 0 && notes.length > 0) toast.error(message);
    else toast.success(message);
  }, [vaultHandle, writeThrough, setLastReplace, refreshIndexes]);

  const apply = useCallback(async (plan: ApplyPlan, onProgress: (progress: ApplyProgress) => void): Promise<ApplyOutcome> => {
    const outcome: ApplyOutcome = { matches: 0, files: 0, skipped: 0, failed: 0, results: {} };
    const pattern = buildReplacePattern(plan.query);
    if (!vaultHandle || !pattern) return outcome;
    if (!(await canWrite(vaultHandle))) {
      toast.error("Write permission denied. Re-open the vault to restore access.");
      return { ...outcome, denied: true };
    }
    const written: Written[] = [];
    const total = plan.files.length;
    let done = 0;
    for (const file of plan.files) {
      onProgress({ path: file.path, state: "replacing", done, total });
      let state: FileOutcome = "failed";
      try {
        const handle = await resolveFileHandleAtPath(vaultHandle, file.path);
        const slot: { entry: Written | null } = { entry: null };
        const { result } = await writeThrough(file.path, handle, (text) => {
          if (textFingerprint(text) !== file.fingerprint) return null;
          const exclude = isMarkdownPath(file.path) ? boardFenceRanges(text) : [];
          const next = applyReplacements(text, pattern, plan.template, plan.query.regex, exclude, file.skip);
          if (next.count === 0) return null;
          slot.entry = { path: file.path, before: text, after: next.text, count: next.count };
          return next.text;
        });
        if (result === "written" && slot.entry) {
          state = "replaced";
          written.push(slot.entry);
        } else if (result === "unchanged") state = "skipped";
      } catch (err) {
        console.warn("Replace failed for", file.path, err);
      }
      outcome.results[file.path] = state;
      if (state === "skipped") outcome.skipped++;
      if (state === "failed") outcome.failed++;
      done++;
      onProgress({ path: file.path, state, done, total });
    }
    outcome.files = written.length;
    outcome.matches = written.reduce((sum, file) => sum + file.count, 0);

    let last: LastReplace | null = null;
    if (written.length > 0) {
      last = {
        vault: vaultHandle,
        matches: outcome.matches,
        files: written.map((file) => ({ path: file.path, before: file.before, afterFingerprint: textFingerprint(file.after) })),
      };
      setLastReplace(last);
      void refreshIndexes(vaultHandle, written.map((file) => ({ path: file.path, text: file.after })));
    }
    // Skipped and failed files are counted after the replaced ones.
    const extras = [
      outcome.skipped > 0 ? `${plural(outcome.skipped, "file", "files")} skipped` : "",
      outcome.failed > 0 ? `${plural(outcome.failed, "file", "files")} failed` : "",
    ].filter(Boolean).join(" · ");
    if (written.length === 0) {
      toast.error(outcome.skipped > 0 && outcome.failed === 0 ? "Nothing replaced: files changed since the preview" : "Couldn't replace anything");
    } else if (last) {
      const undoable = last;
      const message = `Replaced ${plural(outcome.matches, "match", "matches")} in ${plural(outcome.files, "file", "files")}${extras ? ` · ${extras}` : ""}`;
      showUndoToast(message, () => void undo(undoable), { id: "replace-in-files" });
    }
    return outcome;
  }, [vaultHandle, writeThrough, setLastReplace, refreshIndexes, undo]);

  return { apply, undo };
}
