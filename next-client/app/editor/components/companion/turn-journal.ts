import type { FileUndoStep } from "@/app/atoms/vault-atoms";
import { isTrashPath } from "@/app/services/vault-trash";
import { textFingerprint } from "@/app/workers/replace-search";

// What one companion turn changed, as the ordered steps of its group on the
// app's file-undo stack (FileUndoGroup in vault-atoms.ts), so Undo turn, the
// file tree's ⌘Z and a toast's Undo all put back the same thing: edited
// files' text from before, with a fingerprint of the text the turn left (as
// use-apply-replace.ts records a vault-wide replace), created files and
// folders, and moves (rename, move, Trash). Undo (hooks/file-system/
// use-file-undo.ts) walks the steps newest first and only touches a file
// whose text still matches what the turn left.

// The latest step that touches `path`, as an index into `steps`.
function lastStepAt(steps: FileUndoStep[], path: string): number {
  for (let i = steps.length - 1; i >= 0; i--) {
    const step = steps[i];
    if (step.kind === "move" ? step.from === path || step.to === path : step.path === path) return i;
  }
  return -1;
}

// A file the turn edited. Another edit to it, with nothing moved there
// since, keeps the first `before` and moves the fingerprint on (a created
// file's too); otherwise it's a new step.
export function recordContent(steps: FileUndoStep[], path: string, before: string, after: string): FileUndoStep[] {
  const afterFingerprint = textFingerprint(after);
  const at = lastStepAt(steps, path);
  const last = steps[at];
  if (last && (last.kind === "content" || last.kind === "create")) {
    return steps.map((step, i) => (i === at ? { ...last, afterFingerprint } : step));
  }
  return [...steps, { kind: "content", path, before, afterFingerprint }];
}

export function recordCreate(steps: FileUndoStep[], path: string, text: string): FileUndoStep[] {
  return [...steps, { kind: "create", path, afterFingerprint: textFingerprint(text) }];
}

// Every file the turn changed, where it is now, for its summary: edited and
// created files, and moved items at their new place (not in the Trash).
export function changedPaths(steps: FileUndoStep[]): string[] {
  const paths: string[] = [];
  const add = (path: string) => {
    if (!paths.includes(path)) paths.push(path);
  };
  for (const step of steps) {
    if (step.kind === "move") {
      const at = paths.indexOf(step.from);
      if (at >= 0) paths.splice(at, 1);
      if (!isTrashPath(step.to)) add(step.to);
    } else if (step.kind !== "folder") add(step.path);
  }
  return paths;
}

// How many items the turn moved to the Trash.
export const trashedCount = (steps: FileUndoStep[]) =>
  steps.filter((step) => step.kind === "move" && isTrashPath(step.to)).length;
