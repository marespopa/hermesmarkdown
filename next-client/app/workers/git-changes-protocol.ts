// Messages between services/git-changes-client.ts and git-changes.worker.ts.
import type { ChangesProgress, ChangesResult } from "@/app/services/git/git-changes-types";

export type GitChangesRequest =
  | { type: "changes:scan"; requestId: number; vault: FileSystemDirectoryHandle }
  | { type: "changes:cancel"; requestId: number };

export type GitChangesResponse =
  | { type: "changes:started"; requestId: number }
  | { type: "changes:progress"; requestId: number; progress: ChangesProgress }
  | { type: "changes:result"; requestId: number; result: ChangesResult | "cancelled" };
