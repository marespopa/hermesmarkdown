"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAtom } from "jotai";
import { HiOutlineFolder, HiOutlineRefresh } from "react-icons/hi";
import {
  atom_showDriveFolderPicker,
  atom_driveAuthState,
} from "@/app/atoms/drive-atoms";
import { listFiles, FOLDER_MIME } from "@/app/services/drive/client";
import { startOAuthFlow, isTokenValid } from "@/app/services/drive/auth";
import DialogModal from "@/app/components/DialogModal/DialogModal";

interface Props {
  onSelect: (folderId: string, folderName: string) => void;
}

interface FolderRow {
  id: string;
  name: string;
  parentId?: string;
}

export default function GoogleDriveFolderPicker({ onSelect }: Props) {
  const [isOpen, setIsOpen] = useAtom(atom_showDriveFolderPicker);
  const [authState, setAuthState] = useAtom(atom_driveAuthState);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<FolderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFolders = useCallback(async (folderId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await listFiles(folderId);
      setFolders(
        result.files
          .filter(f => f.mimeType === FOLDER_MIME)
          .map(f => ({ id: f.id, name: f.name })),
      );
    } catch (err: any) {
      if (err.status === 401) {
        setAuthState("expired");
        setError("Drive session expired. Please reconnect.");
      } else {
        setError("Failed to load folders: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [setAuthState]);

  useEffect(() => {
    if (!isOpen) return;
    if (!isTokenValid()) {
      setAuthState(prev => prev !== 'authenticated' ? 'expired' : prev);
      return;
    }
    loadFolders("root");
  }, [isOpen, loadFolders, setAuthState]);

  const navigate = (folder: FolderRow) => {
    setBreadcrumbs(prev => [...prev, folder]);
    loadFolders(folder.id);
  };

  const navigateBack = (index: number) => {
    const next = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(next);
    loadFolders(next.length ? next[next.length - 1].id : "root");
  };

  const selectCurrent = () => {
    if (breadcrumbs.length === 0) {
      setError("Please navigate into a folder to use as your vault.");
      return;
    }
    const chosen = breadcrumbs[breadcrumbs.length - 1];
    onSelect(chosen.id, chosen.name);
    setIsOpen(false);
    setBreadcrumbs([]);
  };

  const handleClose = () => {
    setIsOpen(false);
    setBreadcrumbs([]);
  };

  const needsAuth = authState === "expired" || authState === "unauthenticated" || !isTokenValid();

  return (
    <DialogModal
      isOpened={isOpen}
      onClose={handleClose}
      styles="max-w-md"
      ariaLabelledBy="drive-picker-title"
    >
      <h2
        id="drive-picker-title"
        className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-4"
      >
        {needsAuth ? "Connect Google Drive" : "Select a Google Drive Folder"}
      </h2>

      {needsAuth ? (
        <div className="space-y-4 text-center py-2">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Sign in with Google to access your Drive folders.
          </p>
          <button
            onClick={() => startOAuthFlow()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Sign in with Google
          </button>
        </div>
      ) : (
        <>
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 overflow-x-auto pb-3 mb-1 border-b border-neutral-200 dark:border-neutral-700">
            <button
              onClick={() => { setBreadcrumbs([]); loadFolders("root"); }}
              className="hover:text-neutral-900 dark:hover:text-neutral-100 shrink-0"
            >
              My Drive
            </button>
            {breadcrumbs.map((b, i) => (
              <React.Fragment key={b.id}>
                <span className="mx-0.5">/</span>
                <button
                  onClick={() => navigateBack(i)}
                  className="hover:text-neutral-900 dark:hover:text-neutral-100 shrink-0 max-w-32 truncate"
                >
                  {b.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Folder list */}
          <div className="overflow-y-auto max-h-56 -mx-2 px-2 py-1 mb-3">
            {loading && (
              <div className="flex items-center justify-center py-8 text-neutral-400">
                <HiOutlineRefresh size={18} className="animate-spin mr-2" />
                <span className="text-sm">Loading…</span>
              </div>
            )}
            {!loading && error && (
              <p className="text-sm text-red-500 py-4 text-center">{error}</p>
            )}
            {!loading && !error && folders.length === 0 && (
              <p className="text-sm text-neutral-400 py-4 text-center">No subfolders here.</p>
            )}
            {!loading && !error && folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => navigate(folder)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left text-sm text-neutral-800 dark:text-neutral-200 transition-colors"
              >
                <HiOutlineFolder size={16} className="text-neutral-400 shrink-0" />
                <span className="truncate">{folder.name}</span>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
            <p className="text-xs text-neutral-400 truncate">
              {breadcrumbs.length
                ? `Using: ${breadcrumbs[breadcrumbs.length - 1].name}`
                : "Navigate into a folder"}
            </p>
            <button
              onClick={selectCurrent}
              disabled={breadcrumbs.length === 0}
              className="shrink-0 px-4 py-1.5 bg-blue-600 disabled:opacity-40 text-white rounded-xl text-xs font-medium hover:bg-blue-700 transition-colors"
            >
              Use this Folder
            </button>
          </div>
        </>
      )}
    </DialogModal>
  );
}
