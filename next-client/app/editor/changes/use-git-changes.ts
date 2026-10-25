"use client";

import { useAtom } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import { atom_gitChangesCache } from "@/app/atoms/atoms";
import { startChangesScan } from "@/app/services/git-changes-client";
import type { ChangedFile, ChangesProgress, ChangesResult } from "@/app/services/git/git-changes-types";

interface Latest {
  vault: FileSystemDirectoryHandle;
  result: ChangesResult;
}

/**
 * The Changes page's scan of `vault` against HEAD. Starts when `enabled`, and
 * again on window focus and when the page becomes visible (a trigger during a
 * scan queues one rescan). The last result for the same vault shows at once
 * from the cache while the new scan runs; without one, `found` holds the
 * changed files the running scan has found so far, sorted by path, so the
 * page can show them before the scan ends. Leaving cancels the scan.
 */
export function useGitChanges(vault: FileSystemDirectoryHandle | null, enabled: boolean) {
  const [cache, setCache] = useAtom(atom_gitChangesCache);
  const [latest, setLatest] = useState<Latest | null>(null);
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
    );
    running.current = scan;
    void scan.result.then((result) => {
      if (token.current !== mine) return;
      running.current = null;
      setScanning(false);
      setProgress(null);
      setFound([]);
      if (result !== "cancelled") {
        setLatest({ vault, result });
        if (result.status !== "error") setCache({ vault, result });
      }
      if (rerun.current) {
        rerun.current = false;
        startRef.current();
      }
    });
  }, [vault, enabled, setCache]);

  useEffect(() => {
    startRef.current = start;
  }, [start]);

  useEffect(() => {
    start();
    return () => {
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
