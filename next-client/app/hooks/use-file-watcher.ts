"use client";

import { useAtom, useStore } from "jotai";
import { atom_openFiles, atom_liveHandles, atom_isVaultPending } from "@/app/atoms/atoms";
import { useCallback, useEffect, useRef, useState } from "react";

const MIN_INTERVAL = 30_000;
const MAX_INTERVAL = 5 * 60_000;
const BACKOFF = 2;

export function useFileWatcher() {
  const [, setOpenFiles] = useAtom(atom_openFiles);
  const [isVaultPending] = useAtom(atom_isVaultPending);
  const store = useStore();

  const [isChecking, setIsChecking] = useState(false);
  const isCheckingRef = useRef(false);
  const isVaultPendingRef = useRef(isVaultPending);
  const intervalRef = useRef(MIN_INTERVAL);
  const wakeupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    isVaultPendingRef.current = isVaultPending;
  }, [isVaultPending]);

  const checkFiles = useCallback(async () => {
    if (isVaultPendingRef.current || isCheckingRef.current) return;

    isCheckingRef.current = true;
    setIsChecking(true);

    const openFiles = store.get(atom_openFiles);
    const paths = Object.keys(openFiles).filter(p => p !== "draft");
    let anyChanged = false;

    for (const path of paths) {
      const handle = store.get(atom_liveHandles(path));
      // Only poll native File System Access handles — not Drive handles
      if (!handle || !("kind" in handle)) continue;

      try {
        const file = await (handle as FileSystemFileHandle).getFile();
        const stored = openFiles[path];
        if (!stored) continue;

        const storedModified = stored.lastModified ?? 0;
        if (storedModified > 0 && file.lastModified > storedModified) {
          const remoteContent = await file.text();
          const isDirty = stored.content !== stored.lastSavedContent;

          setOpenFiles(prev => {
            const fileState = prev[path];
            if (!fileState) return prev;

            if (!isDirty) {
              return {
                ...prev,
                [path]: {
                  ...fileState,
                  content: remoteContent,
                  lastSavedContent: remoteContent,
                  lastModified: file.lastModified,
                },
              };
            } else if (remoteContent !== fileState.content) {
              return {
                ...prev,
                [path]: {
                  ...fileState,
                  conflict: { remoteContent },
                  lastModified: file.lastModified,
                },
              };
            } else {
              return {
                ...prev,
                [path]: {
                  ...fileState,
                  lastModified: file.lastModified,
                  lastSavedContent: remoteContent,
                },
              };
            }
          });

          anyChanged = true;
        }
      } catch {
        // File may be locked or temporarily unavailable — expected in cloud sync
      }
    }

    isCheckingRef.current = false;
    setIsChecking(false);

    intervalRef.current = anyChanged
      ? MIN_INTERVAL
      : Math.min(MAX_INTERVAL, intervalRef.current * BACKOFF);
  }, [store, setOpenFiles]);

  const checkFilesRef = useRef(checkFiles);
  useEffect(() => {
    checkFilesRef.current = checkFiles;
  }, [checkFiles]);

  // Polling loop — resolves early on focus or explicit refresh()
  useEffect(() => {
    let cancelled = false;

    const loop = async () => {
      while (!cancelled) {
        await new Promise<void>(resolve => {
          const id = setTimeout(resolve, intervalRef.current);
          wakeupRef.current = () => { clearTimeout(id); resolve(); };
        });
        wakeupRef.current = null;
        if (cancelled) break;
        await checkFilesRef.current();
      }
    };

    loop();
    return () => {
      cancelled = true;
      wakeupRef.current?.();
    };
  }, []);

  // Window focus → immediate check and reset backoff
  useEffect(() => {
    const handleFocus = () => {
      intervalRef.current = MIN_INTERVAL;
      wakeupRef.current?.();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  // Imperative trigger for manual refresh
  const refresh = useCallback(async () => {
    intervalRef.current = MIN_INTERVAL;
    wakeupRef.current?.();
    // Give the loop a tick to wake up, then wait for it to finish
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  }, []);

  return { checkFiles, isChecking, refresh };
}
