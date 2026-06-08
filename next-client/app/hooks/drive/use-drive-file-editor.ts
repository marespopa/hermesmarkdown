"use client";

import { useAtomValue } from 'jotai';
import { atom_activeFileHandle } from '@/app/atoms/atoms';
import { useOpenFile } from '../file-system/use-open-file';
import { useDriveSaveFile } from './use-drive-save-file';
import { useExportFile } from '../file-system/use-export-file';

export function useDriveFileEditor() {
  const activeFileHandle = useAtomValue(atom_activeFileHandle);
  const { openFile, openFileByName } = useOpenFile();
  const { saveFile } = useDriveSaveFile();
  const { exportFile } = useExportFile({ saveFile });

  return {
    activeFileHandle,
    openFile,
    saveFile,
    exportFile,
    openFileByName,
  };
}
