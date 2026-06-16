"use client";

import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  atom_currentDirectoryHandle,
  atom_activeFileHandle,
  atom_fileName,
  atom_activeFilePath,
  atom_openFiles,
  atom_workspaceLayout,
  atom_autoInjectFrontmatter,
  atom_vaultSetupStatus,
} from '@/app/atoms/atoms';
import { atom_fileMetadata } from '@/app/atoms/metadata';
import { atom_vaultFiles } from '@/app/atoms/vault-atoms';
import { atom_frontmatterWizardOpen, atom_vaultSetupWizardOpen } from '@/app/atoms/ui-atoms';
import {
  atom_driveVaultId,
  atom_drivePathIndex,
  atom_driveAuthState,
} from '@/app/atoms/drive-atoms';
import { DriveFileHandle } from '@/app/services/drive/DriveFileHandle';
import { DriveDirectoryHandle } from '@/app/services/drive/DriveDirectoryHandle';
import { FOLDER_MIME } from '@/app/services/drive/client';
import * as client from '@/app/services/drive/client';
import { injectFrontmatter } from '@/app/utils/frontmatterInjector';
import { useDialog } from '../use-dialog';

interface Props {
  scanVault: (handle: any) => Promise<void>;
  indexVaultTags?: (handle?: any) => Promise<void>;
  openFile: (handle: any, path?: string, force?: boolean) => Promise<void>;
}

