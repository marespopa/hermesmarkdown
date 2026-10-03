"use client";

import React from "react";
import { useAtom } from "jotai";
import { atom_autosaveDelay, atom_autosaveMode, atom_showHiddenFiles } from "@/app/atoms/atoms";
import {
  atom_newNoteFolder,
  atom_onVaultOpen,
  type VaultOpenBehavior,
} from "@/app/atoms/ui-atoms";
import { BareInput } from "@/app/components/Input";
import Toggle from "@/app/components/Toggle";
import { normalizeFolderPath } from "@/app/hooks/file-system/unique-file";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { SelectControl, SettingGroup, SettingItem } from "../components/SettingControls";

// Settings → Files: Vault (on open, new notes folder, hidden files) and Autosave groups.
export default function FilesSettings() {
  const [autosaveMode, setAutosaveMode] = useAtom(atom_autosaveMode);
  const [autosaveDelay, setAutosaveDelay] = useAtom(atom_autosaveDelay);
  const [showHiddenFiles, setShowHiddenFiles] = useAtom(atom_showHiddenFiles);
  const [onVaultOpen, setOnVaultOpen] = useAtom(atom_onVaultOpen);
  const [newNoteFolder, setNewNoteFolder] = useAtom(atom_newNoteFolder);
  const { scanVault, indexVaultTags, vaultHandle } = useFileSystem();

  const handleShowHiddenFilesChange = (next: boolean) => {
    setShowHiddenFiles(next);
    // Rescan immediately — this page is a separate route from the editor, so
    // the tree-owning hook isn't mounted here to react to the atom change itself.
    if (!vaultHandle) return;
    scanVault(vaultHandle as any, next);
    indexVaultTags(vaultHandle as any, next);
  };

  return (
    <>
      <SettingGroup title="Vault">
        <SettingItem
          label="On Vault Open"
          description="Show recent notes first, or reopen the tabs from last time. Either way, your tabs are restored. Refreshing the page keeps you where you were."
          control={
            <SelectControl value={onVaultOpen} onChange={(v) => setOnVaultOpen(v as VaultOpenBehavior)}>
              <option value="home">Home feed</option>
              <option value="resume">Resume last tabs</option>
            </SelectControl>
          }
        />
        <SettingItem
          label="New Notes Folder"
          description="The folder preselected when a new note asks where to save. Notes are named after their first line. Leave empty for the vault root."
          control={
            <BareInput
              value={newNoteFolder}
              onChange={(e) => setNewNoteFolder(e.target.value)}
              onBlur={() => setNewNoteFolder(normalizeFolderPath(newNoteFolder))}
              placeholder="Vault root"
              aria-label="New notes folder"
              className="h-8 w-44 rounded-lg border border-edge bg-input-bg px-2 text-ui-footnote text-fg outline-none placeholder:text-fg-faint focus:ring-4 focus:ring-sage/10"
            />
          }
        />
        <SettingItem
          label="Show Hidden Files"
          description="Show files and folders starting with . or _ in the file tree and search."
          control={<Toggle variant="soft" active={showHiddenFiles} onChange={handleShowHiddenFilesChange} />}
        />
      </SettingGroup>
      <SettingGroup title="Autosave">
        <SettingItem
          label="Autosave Mode"
          description="When unsaved changes are written to disk."
          control={
            <SelectControl value={autosaveMode} onChange={(v) => setAutosaveMode(v as any)}>
              <option value="afterDelay">After Delay</option>
              <option value="onFocusChange">On Focus Change</option>
              <option value="manual">Manual Only (⌘S)</option>
            </SelectControl>
          }
        />
        {autosaveMode === "afterDelay" && (
          <SettingItem
            label="Delay"
            description="Idle time after the last keystroke before saving."
            control={
              <SelectControl value={autosaveDelay} onChange={(v) => setAutosaveDelay(Number(v))}>
                <option value={500}>0.5s</option>
                <option value={1000}>1s</option>
                <option value={2000}>2s</option>
                <option value={3000}>3s</option>
                <option value={5000}>5s</option>
                <option value={10000}>10s</option>
              </SelectControl>
            }
          />
        )}
      </SettingGroup>
    </>
  );
}
