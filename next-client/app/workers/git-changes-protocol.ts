// Messages between services/git-changes-client.ts and git-changes.worker.ts.
import type { ChangedFile, ChangesProgress, ChangesResult } from "@/app/services/git/git-changes-types";
import type { KnownFile } from "@/app/services/git/git-changes-scan";

export type GitChangesRequest =
  | { type: "changes:scan"; requestId: number; vault: FileSystemDirectoryHandle; known?: KnownFile[] }
  | { type: "changes:cancel"; requestId: number };

export type GitChangesResponse =
  | { type: "changes:started"; requestId: number }
  | { type: "changes:progress"; requestId: number; progress: ChangesProgress }
  | { type: "changes:files"; requestId: number; files: ChangedFile[] }
  | { type: "changes:result"; requestId: number; result: ChangesResult | "cancelled" };
