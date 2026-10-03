"use client";

import { useAtom, useStore } from "jotai";
import { atom_openFiles, atom_liveHandles, atom_isVaultPending } from "@/app/atoms/atoms";
import { reconcileWithDisk } from "@/app/hooks/file-system/reconcile-disk";
import { createFileObserver } from "@/app/hooks/file-system/file-observer";
import { indexNoteContent } from "@/app/services/content-search-client";
import { useCallback, useEffect, useRef, useState } from "react";

const MIN_INTERVAL = 30_000;
const MAX_INTERVAL = 5 * 60_000;
const BACKOFF = 2;
// Coalesces bursts of observer records (git pull, multi-file scripts)
const OBSERVER_DEBOUNCE = 250;

export function useFileWatcher() {
  const [, setOpenFiles] = useAtom(atom_openFiles);
  const [isVaultPending] = useAtom(atom_isVaultPending);
  const store = useStore();

  const [isChecking, setIsChecking] = useState(false);
  const isCheckingRef = useRef(false);
  const isVaultPendingRef = useRef(isVaultPending);
  const intervalRef = useRef(MIN_INTERVAL);
  const wakeupRef = useRef<(() => void) | null>(null);
  // A check was requested while one was already running — run again after it
  const pendingRef = useRef(false);

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
      // Only poll native File System Access handles
      if (!handle || !("kind" in handle)) continue;

      try {
        const file = await (handle as FileSystemFileHandle).getFile();
        const stored = openFiles[path];
        if (!stored) continue;

        // `!==` rather than `>` so tabs with no recorded mtime still get
        // checked; reconcileWithDisk no-ops when the content is unchanged.
        if (file.lastModified !== (stored.lastModified ?? 0)) {
          const remoteContent = await file.text();
          // Disk wins for the note-text index too (as for the tab below).
          indexNoteContent([{ path, name: handle.name, content: remoteContent, modifiedAt: file.lastModified }]);

          setOpenFiles((prev) => {
            const fileState = prev[path];
            if (!fileState) return prev;
            const reconciled = reconcileWithDisk(fileState, remoteContent, file.lastModified);
            return reconciled === fileState ? prev : { ...prev, [path]: reconciled };
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
        if (pendingRef.current) {
          pendingRef.current = false;
        } else {
          await new Promise<void>(resolve => {
            const id = setTimeout(resolve, intervalRef.current);
            wakeupRef.current = () => { clearTimeout(id); resolve(); };
          });
        }
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

  // Native change notifications (Chromium FileSystemObserver) → near-instant
  // check. Polling above stays on as the fallback for missed events and for
  // browsers without the API.
  useEffect(() => {
    let debounceId: ReturnType<typeof setTimeout> | undefined;

    const observer = createFileObserver(() => {
      clearTimeout(debounceId);
      debounceId = setTimeout(() => {
        intervalRef.current = MIN_INTERVAL;
        if (wakeupRef.current) wakeupRef.current();
        else pendingRef.current = true;
      }, OBSERVER_DEBOUNCE);
    });
    if (!observer) return;

    const syncObserved = () => {
      const handles = new Map<string, FileSystemFileHandle>();
      for (const path of Object.keys(store.get(atom_openFiles))) {
        if (path === "draft") continue;
        const handle = store.get(atom_liveHandles(path));
        if (handle && "kind" in handle) handles.set(path, handle);
      }
      observer.sync(handles);
    };

    // Opening a file sets its live handle just after the openFiles entry, so
    // sync on the next tick rather than inside the subscription.
    let syncId: ReturnType<typeof setTimeout> | undefined;
    const scheduleSync = () => {
      clearTimeout(syncId);
      syncId = setTimeout(syncObserved, 0);
    };

    syncObserved();
    const unsubscribe = store.sub(atom_openFiles, scheduleSync);
    return () => {
      unsubscribe();
      clearTimeout(syncId);
      clearTimeout(debounceId);
      observer.disconnect();
    };
  }, [store]);

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
