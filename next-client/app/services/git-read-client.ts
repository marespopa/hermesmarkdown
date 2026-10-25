"use client";

// Main-thread side of the git reader (app/workers/git-read.worker.ts). The
// worker starts on the first call, so nothing runs until Git Changes is on.
// Without Worker (tests, old browsers) the same reads run inline.

import type { GitReadRequest, GitReadResponse } from "@/app/workers/git-read-protocol";
import { readHead, readHeadBlob, type BlobResult, type HeadResult } from "@/app/services/git/git-read";

let worker: Worker | null | undefined;
let lastRequestId = 0;
const pending = new Map<number, (response: GitReadResponse) => void>();
const inFlight = new Map<string, Promise<unknown>>();
const vaultIds = new WeakMap<object, number>();
let nextVaultId = 0;

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = typeof Worker === "undefined" ? null : new Worker(new URL("../workers/git-read.worker.ts", import.meta.url));
    worker?.addEventListener("message", (event: MessageEvent<GitReadResponse>) => {
      pending.get(event.data.requestId)?.(event.data);
      pending.delete(event.data.requestId);
    });
  } catch {
    worker = null;
  }
  return worker;
}

function ask(target: Worker, build: (requestId: number) => GitReadRequest): Promise<GitReadResponse> {
  return new Promise((resolve, reject) => {
    const requestId = ++lastRequestId;
    pending.set(requestId, resolve);
    try {
      target.postMessage(build(requestId));
    } catch (error) {
      pending.delete(requestId);
      reject(error);
    }
  });
}

function dedupe<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const promise = run().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

function vaultKey(vault: FileSystemDirectoryHandle): number {
  let id = vaultIds.get(vault);
  if (id === undefined) vaultIds.set(vault, (id = ++nextVaultId));
  return id;
}

/** Where HEAD is. `available` is false when the vault has no usable `.git` at its root. */
export function getHead(vault: FileSystemDirectoryHandle): Promise<HeadResult> {
  return dedupe("head:" + vaultKey(vault), async () => {
    const target = getWorker();
    if (!target) return readHead(vault);
    try {
      const response = (await ask(target, (requestId) => ({ type: "git:head", requestId, vault }))) as Extract<GitReadResponse, { type: "git:head" }>;
      return { available: response.available, commit: response.commit, stamp: response.stamp };
    } catch {
      return readHead(vault);
    }
  });
}

/** HEAD's text for `path` (vault-relative). */
export function getHeadBlob(vault: FileSystemDirectoryHandle, commit: string, path: string): Promise<BlobResult> {
  return dedupe("blob:" + vaultKey(vault) + ":" + commit + ":" + path, async () => {
    const target = getWorker();
    if (!target) return readHeadBlob(vault, commit, path);
    try {
      const response = (await ask(target, (requestId) => ({ type: "git:blob", requestId, vault, commit, path }))) as Extract<GitReadResponse, { type: "git:blob" }>;
      return { status: response.status, text: response.text };
    } catch {
      return readHeadBlob(vault, commit, path);
    }
  });
}
