"use client";

import { useAtom, useSetAtom, useAtomValue } from 'jotai';
import { useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  atom_vaultHandle,
  atom_currentDirectoryHandle,
  atom_vaultFiles,
  atom_isVaultPending,
  atom_indexerState,
  atom_activeFilePath,
  atom_activeFileHandle,
  atom_openFiles,
  atom_workspaceLayout,
  atom_rebindDriveHandles,
} from '@/app/atoms/atoms';
import { atom_fileMetadata } from '@/app/atoms/metadata';
import {
  atom_driveVaultId,
  atom_driveVaultName,
  atom_driveAuthState,
  atom_drivePathIndex,
  atom_isDriveVault,
  atom_showDriveFolderPicker,
  atom_hasDriveLoaded,
} from '@/app/atoms/drive-atoms';
import { DrivePathIndex } from '@/app/services/drive/path-index';
import { DriveFileHandle } from '@/app/services/drive/DriveFileHandle';
import { DriveDirectoryHandle } from '@/app/services/drive/DriveDirectoryHandle';
import { listFiles, FOLDER_MIME } from '@/app/services/drive/client';
import { isTokenValid, startOAuthFlow } from '@/app/services/drive/auth';
import { metadataWorker } from '../file-system/shared';

export function useDriveVaultManager() {
  const [vaultHandle, setVaultHandle] = useAtom(atom_vaultHandle);
  const [currentDirectoryHandle, setCurrentDirectoryHandle] = useAtom(atom_currentDirectoryHandle);
  const [, setVaultFiles] = useAtom(atom_vaultFiles);
  const [isVaultPending, setIsVaultPending] = useAtom(atom_isVaultPending);
  const [, setFileMetadata] = useAtom(atom_fileMetadata);
  const setIndexerState = useSetAtom(atom_indexerState);
  const rebindDriveHandles = useSetAtom(atom_rebindDriveHandles);
  const [, setActiveFilePath] = useAtom(atom_activeFilePath);
  const [, setActiveFileHandle] = useAtom(atom_activeFileHandle);
  const [, setOpenFiles] = useAtom(atom_openFiles);
  const [, setWorkspaceLayout] = useAtom(atom_workspaceLayout);

  const [driveVaultId, setDriveVaultId] = useAtom(atom_driveVaultId);
  const [, setDriveVaultName] = useAtom(atom_driveVaultName);
  const [, setDriveAuthState] = useAtom(atom_driveAuthState);
  const [drivePathIndex, setDrivePathIndex] = useAtom(atom_drivePathIndex);
  const isDriveVault = useAtomValue(atom_isDriveVault);
  const [, setShowDriveFolderPicker] = useAtom(atom_showDriveFolderPicker);
  const [hasDriveLoaded, setHasDriveLoaded] = useAtom(atom_hasDriveLoaded);

  const pendingHandlesRef = useRef<Map<string, DriveFileHandle>>(new Map());

  const getRootHandle = useCallback((): DriveDirectoryHandle | null => {
    if (!driveVaultId) return null;
    const raw = localStorage.getItem('hermes_drive_vault_name');
    const name = raw ? JSON.parse(raw) : 'Drive';
    return new DriveDirectoryHandle(name, driveVaultId);
  }, [driveVaultId]);

  const scanVault = useCallback(async (dirHandle: any) => {
    if (!(dirHandle instanceof DriveDirectoryHandle)) return;

    try {
      const currentIndex = drivePathIndex;
      const prefix = (dirHandle as any).path ?? currentIndex?.getPathForId(dirHandle.folderId) ?? '';

      const allFiles: any[] = [];
      let pageToken: string | undefined;
      do {
        const result = await listFiles(dirHandle.folderId, pageToken);
        pageToken = result.nextPageToken;
        allFiles.push(...result.files);
      } while (pageToken);

      const entries: any[] = allFiles
        .filter(f => f.mimeType === FOLDER_MIME || f.name.endsWith('.md'))
        .map(f => {
          const entryPath = prefix ? `${prefix}/${f.name}` : f.name;
          if (f.mimeType === FOLDER_MIME) {
            const h = new DriveDirectoryHandle(f.name, f.id);
            (h as any).path = entryPath;
            return h;
          }
          const h = new DriveFileHandle(f.name, f.id);
          (h as any).path = entryPath;
          return h;
        })
        .sort((a: any, b: any) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

      setVaultFiles(entries as any);
    } catch (err: any) {
      if (err.status === 401) {
        setDriveAuthState('expired');
      }
      console.warn('Drive scanVault failed:', err);
    }
  }, [drivePathIndex, setVaultFiles, setDriveAuthState]);

  const indexVaultTags = useCallback(async (id?: string) => {
    const folderId = id || driveVaultId;
    if (!folderId) return;

    setIndexerState({ status: 'compiling', count: 0 });

    const index = new DrivePathIndex();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300000); // 5 minute timeout for Drive
    let buildSucceeded = false;

    try {
      await index.build(folderId, controller.signal, (count) => {
        setIndexerState({ status: 'compiling', count });
      });
      buildSucceeded = !controller.signal.aborted;
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        toast.error('Indexing timed out — existing index kept.', { id: 'index-timeout', duration: 5000 });
      } else {
        if (err.status === 401) {
          setDriveAuthState('expired');
        }
        console.warn('Drive index build failed:', err);
      }
    } finally {
      clearTimeout(timeout);
    }

    if (!buildSucceeded) {
      setIndexerState('idle');
      return;
    }

    setDrivePathIndex(index);

    const mdFiles = index.allEntries().filter(([p]) => p.endsWith('.md'));
    const fileHandles: { handle: DriveFileHandle; path: string }[] = mdFiles.map(([path, entry]) => ({
      path,
      handle: new DriveFileHandle(entry.name, entry.id),
    }));

    setFileMetadata(() => {
      const next: Record<string, any> = {};
      fileHandles.forEach(({ handle, path }) => {
        next[path] = { path, name: handle.name, handle, tags: [], links: [], frontmatter: {}, modifiedAt: 0, wordCount: 0 };
      });
      return next;
    });

    pendingHandlesRef.current = new Map(fileHandles.map(f => [f.path, f.handle]));

    // Process in batches of 5 to avoid hitting Google Drive rate limits too hard
    const BATCH_SIZE = 5;
    const readable: any[] = [];
    const toSend: any[] = [];
    
    for (let i = 0; i < fileHandles.length; i += BATCH_SIZE) {
      if (controller.signal.aborted) break;
      
      const batch = fileHandles.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async ({ handle, path }) => {
          try {
            const file = await handle.getFile();
            const content = await file.text();
            return { path, name: handle.name, content, modifiedAt: file.lastModified };
          } catch (err) {
            console.warn(`Failed to fetch content for ${path}:`, err);
            return null;
          }
        }),
      );
      
      const results = batchResults.filter((f): f is NonNullable<typeof f> => f !== null);
      readable.push(...results);
      toSend.push(...results);
      
      // Update progress/metadata incrementally
      if (toSend.length >= 20 && metadataWorker) {
        metadataWorker.postMessage({ files: [...toSend] });
        toSend.length = 0;
      }

      // Small delay between batches
      await new Promise(r => setTimeout(r, 100));
    }

    if (metadataWorker && toSend.length > 0) {
      metadataWorker.postMessage({ files: toSend });
    } else if (!metadataWorker || readable.length === 0) {
      setIndexerState('idle');
    }

    index.saveToCache(folderId);
  }, [driveVaultId, setDrivePathIndex, setFileMetadata, setIndexerState, setDriveAuthState]);



  // Activate a selected Drive folder as vault
  const openDriveVault = useCallback(async (folderId: string, folderName: string) => {
    setOpenFiles({});
    setWorkspaceLayout({
      rootContainer: {
        id: "default-pane",
        type: "editor",
        openFilePaths: [],
        activeFilePath: null as any,
        isPinned: false,
      },
    });
    setDriveVaultId(folderId);
    setDriveVaultName(folderName);
    setDriveAuthState('authenticated');
    const handle = new DriveDirectoryHandle(folderName, folderId);
    setIndexerState({ status: 'compiling', count: 0 });
    setVaultHandle(handle as any);
    setCurrentDirectoryHandle(handle as any);
    setIsVaultPending(false);

    const cached = DrivePathIndex.loadFromCache(folderId);
    if (cached) setDrivePathIndex(cached);

    await scanVault(handle);
    await indexVaultTags(folderId);
    toast.success(`Vault opened: ${folderName}`);
  }, [setDriveVaultId, setDriveVaultName, setDriveAuthState, setVaultHandle, setCurrentDirectoryHandle, setIsVaultPending, setIndexerState, setDrivePathIndex, setOpenFiles, setWorkspaceLayout, scanVault, indexVaultTags]);

  // Called by the folder picker's "Connect" button — first triggers OAuth if needed
  const openVault = useCallback(() => {
    setShowDriveFolderPicker(true);
  }, [setShowDriveFolderPicker]);

  const restoreVault = useCallback(async (id?: string) => {
    const vaultId = id || driveVaultId;
    if (!vaultId) return;

    if (!isTokenValid()) {
      setDriveAuthState('expired');
      startOAuthFlow();
      return;
    }

    setDriveAuthState('authenticated');
    const raw = localStorage.getItem('hermes_drive_vault_name');
    const name = raw ? JSON.parse(raw) : 'Drive';
    const handle = new DriveDirectoryHandle(name, vaultId);
    setIndexerState({ status: 'compiling', count: 0 });
    setVaultHandle(handle as any);
    setCurrentDirectoryHandle(handle as any);
    setIsVaultPending(false);

    const cached = DrivePathIndex.loadFromCache(vaultId);
    if (cached) {
      setDrivePathIndex(cached);
      const mdFiles = cached.allEntries().filter(([p]) => p.endsWith('.md'));
      setFileMetadata(() => {
        const next: Record<string, any> = {};
        mdFiles.forEach(([path, entry]) => {
          const h = new DriveFileHandle(entry.name, entry.id);
          next[path] = { path, name: h.name, handle: h, tags: [], links: [], frontmatter: {}, modifiedAt: entry.modifiedAt, wordCount: 0 };
        });
        return next;
      });
      rebindDriveHandles();
    }

    await scanVault(handle);
    indexVaultTags(vaultId); // background
  }, [driveVaultId, setDriveAuthState, setVaultHandle, setCurrentDirectoryHandle, setIsVaultPending, setIndexerState, setDrivePathIndex, setFileMetadata, scanVault, indexVaultTags, rebindDriveHandles]);


  const closeVault = useCallback(() => {
    setDriveVaultId(null);
    setDriveVaultName(null);
    setDriveAuthState('unauthenticated');
    setDrivePathIndex(null);
    setVaultHandle(null as any);
    setCurrentDirectoryHandle(null as any);
    setVaultFiles([]);
    setFileMetadata({});
    setActiveFileHandle(null as any);
    setActiveFilePath('draft');
    setOpenFiles({
      draft: { content: '', lastSavedContent: '', fileName: 'untitled', activeFilePath: 'draft' },
    });
    setWorkspaceLayout({
      rootContainer: { id: 'default-pane', type: 'editor', openFilePaths: ['draft'], activeFilePath: 'draft', isPinned: false },
    });
    toast.success('Drive vault disconnected');
  }, [setDriveVaultId, setDriveVaultName, setDriveAuthState, setDrivePathIndex, setVaultHandle, setCurrentDirectoryHandle, setVaultFiles, setFileMetadata, setActiveFileHandle, setActiveFilePath, setOpenFiles, setWorkspaceLayout]);

  const syncSidebarToPath = useCallback(async (path: string) => {
    if (!path || path === 'draft' || !driveVaultId) return;
    const index = drivePathIndex;
    if (!index) return;

    const parts = path.split('/');
    if (parts.length <= 1) {
      const rootHandle = getRootHandle();
      if (!rootHandle) return;
      setCurrentDirectoryHandle(rootHandle as any);
      await scanVault(rootHandle);
      return;
    }

    const folderPath = parts.slice(0, -1).join('/');
    const folderEntry = index.getEntry(folderPath);
    if (!folderEntry || folderEntry.mimeType !== FOLDER_MIME) return;

    const folderHandle = new DriveDirectoryHandle(folderEntry.name, folderEntry.id);
    setCurrentDirectoryHandle(folderHandle as any);
    await scanVault(folderHandle);
  }, [driveVaultId, drivePathIndex, getRootHandle, setCurrentDirectoryHandle, scanVault]);

  const navigateTo = useCallback(async (handle: any) => {
    setCurrentDirectoryHandle(handle);
    await scanVault(handle);
  }, [setCurrentDirectoryHandle, scanVault]);

  const navigateBack = useCallback(async () => {
    const rootHandle = getRootHandle();
    if (!rootHandle) return;
    setCurrentDirectoryHandle(rootHandle as any);
    await scanVault(rootHandle);
  }, [getRootHandle, setCurrentDirectoryHandle, scanVault]);

  // Worker message listener — only active when Drive vault is in use
  useEffect(() => {
    if (!metadataWorker || !isDriveVault) return;

    const handleMessage = (event: MessageEvent) => {
      const { results } = event.data;
      if (!results) return;
      setFileMetadata(prev => {
        const next = { ...prev };
        results.forEach((res: any) => {
          const handle = pendingHandlesRef.current.get(res.path);
          if (handle) next[res.path] = { ...res, handle };
        });
        return next;
      });
      rebindDriveHandles();
      setIndexerState('idle');
    };

    metadataWorker.addEventListener('message', handleMessage);
    return () => metadataWorker?.removeEventListener('message', handleMessage);
  }, [isDriveVault, setFileMetadata, setIndexerState, rebindDriveHandles]);

  // Auto-restore on mount — independent from local vault's hasLoadedVault
  useEffect(() => {
    if (hasDriveLoaded) return;
    const vaultId = typeof window !== 'undefined' ? localStorage.getItem('hermes_drive_vault_id') : null;
    if (!vaultId || vaultId === 'null') return;

    setHasDriveLoaded(true);

    if (!isTokenValid()) {
      setDriveAuthState('expired');
      return;
    }

    restoreVault();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Mount only


  return {
    vaultHandle,
    currentDirectoryHandle,
    isVaultPending,
    scanVault,
    indexVaultTags,
    openVault,
    openDriveVault,
    restoreVault,
    closeVault,
    navigateTo,
    navigateBack,
    syncSidebarToPath,
  };
}
