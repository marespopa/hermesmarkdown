"use client";

import { useAtom, useSetAtom } from 'jotai';
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  atom_activeFileHandle,
  atom_activeFilePath,
  atom_fileName,
  atom_lastSavedContent,
  atom_fileLastModified,
  atom_fileConflict,
  atom_openFiles,
  atom_saveStatus,
  atom_autoInjectFrontmatter,
  atom_vaultSetupStatus,
} from '@/app/atoms/atoms';
import { atom_frontmatterWizardOpen, atom_vaultSetupWizardOpen } from '@/app/atoms/ui-atoms';
import { atom_driveAuthState } from '@/app/atoms/drive-atoms';
import { DriveFileHandle } from '@/app/services/drive/DriveFileHandle';
import { updateFile } from '@/app/services/drive/client';
import { injectFrontmatter } from '@/app/utils/frontmatterInjector';

export function useDriveSaveFile() {
  const [activeFileHandle, setActiveFileHandle] = useAtom(atom_activeFileHandle);
  const [activeFilePath] = useAtom(atom_activeFilePath);
  const [, setFileName] = useAtom(atom_fileName);
  const [, setOpenFiles] = useAtom(atom_openFiles);
  const [, setLastSavedContent] = useAtom(atom_lastSavedContent);
  const [, setFileLastModified] = useAtom(atom_fileLastModified);
  const [, setFileConflict] = useAtom(atom_fileConflict);
  const [, setSaveStatus] = useAtom(atom_saveStatus);
  const [autoInjectFrontmatter] = useAtom(atom_autoInjectFrontmatter);
  const setFrontmatterWizardOpen = useSetAtom(atom_frontmatterWizardOpen);
  const setVaultSetupWizardOpen = useSetAtom(atom_vaultSetupWizardOpen);
  const [vaultSetupStatus] = useAtom(atom_vaultSetupStatus);
  const [, setDriveAuthState] = useAtom(atom_driveAuthState);

  const saveFile = useCallback(
    async (
      content: string,
      handle?: any,
      retryCount = 0,
      isAutoSave = false,
      providedPath?: string,
    ): Promise<boolean> => {
      const fileHandle = (handle || activeFileHandle) as unknown as DriveFileHandle;
      if (!(fileHandle instanceof DriveFileHandle)) return false;

      const targetPath = providedPath || activeFilePath || fileHandle.name;

      setSaveStatus({ state: 'saving', retryCount, path: targetPath });

      let toWrite = autoInjectFrontmatter
        ? injectFrontmatter(content, fileHandle.name)
        : content;
      if (!toWrite) toWrite = '\n';
      const didInject = toWrite !== content;

      try {
        const savedFile = await updateFile(fileHandle.fileId, toWrite);

        // Update metadata
        const modifiedAt = new Date(savedFile.modifiedTime).getTime();
        const wasActive = !providedPath || providedPath === (activeFilePath || 'draft');

        if (wasActive) {
          setLastSavedContent(toWrite);
          setFileLastModified(modifiedAt);
          setFileConflict(null);
        }

        if (targetPath) {
          setOpenFiles(prev => {
            if (!prev[targetPath]) return prev;
            return { ...prev, [targetPath]: { ...prev[targetPath], ...(didInject ? { content: toWrite } : {}), lastSavedContent: toWrite } };
          });

          if (didInject) {
            if (vaultSetupStatus === 'needs_setup') {
              setVaultSetupWizardOpen(targetPath);
            } else {
              setFrontmatterWizardOpen(targetPath);
            }
          }
        }

        if (handle && wasActive) {
          setActiveFileHandle(handle);
          setFileName(fileHandle.name.replace('.md', ''));

          setOpenFiles(prev => {
            const next = { ...prev };
            const oldPath = providedPath || activeFilePath || 'draft';
            if (oldPath !== targetPath) {
              next[targetPath] = { content: toWrite, lastSavedContent: toWrite, fileName: fileHandle.name, activeFilePath: targetPath };
              if (oldPath === 'draft') {
                next.draft = { content: '', lastSavedContent: '', fileName: 'untitled', activeFilePath: null };
              }
            }
            return next;
          });
        }

        setSaveStatus({ state: 'saved', retryCount: 0, path: targetPath });
        setTimeout(() => setSaveStatus({ state: 'idle', retryCount: 0, path: undefined }), 2000);

        if (!isAutoSave) toast.success('Saved to ' + fileHandle.name);
        return true;
      } catch (err: any) {
        if (err.status === 401) {
          setDriveAuthState('expired');
          setSaveStatus({ state: 'error', retryCount: 0, message: 'Drive disconnected — reconnect to save', path: targetPath });
          setTimeout(() => setSaveStatus({ state: 'idle', retryCount: 0, path: undefined }), 6000);
          if (!isAutoSave) toast.error('Google Drive disconnected. Reconnect to save.');
          return false;
        }

        if (err.status === 404) {
          setSaveStatus({ state: 'error', retryCount: 0, message: 'File not found in Drive', path: targetPath });
          setTimeout(() => setSaveStatus({ state: 'idle', retryCount: 0, path: undefined }), 5000);
          if (!isAutoSave) toast.error('File was deleted from Google Drive. Your content is still open.');
          return false;
        }

        // Retry on transient errors (network issues)
        if (retryCount < 3) {
          await new Promise(r => setTimeout(r, 500 * Math.pow(2, retryCount)));
          return saveFile(content, handle, retryCount + 1, isAutoSave, providedPath);
        }

        setSaveStatus({ state: 'error', retryCount: 0, message: err.message, path: targetPath });
        setTimeout(() => setSaveStatus({ state: 'idle', retryCount: 0, path: undefined }), 5000);
        if (!isAutoSave) toast.error(`Failed to save: ${err.message}`);
        return false;
      }
    },
    [
      activeFileHandle,
      activeFilePath,
      autoInjectFrontmatter,
      vaultSetupStatus,
      setActiveFileHandle,
      setFileName,
      setOpenFiles,
      setLastSavedContent,
      setFileLastModified,
      setFileConflict,
      setSaveStatus,
      setFrontmatterWizardOpen,
      setVaultSetupWizardOpen,
      setDriveAuthState,
    ],
  );

  return { saveFile };
}
