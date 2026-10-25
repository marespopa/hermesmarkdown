"use client";

// Main-thread side of the Changes scan (app/workers/git-changes.worker.ts).
// The worker starts on the first scan. Without Worker (tests, old browsers),
// or when posting fails, the same scan runs inline.

import type { ChangesProgress, ChangesResult } from "@/app/services/git/git-changes-types";
import type { GitChangesRequest, GitChangesResponse } from "@/app/workers/git-changes-protocol";

type ScanResult = ChangesResult | "cancelled";

let worker: Worker | null | undefined;
let lastRequestId = 0;
const pending = new Map<number, (result: ScanResult) => void>();
const progressHandlers = new Map<number, (progress: ChangesProgress) => void>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = typeof Worker === "undefined" ? null : new Worker(new URL("../workers/git-changes.worker.ts", import.meta.url));
    worker?.addEventListener("message", (event: MessageEvent<GitChangesResponse>) => {
      const message = event.data;
      if (message.type === "changes:progress") {
        progressHandlers.get(message.requestId)?.(message.progress);
      } else {
        pending.get(message.requestId)?.(message.result);
        pending.delete(message.requestId);
        progressHandlers.delete(message.requestId);
      }
    });
  } catch {
    worker = null;
  }
  return worker;
}

/** Scans `vault` for files that differ from HEAD. `cancel()` makes the result `"cancelled"`. */
export function startChangesScan(
  vault: FileSystemDirectoryHandle,
  onProgress: (progress: ChangesProgress) => void,
): { result: Promise<ScanResult>; cancel(): void } {
  let cancelled = false;
  const target = getWorker();
  // Loaded on demand: the scan's dependencies stay out of the main bundle.
  const runInline = async () => (await import("@/app/services/git/git-changes-scan")).scanChanges(vault, { onProgress, isCancelled: () => cancelled });
  if (!target) return { result: runInline(), cancel: () => { cancelled = true; } };

  const requestId = ++lastRequestId;
  const result = new Promise<ScanResult>((resolve) => {
    pending.set(requestId, resolve);
    progressHandlers.set(requestId, onProgress);
    try {
      target.postMessage({ type: "changes:scan", requestId, vault } satisfies GitChangesRequest);
    } catch {
      pending.delete(requestId);
      progressHandlers.delete(requestId);
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
