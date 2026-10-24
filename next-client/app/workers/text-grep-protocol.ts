// Messages between the main thread and the text-file grep worker
// (text-grep.worker.ts). Text files (code, data, plain text) are never kept
// in the note-text index; when Search Code Files is on, the palette's `/`
// scope searches them in this worker, which keeps their text between
// searches (text-grep.ts). With Regex on, every searched file, notes too,
// goes through this worker, so a runaway pattern can be stopped.
import type { ContentHit } from "./content-search-protocol";

/** A text file to search: its handle (read in the worker) or, where the
 * browser can't send handles to a worker, its text. */
export interface GrepFile {
  path: string;
  name: string;
  handle?: FileSystemFileHandle;
  content?: string;
  /** A note: its frontmatter is skipped and board JSON blanked, as in the note-text index. */
  isNote?: boolean;
}

export type GrepMode = "text" | "regex";

export type GrepRequest =
  | { type: "grep:search"; searchId: number; query: string; files: GrepFile[]; limit: number; mode?: GrepMode }
  | { type: "grep:cancel" };

export interface GrepResults {
  type: "grep:results";
  searchId: number;
  /** The best hits so far, in rank order. */
  hits: ContentHit[];
  scanned: number;
  total: number;
  done: boolean;
  /** Regex mode: the query isn't a valid pattern. */
  invalid?: boolean;
}