export function useDriveFileCrud({ scanVault, openFile }: Props) {
  const [currentDirectoryHandle] = useAtom(atom_currentDirectoryHandle);
  const [activeFileHandle, setActiveFileHandle] = useAtom(atom_activeFileHandle);
  const [, setFileName] = useAtom(atom_fileName);
  const [, setActiveFilePath] = useAtom(atom_activeFilePath);
  const [, setOpenFiles] = useAtom(atom_openFiles);
  const [, setWorkspaceLayout] = useAtom(atom_workspaceLayout);
  const setFileMetadata = useSetAtom(atom_fileMetadata);
  const setVaultFiles = useSetAtom(atom_vaultFiles);
  const [autoInjectFrontmatter] = useAtom(atom_autoInjectFrontmatter);
  const setFrontmatterWizardOpen = useSetAtom(atom_frontmatterWizardOpen);
  const setVaultSetupWizardOpen = useSetAtom(atom_vaultSetupWizardOpen);
  const [vaultSetupStatus] = useAtom(atom_vaultSetupStatus);
  const driveVaultId = useAtomValue(atom_driveVaultId);
  const [drivePathIndex, setDrivePathIndex] = useAtom(atom_drivePathIndex);
  const [, setDriveAuthState] = useAtom(atom_driveAuthState);
  const vaultFiles = useAtomValue(atom_vaultFiles);
  const dialog = useDialog();

  const currentDirHandle = useCallback((): DriveDirectoryHandle | null => {
    const dir = currentDirectoryHandle as any;
    if (dir instanceof DriveDirectoryHandle) return dir;
    if (driveVaultId) {
      const raw = localStorage.getItem('hermes_drive_vault_name');
      const name = raw ? JSON.parse(raw) : 'Drive';
      return new DriveDirectoryHandle(name, driveVaultId);
    }
    return null;
  }, [currentDirectoryHandle, driveVaultId]);

  const buildPath = useCallback((fileName: string, parentFolderId: string): string => {
    if (!drivePathIndex) return fileName;
    const parentPath = drivePathIndex.getPathForId(parentFolderId);
    return parentPath ? `${parentPath}/${fileName}` : fileName;
  }, [drivePathIndex]);

  const createFile = useCallback(
    async (name: string, content: string = '', dirOverride?: any) => {
      const targetDir: DriveDirectoryHandle | null =
        (dirOverride instanceof DriveDirectoryHandle ? dirOverride : null) || currentDirHandle();
      if (!targetDir) return null;

      const baseName = name.endsWith('.md') ? name.slice(0, -3) : name;
      let fileName = `${baseName}.md`;

      // Unique name: check path index
      if (drivePathIndex) {
        let counter = 1;
        const existingPath = buildPath(fileName, targetDir.folderId);
        while (drivePathIndex.getEntry(existingPath)) {
          fileName = `${baseName} (${counter++}).md`;
        }
      }

      let toWrite = autoInjectFrontmatter ? injectFrontmatter(content, fileName) : content;
      if (!toWrite) toWrite = '\n';
      const didInject = toWrite !== content;

      try {
        const driveFile = await client.createFile(fileName, targetDir.folderId, toWrite);
        const handle = new DriveFileHandle(driveFile.name, driveFile.id);
        const path = buildPath(fileName, targetDir.folderId);

        // Update path index
        if (drivePathIndex) {
          drivePathIndex.addEntry(path, {
            id: driveFile.id,
            name: driveFile.name,
            mimeType: 'text/markdown',
            modifiedAt: new Date(driveFile.modifiedTime).getTime(),
            parentId: targetDir.folderId,
          });
          setDrivePathIndex(drivePathIndex);
        }

        (handle as any).path = path;
        await scanVault(targetDir);
        await openFile(handle, path, true);

        if (didInject) {
          if (vaultSetupStatus === 'needs_setup') {
            setVaultSetupWizardOpen(path);
          } else {
            setFrontmatterWizardOpen(path);
          }
        }

        toast.success('Created: ' + fileName);
        return handle;
      } catch (err: any) {
        if (err.status === 401) setDriveAuthState('expired');
        console.warn('Drive createFile error:', err);
        toast.error('Failed to create file');
        return null;
      }
    },
    [currentDirHandle, drivePathIndex, buildPath, autoInjectFrontmatter, scanVault, openFile, vaultSetupStatus, setVaultSetupWizardOpen, setFrontmatterWizardOpen, setDrivePathIndex, setDriveAuthState],
  );

  const createNewFile = useCallback(async (dirHandle?: any) => {
    if (!driveVaultId) return;

    // Use the recursive path index (covers nested subfolders), falling back to the
    // shallow current-directory scan if the index hasn't built yet.
    const subDirEntries = drivePathIndex
      ? drivePathIndex.allEntries().filter(([, entry]) => entry.mimeType === FOLDER_MIME)
      : null;
    const subDirs = subDirEntries
      ? subDirEntries
          .map(([path, entry]) => {
            const h = new DriveDirectoryHandle(entry.name, entry.id);
            (h as any).path = path;
            return h;
          })
          .sort((a, b) => ((a as any).path < (b as any).path ? -1 : 1))
      : ((vaultFiles as any[]).filter(f => f instanceof DriveDirectoryHandle) as DriveDirectoryHandle[]);

    let targetDir: DriveDirectoryHandle = currentDirHandle() || new DriveDirectoryHandle('Drive', driveVaultId);

    if (!dirHandle) {
      const rawName = localStorage.getItem('hermes_drive_vault_name');
      const rootName = rawName ? JSON.parse(rawName) : 'Drive';
      const options = [
        { label: `/ ${rootName} (root)`, value: '__root__' },
        ...subDirs.map(d => ({ label: (d as any).path || d.name, value: d.folderId })),
        { label: '+ New Folder', value: '__new_folder__' },
      ];
      const chosen = await dialog.select('Choose a folder for the new file:', options, 'New File');
      if (!chosen) return;

      if (chosen === '__new_folder__') {
        const folderName = await dialog.prompt('Enter folder name:', '', 'New Folder');
        if (!folderName) return;
        try {
          const newDir = await client.createFolder(folderName, driveVaultId);
          const dirPath = folderName;
          if (drivePathIndex) {
            drivePathIndex.addEntry(dirPath, {
              id: newDir.id,
              name: newDir.name,
              mimeType: FOLDER_MIME,
              modifiedAt: new Date(newDir.modifiedTime).getTime(),
              parentId: driveVaultId,
            });
            setDrivePathIndex(drivePathIndex);
          }
          targetDir = new DriveDirectoryHandle(newDir.name, newDir.id);
          const rootHandle = new DriveDirectoryHandle(rootName, driveVaultId);
          await scanVault(rootHandle);
        } catch {
          toast.error('Failed to create folder');
          return;
        }
      } else if (chosen !== '__root__') {
        // chosen is a folderId
        const found = subDirs.find(d => d.folderId === chosen);
        if (found) targetDir = found;
      } else {
        targetDir = new DriveDirectoryHandle(rootName, driveVaultId);
      }
    } else if (dirHandle instanceof DriveDirectoryHandle) {
      targetDir = dirHandle;
    }

    const result = await dialog.newFile();
    if (!result || !result.name) return;

    const slug = result.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const tagsStr = result.tags
      ? `[${result.tags.split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean).join(', ')}]`
      : '[]';
    const fm = `---\nid: ${slug}\ntitle: ${result.name}\ntype: ${result.type || 'note'}\nstatus: "#draft"\ntags: ${tagsStr}\n---\n\n`;

    return await createFile(result.name, fm, targetDir);
  }, [driveVaultId, vaultFiles, currentDirHandle, drivePathIndex, setDrivePathIndex, createFile, scanVault, dialog]);

  const deleteFile = useCallback(async (handle: any) => {
    const isDir = handle instanceof DriveDirectoryHandle;
    const isFile = handle instanceof DriveFileHandle;
    if (!isDir && !isFile) return;

    const type = isDir ? 'folder' : 'file';
    const confirmed = await dialog.confirm(
      `Are you sure you want to delete this ${type}: ${handle.name}?`,
      'Delete Item',
    );
    if (!confirmed) return;

    // Resolve path for this handle
    let path: string | undefined;
    if (drivePathIndex) {
      const id = isFile ? (handle as DriveFileHandle).fileId : (handle as DriveDirectoryHandle).folderId;
      path = drivePathIndex.getPathForId(id);
    }

    try {
      const id = isFile ? (handle as DriveFileHandle).fileId : (handle as DriveDirectoryHandle).folderId;
      await client.deleteFile(id);

      if (path && drivePathIndex) {
        drivePathIndex.removeEntry(path);
        if (isDir) {
          // Remove all children
          const prefix = path + '/';
          drivePathIndex.allPaths().filter(p => p.startsWith(prefix)).forEach(p => drivePathIndex.removeEntry(p));
        }
        setDrivePathIndex(drivePathIndex);
      }
    } catch (err: any) {
      if (err.status !== 404) {
        if (err.status === 401) setDriveAuthState('expired');
        toast.error('Failed to delete');
        return;
      }
      // 404 = already gone, continue cleanup
    }

    // Update atoms
    const isDeletedPath = (p: string) =>
      isFile
        ? path ? p === path : p.split('/').pop() === handle.name
        : p === path || p.startsWith((path ?? handle.name) + '/');

    setFileMetadata(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(p => { if (isDeletedPath(p)) delete next[p]; });
      return next;
    });
    setVaultFiles(prev => prev.filter(f => !isDeletedPath((f as any).path || f.name)));
    setOpenFiles(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(p => { if (isDeletedPath(p)) delete next[p]; });
      return next;
    });
    setWorkspaceLayout(prev => {
      const removeFromNode = (node: any): any => {
        if (node.type === 'editor') {
          const newPaths = node.openFilePaths.filter((p: string) => !isDeletedPath(p));
          const newActive = newPaths.includes(node.activeFilePath) ? node.activeFilePath : (newPaths[0] || 'draft');
          if (!newPaths.length) newPaths.push('draft');
          return { ...node, openFilePaths: newPaths, activeFilePath: newActive };
        }
        if (node.children) return { ...node, children: node.children.map(removeFromNode) };
        return node;
      };
      return { ...prev, rootContainer: removeFromNode(prev.rootContainer) };
    });

    if ((activeFileHandle as any)?.fileId === (isFile ? (handle as DriveFileHandle).fileId : '')) {
      setActiveFileHandle(null as any);
    }

    const dir = currentDirectoryHandle as any;
    if (dir instanceof DriveDirectoryHandle) await scanVault(dir);
    toast.success(`${handle.name} deleted`);
  }, [drivePathIndex, setDrivePathIndex, setDriveAuthState, setFileMetadata, setVaultFiles, setOpenFiles, setWorkspaceLayout, activeFileHandle, setActiveFileHandle, currentDirectoryHandle, scanVault, dialog]);

  const renameFile = useCallback(async (handle: any) => {
    const isFile = handle instanceof DriveFileHandle;
    const isDir = handle instanceof DriveDirectoryHandle;
    if (!isFile && !isDir) return;

    const currentDir = currentDirectoryHandle as any;
    const newName = await dialog.prompt('Enter new name:', handle.name, 'Rename Item');
    if (!newName || newName === handle.name) return;

    const finalName = isFile && !newName.endsWith('.md') ? `${newName}.md` : newName;

    const id = isFile ? (handle as DriveFileHandle).fileId : (handle as DriveDirectoryHandle).folderId;
    let oldPath: string | undefined;
    if (drivePathIndex) oldPath = drivePathIndex.getPathForId(id);

    try {
      await client.renameFile(id, finalName);
    } catch (err: any) {
      if (err.status === 401) setDriveAuthState('expired');
      toast.error('Failed to rename');
      return;
    }

    if (oldPath && drivePathIndex) {
      const parentPath = oldPath.split('/').slice(0, -1).join('/');
      const newPath = parentPath ? `${parentPath}/${finalName}` : finalName;
      drivePathIndex.renameEntry(oldPath, newPath);
      setDrivePathIndex(drivePathIndex);

      // Update open file paths
      setOpenFiles(prev => {
        const next = { ...prev };
        if (next[oldPath!]) {
          next[newPath] = { ...next[oldPath!], activeFilePath: newPath, fileName: finalName };
          delete next[oldPath!];
        }
        return next;
      });
      setFileMetadata(prev => {
        const next = { ...prev };
        if (next[oldPath!]) {
          const handle_new = isFile ? new DriveFileHandle(finalName, id) : next[oldPath!].handle;
          next[newPath] = { ...next[oldPath!], path: newPath, name: finalName, handle: handle_new };
          delete next[oldPath!];
        }
        return next;
      });

      if ((activeFileHandle as any)?.fileId === id) {
        setActiveFilePath(newPath);
        setFileName(finalName.replace('.md', ''));
        if (isFile) setActiveFileHandle(new DriveFileHandle(finalName, id) as any);
      }
    }

    if (currentDir instanceof DriveDirectoryHandle) await scanVault(currentDir);
    toast.success(`Renamed to ${finalName}`);
  }, [currentDirectoryHandle, drivePathIndex, setDrivePathIndex, setDriveAuthState, setOpenFiles, setFileMetadata, activeFileHandle, setActiveFilePath, setFileName, setActiveFileHandle, scanVault, dialog]);

  const moveItem = useCallback(async (handle: any, targetDirHandle: any) => {
    const isFile = handle instanceof DriveFileHandle;
    const isDir = handle instanceof DriveDirectoryHandle;
    const isTargetDir = targetDirHandle instanceof DriveDirectoryHandle;
    if ((!isFile && !isDir) || !isTargetDir) return;

    const id = isFile ? (handle as DriveFileHandle).fileId : (handle as DriveDirectoryHandle).folderId;
    let oldPath: string | undefined;
    if (drivePathIndex) oldPath = drivePathIndex.getPathForId(id);

    const parentEntry = drivePathIndex?.getEntry(
      oldPath?.split('/').slice(0, -1).join('/') || ''
    );
    const oldParentId = parentEntry?.id || driveVaultId || '';

    try {
      await client.moveFile(id, targetDirHandle.folderId, oldParentId);
    } catch (err: any) {
      if (err.status === 401) setDriveAuthState('expired');
      toast.error('Failed to move item');
      return;
    }

    if (oldPath && drivePathIndex) {
      const targetPath = drivePathIndex.getPathForId(targetDirHandle.folderId);
      const newPath = targetPath ? `${targetPath}/${handle.name}` : handle.name;
      drivePathIndex.renameEntry(oldPath, newPath);
      setDrivePathIndex(drivePathIndex);
    }

    const dir = currentDirectoryHandle as any;
    if (dir instanceof DriveDirectoryHandle) await scanVault(dir);
    toast.success(`Moved ${handle.name}`);
  }, [driveVaultId, drivePathIndex, setDrivePathIndex, setDriveAuthState, currentDirectoryHandle, scanVault]);

  const importFile = useCallback(async () => {
    // Import falls back to local file picker + openFile — works regardless of vault backend
    try {
      const [fileHandle] = await (window as any).showOpenFilePicker({
        types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md', '.markdown'] } }],
      });
      await openFile(fileHandle);
    } catch (err: any) {
      if (err.name !== 'AbortError') toast.error('Failed to import file');
    }
  }, [openFile]);

  return { createFile, createNewFile, deleteFile, renameFile, moveItem, importFile };
}
