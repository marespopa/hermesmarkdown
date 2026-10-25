// Data the Changes page's scan produces (git-changes-scan.ts, run in
// workers/git-changes.worker.ts) and the page renders. Types only.
export type FileStatus = "added" | "modified" | "deleted";

/** One change: `removed` are the old lines from `oldStart`, replaced by `newCount` lines from `newStart` of `lines`. */
export interface DiffChange {
  oldStart: number;
  removed: string[];
  newStart: number;
  newCount: number;
}

export type TextFileDiff = { kind: "text"; changes: DiffChange[]; lines: string[] };

export type FileDiff = TextFileDiff | { kind: "binary" } | { kind: "too-large" } | { kind: "error" } | { kind: "skipped" };

export interface ChangedFile {
  path: string;
  status: FileStatus;
  /** Lines added / removed; null for binary files. */
  added: number | null;
  removed: number | null;
  diff: FileDiff;
}

export type ChangesResult = { status: "no-repo" } | { status: "error" } | { status: "ok"; commit: string | null; files: ChangedFile[] };

export interface ChangesProgress {
  phase: "listing" | "comparing";
  done: number;
  total: number;
}
