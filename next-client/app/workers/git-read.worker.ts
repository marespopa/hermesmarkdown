// app/workers/git-read.worker.ts — reads a vault's `.git` folder for the
// editor's Git Changes gutter (see git-read-protocol.ts). Keeps the repo,
// pack index and object caches between requests so panes share them.
import { readHead, readHeadBlob } from "../services/git/git-read";
import type { GitReadRequest, GitReadResponse } from "./git-read-protocol";

self.onmessage = async (event: MessageEvent<GitReadRequest>) => {
  const message = event.data;
  if (message?.type === "git:head") {
    const head = await readHead(message.vault);
    self.postMessage({ type: "git:head", requestId: message.requestId, ...head } satisfies GitReadResponse);
  } else if (message?.type === "git:blob") {
    const blob = await readHeadBlob(message.vault, message.commit, message.path);
    self.postMessage({ type: "git:blob", requestId: message.requestId, ...blob } satisfies GitReadResponse);
  }
};
