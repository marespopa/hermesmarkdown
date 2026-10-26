// app/workers/text-grep.worker.ts — searches text files for the palette's
// `/` scope and Replace in Files (see text-grep-protocol.ts). One search at
// a time: a newer request, or `grep:cancel`, stops the running one; a replace
// scan likewise (`replace:cancel`).
import { scanForReplace } from "./replace-scan";
import { grepFiles } from "./text-grep";
import type { GrepRequest, GrepResults, ReplaceScanResults } from "./text-grep-protocol";

let currentId = 0;
// The replace scan runs on its own worker instance but keeps its own id.
let currentScanId = 0;

self.onmessage = (event: MessageEvent<GrepRequest>) => {
  const message = event.data;
  if (message?.type === "grep:cancel") {
    currentId = 0;
    return;
  }
  if (message?.type === "replace:cancel") {
    currentScanId = 0;
    return;
  }
  if (message?.type === "replace:scan") {
    const { scanId, query, files } = message;
    currentScanId = scanId;
    void scanForReplace(
      files,
      query,
      (progress) => self.postMessage({ type: "replace:results", scanId, ...progress } satisfies ReplaceScanResults),
      () => currentScanId !== scanId,
    );
    return;
  }
  if (message?.type !== "grep:search") return;
  const { searchId, query, files, limit, mode } = message;
  currentId = searchId;
  void grepFiles(
    files,
    query,
    limit,
    (progress) => self.postMessage({ type: "grep:results", searchId, ...progress } satisfies GrepResults),
    () => currentId !== searchId,
    mode,
  );
};
