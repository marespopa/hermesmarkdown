"use client";

import { useAtom, useAtomValue } from "jotai";
import {
  atom_activeFileHandle,
  atom_content,
  atom_lastSavedContent,
  atom_fileLastModified,
  atom_fileConflict,
  atom_isVaultPending,
} from "@/app/atoms/atoms";
import { atom_driveAuthState } from "@/app/atoms/drive-atoms";
import { useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { useInterval } from "./use-interval";

const FILE_SYNC_INTERVAL = 60 * 1000; // 1 minute

export function useFileSync() {
  const [activeFileHandle] = useAtom(atom_activeFileHandle);
  const [content, setContent] = useAtom(atom_content);
  const [lastSavedContent, setLastSavedContent] = useAtom(atom_lastSavedContent);
  const [fileLastModified, setFileLastModified] = useAtom(atom_fileLastModified);
  const [, setFileConflict] = useAtom(atom_fileConflict);
  const [isVaultPending] = useAtom(atom_isVaultPending);
  const driveAuthState = useAtomValue(atom_driveAuthState);

  const lastHandleRef = useRef<FileSystemFileHandle | null>(null);

  const checkSync = useCallback(async () => {
    if (!activeFileHandle || isVaultPending) return;

    try {
      const file = await activeFileHandle.getFile();
      
      // If we switched files, don't trigger the "updated externally" toast
      const isNewFile = activeFileHandle !== lastHandleRef.current;
      
      if (fileLastModified && file.lastModified > fileLastModified) {
        const remoteContent = await file.text();
        const isDirty = content !== lastSavedContent;

        if (!isDirty) {
          // Auto-sync if no local changes
          setContent(remoteContent);
          setLastSavedContent(remoteContent);
          setFileLastModified(file.lastModified);
          
          if (!isNewFile) {
            toast.success("File updated externally", { icon: "🔄" });
          }
        } else {
          // Potential conflict if there are local changes
          if (remoteContent !== content) {
            setFileConflict({ remoteContent });
          } else {
            // Content is same, just update timestamp to avoid re-triggering
            setFileLastModified(file.lastModified);
            setLastSavedContent(remoteContent);
          }
        }
      }
      
      lastHandleRef.current = activeFileHandle;
    } catch (err: any) {
      // Very quiet on sync check failures as they are extremely common with cloud sync
      const isExpected = 
        err.name === "InvalidStateError" || 
        err.name === "NotFoundError" ||
        err.message?.includes("locked") ||
        err.message?.includes("state had changed") ||
        err.message?.includes("Network error");
      
      if (!isExpected) {
        console.warn("Sync check failed (unexpected):", err);
      }
    }
  }, [
    activeFileHandle,
    content,
    lastSavedContent,
    fileLastModified,
    isVaultPending,
    setContent,
    setLastSavedContent,
    setFileLastModified,
    setFileConflict,
  ]);

  // Periodic sync
  useInterval(checkSync, FILE_SYNC_INTERVAL);

  // Use a ref to always have the latest checkSync in the focus handler without re-attaching listeners
  const checkSyncRef = useRef(checkSync);
  useEffect(() => {
    checkSyncRef.current = checkSync;
  }, [checkSync]);

  useEffect(() => {
    if (!activeFileHandle) return;

    const handleFocus = () => {
      checkSyncRef.current?.();
    };

    window.addEventListener("focus", handleFocus);
    checkSync(); // Initial check on mount or when file changes

    return () => window.removeEventListener("focus", handleFocus);
  }, [activeFileHandle, checkSync]); // We still include checkSync here to trigger initial check when it changes

  // Force an immediate check when Drive auth comes back from 'expired' — don't wait
  // for the next interval tick or window focus to catch up on the latest version.
  const prevDriveAuthRef = useRef(driveAuthState);
  useEffect(() => {
    const prev = prevDriveAuthRef.current;
    prevDriveAuthRef.current = driveAuthState;
    if (driveAuthState === 'authenticated' && prev === 'expired') {
      checkSyncRef.current?.();
    }
  }, [driveAuthState]);
}
