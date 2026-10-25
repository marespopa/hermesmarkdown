// app/workers/git-changes.worker.ts — scans a vault for files that differ from
// HEAD for the Changes page (see git-changes-protocol.ts). Separate from
// git-read.worker.ts so a long scan never delays the editor's blob reads.
import { scanChanges } from "../services/git/git-changes-scan";
import type { GitChangesRequest, GitChangesResponse } from "./git-changes-protocol";

const cancelled = new Set<number>();

self.onmessage = async (event: MessageEvent<GitChangesRequest>) => {
  const message = event.data;
  if (message?.type === "changes:cancel") {
    cancelled.add(message.requestId);
  } else if (message?.type === "changes:scan") {
    const { requestId, vault, known } = message;
    // Tells the page this worker runs; without it the page scans on its own.
    self.postMessage({ type: "changes:started", requestId } satisfies GitChangesResponse);
    const result = await scanChanges(vault, {
      known,
      isCancelled: () => cancelled.has(requestId),
      onProgress: (progress) => self.postMessage({ type: "changes:progress", requestId, progress } satisfies GitChangesResponse),
      onFiles: (files) => self.postMessage({ type: "changes:files", requestId, files } satisfies GitChangesResponse),
    });
    cancelled.delete(requestId);
    self.postMessage({ type: "changes:result", requestId, result } satisfies GitChangesResponse);
  }
};
