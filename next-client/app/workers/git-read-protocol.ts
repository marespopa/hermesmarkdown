// Messages between the main thread and the git-read worker
// (git-read.worker.ts), which reads a vault's `.git` folder (read-only) to
// find HEAD and HEAD's text for one file. Client: services/git-read-client.ts.
export type GitReadRequest =
  | { type: "git:head"; requestId: number; vault: FileSystemDirectoryHandle }
  | { type: "git:blob"; requestId: number; vault: FileSystemDirectoryHandle; commit: string; path: string };

export type GitReadResponse =
  | { type: "git:head"; requestId: number; available: boolean; commit: string | null; stamp: string }
  | { type: "git:blob"; requestId: number; status: "ok" | "missing" | "binary" | "too-large" | "error"; text?: string };
