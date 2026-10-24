// app/workers/text-grep.worker.ts — searches text files for the palette's
// `/` scope (see text-grep-protocol.ts). One search at a time: a newer
// request, or `grep:cancel`, stops the running one.
import { grepFiles } from "./text-grep";
import type { GrepRequest, GrepResults } from "./text-grep-protocol";

let currentId = 0;

self.onmessage = (event: MessageEvent<GrepRequest>) => {
  const message = event.data;
  if (message?.type === "grep:cancel") {
    currentId = 0;
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
