"use client";

import { useAtom, useAtomValue, useStore } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import { atom_fileMetadata, atom_gitChangesCache, atom_vaultKey, atom_vaultTextFiles } from "@/app/atoms/atoms";
import type { KnownFile } from "@/app/services/git/git-changes-scan";
import { loadChangesCache, saveChangesCache } from "@/app/services/changes-cache";
import { startChangesScan } from "@/app/services/git-changes-client";
import type { ChangedFile, ChangesProgress, ChangesResult } from "@/app/services/git/git-changes-types";
import { reuseUnchanged } from "./reuse-result";

interface Latest {
  vault: FileSystemDirectoryHandle;
  result: ChangesResult;
}

/**
 * The Changes page's scan of `vault` against HEAD. Starts when `enabled`, and
 * again on window focus and when the page becomes visible (a trigger during a
 * scan queues one rescan). The last result for the same vault shows at once
 * from the cache while the new scan runs (after a reload, from the result
 * saved for the vault's key in IndexedDB, services/changes-cache.ts); without one, `found` holds the
 * changed files the running scan has found so far, sorted by path, so the
 * page can show them before the scan ends. A new result keeps the previous
 * one's objects for the files that didn't change (reuse-result.ts), so a
 * focus rescan that finds nothing new re-renders nothing. Leaving cancels
 * the scan.
 */
export function useGitChanges(vault: FileSystemDirectoryHandle | null, enabled: boolean) {
  const [cache, setCache] = useAtom(atom_gitChangesCache);
  const vaultKey = useAtomValue(atom_vaultKey);
  const store = useStore();
  const [latest, setLatest] = useState<Latest | null>(null);
  // The same as `latest`, for the scan's callback (which outlives the render it started in).
  const latestRef = useRef<Latest | null>(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<ChangesProgress | null>(null);
  const [found, setFound] = useState<ChangedFile[]>([]);
  const running = useRef<{ cancel(): void } | null>(null);
  const rerun = useRef(false);
  const token = useRef(0);
  const startRef = useRef<() => void>(() => {});

  const start = useCallback(() => {
    if (!vault || !enabled) return;
    if (running.current) {
      rerun.current = true;
      return;
    }
    const mine = ++token.current;
    setScanning(true);
    setFound([]);
    // The notes and text files the vault index already has handles for: the scan checks those first.
    const known: KnownFile[] = [
      ...Object.values(store.get(atom_fileMetadata)).flatMap((meta) => (meta.handle ? [{ path: meta.path, handle: meta.handle as FileSystemFileHandle }] : [])),
      ...store.get(atom_vaultTextFiles),
    ];
    const scan = startChangesScan(
      vault,
      (next) => {
        if (token.current === mine) setProgress(next);
      },
      (files) => {
        if (token.current !== mine) return;
        setFound((current) => {
          const byPath = new Map(current.map((file) => [file.path, file]));
          for (const file of files) byPath.set(file.path, file);
          return [...byPath.values()].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
        });
      },
      known,
    );
    running.current = scan;
    void scan.result.then((result) => {
      if (token.current !== mine) return;
      running.current = null;
      setScanning(false);
      setProgress(null);
      setFound([]);
      if (result !== "cancelled") {
        const cached = store.get(atom_gitChangesCache);
        const shown = latestRef.current?.vault === vault ? latestRef.current : cached?.vault === vault ? cached : null;
        const next = reuseUnchanged(shown?.result ?? null, result);
        if (latestRef.current?.vault !== vault || latestRef.current.result !== next) {
          latestRef.current = { vault, result: next };
          setLatest(latestRef.current);
        }
        // Saved only when it changed: an unchanged result is already in the cache.
        if (next !== shown?.result && next.status !== "error") {
          setCache({ vault, result: next });
          if (vaultKey) void saveChangesCache(vaultKey, next);
        }
      }
      if (rerun.current) {
        rerun.current = false;
        startRef.current();
      }
    });
  }, [vault, enabled, setCache, vaultKey, store]);

  // The saved result for this vault, unless one is already in memory.
  useEffect(() => {
    if (!vault || !enabled || !vaultKey) return;
    let cancelled = false;
    void loadChangesCache(vaultKey).then((saved) => {
      if (!cancelled && saved) setCache((current) => (current?.vault === vault ? current : { vault, result: saved }));
    });
    return () => {
      cancelled = true;
    };
  }, [vault, enabled, vaultKey, setCache]);

  useEffect(() => {
    startRef.current = start;
  }, [start]);

  useEffect(() => {
    start();
    return () => {
      // A counter, not a DOM node: cleanup must bump the live value.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      token.current++;
      running.current?.cancel();
      running.current = null;
      rerun.current = false;
      setScanning(false);
      setProgress(null);
    };
  }, [start]);

  useEffect(() => {
    const onFocus = () => startRef.current();
    const onVisible = () => {
      if (document.visibilityState === "visible") startRef.current();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const result = latest?.vault === vault ? latest.result : cache?.vault === vault ? cache.result : null;
  return { result: vault ? result : null, found: vault ? found : [], scanning, progress, rescan: start };
}
