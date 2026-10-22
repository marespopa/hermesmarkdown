// Messages between the main thread and the metadata worker's note-text
// index (see content-index.ts / content-search.ts). Every message carries a
// `type`; untyped messages are the worker's original metadata parse request.

/** One matching line of one note. */
export interface ContentHit {
  path: string;
  name: string;
  /** 1-based, counted from the top of the file (frontmatter included). */
  line: number;
  /** 0-based offset of the first match within the (untrimmed) line. */
  column: number;
  /** The trimmed line, windowed to 140 characters with `…` where cut. */
  snippet: string;
  /** Character indices within `snippet` covered by a query term. */
  highlights: number[];
  /** The line's score; hits arrive already in rank order. */
  score: number;
}

export interface ContentFile {
  path: string;
  name: string;
  content: string;
  modifiedAt: number;
}

export type ContentRequest =
  | { type: "content:index"; files: ContentFile[] }
  | { type: "content:remove"; paths: string[] }
  | { type: "content:clear" }
  | { type: "content:remap"; oldPath: string; newPath: string }
  | { type: "content:search"; searchId: number; query: string; paths: string[]; limit: number };

export interface ContentResults {
  type: "content:results";
  searchId: number;
  hits: ContentHit[];
  /** Searched paths with no indexed text yet. */
  pending: number;
  /** The index hit its size cap; some notes aren't searchable. */
  capped: boolean;
}
