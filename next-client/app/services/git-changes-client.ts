"use client";

// Main-thread side of the Changes scan (app/workers/git-changes.worker.ts).
// The worker starts on the first scan. Without Worker (tests, old browsers),
// when posting fails, when the worker errors, or when it doesn't answer
// `changes:started` within START_TIMEOUT_MS, the same scan runs inline, so
// the page never waits on a worker that isn't running. A worker scan the
// browser refused access to (NotAllowedError: some browsers don't extend the
// vault's permission to workers) is run again inline, and so are later scans.

import type { ChangedFile, ChangesProgress, ChangesResult } from "@/app/services/git/git-changes-types";
import type { GitChangesRequest, GitChangesResponse } from "@/app/workers/git-changes-protocol";

type ScanResult = ChangesResult | "cancelled";

export const START_TIMEOUT_MS = 4000;

interface Request {
  onProgress(progress: ChangesProgress): void;
  onFiles(files: ChangedFile[]): void;
  resolve(result: ScanResult | Promise<ScanResult>): void;
  /** The same scan on this thread. */
  inline(): Promise<ScanResult>;
  timer: ReturnType<typeof setTimeout>;
}

let worker: Worker | null | undefined;
let lastRequestId = 0;
const requests = new Map<number, Request>();

// The worker can't be relied on: drop it and finish every waiting scan inline.
function abandonWorker(reason: unknown): void {
  if (worker) {
    console.warn("git: the Changes worker failed; scanning on the page instead", reason);
    worker.terminate?.();
  }
  worker = null;
  for (const [id, request] of requests) {
    clearTimeout(request.timer);
    requests.delete(id);
    request.resolve(request.inline());
  }
}

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = typeof Worker === "undefined" ? null : new Worker(new URL("../workers/git-changes.worker.ts", import.meta.url));
    worker?.addEventListener("message", (event: MessageEvent<GitChangesResponse>) => {
      const message = event.data;
      const request = requests.get(message.requestId);
      if (!request) return;
      if (message.type === "changes:started") {
        clearTimeout(request.timer);
      } else if (message.type === "changes:progress") {
        request.onProgress(message.progress);
      } else if (message.type === "changes:files") {
        request.onFiles(message.files);
      } else {
        clearTimeout(request.timer);
        requests.delete(message.requestId);
        const refused = message.result !== "cancelled" && message.result.status === "error" && message.result.detail?.startsWith("NotAllowedError");
        if (refused) abandonWorker(message.result);
        request.resolve(refused ? request.inline() : message.result);
      }
    });
    worker?.addEventListener("error", abandonWorker);
    worker?.addEventListener("messageerror", abandonWorker);
  } catch {
    worker = null;
  }
  return worker;
}

/**
 * Scans `vault` for files that differ from HEAD. `onFiles` gets changed files
 * in batches as they're found (an inline rerun after a failed worker starts
 * over, so a batch may repeat a path). `cancel()` makes the result `"cancelled"`.
 */
export function startChangesScan(
  vault: FileSystemDirectoryHandle,
  onProgress: (progress: ChangesProgress) => void,
  onFiles: (files: ChangedFile[]) => void = () => {},
): { result: Promise<ScanResult>; cancel(): void } {
  let cancelled = false;
  const target = getWorker();
  // Loaded on demand: the scan's dependencies stay out of the main bundle.
  const runInline = async () => (await import("@/app/services/git/git-changes-scan")).scanChanges(vault, { onProgress, onFiles, isCancelled: () => cancelled });
  if (!target) return { result: runInline(), cancel: () => { cancelled = true; } };

  const requestId = ++lastRequestId;
  const result = new Promise<ScanResult>((resolve) => {
    const timer = setTimeout(() => abandonWorker("no answer in " + START_TIMEOUT_MS + "ms"), START_TIMEOUT_MS);
    requests.set(requestId, { onProgress, onFiles, resolve, inline: runInline, timer });
    try {
      target.postMessage({ type: "changes:scan", requestId, vault } satisfies GitChangesRequest);
    } catch {
      clearTimeout(timer);
      requests.delete(requestId);
      resolve(runInline());
    }
  });
  return {
    result,
    cancel: () => {
      cancelled = true;
      try {
        target.postMessage({ type: "changes:cancel", requestId } satisfies GitChangesRequest);
      } catch {
        // The inline fallback (if any) checks `cancelled`.
      }
    },
  };
}
