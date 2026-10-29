"use client";

import React from "react";
import { useAtom } from "jotai";
import { atom_autosaveMode, atom_showHiddenFiles } from "@/app/atoms/atoms";
import { atom_newNoteFolder, atom_searchMarkdownOnly } from "@/app/atoms/ui-atoms";
import { BareInput, FIELD_COMPACT_CLASS } from "@/app/components/Input";
import Toggle from "@/app/components/Toggle";
import { normalizeFolderPath } from "@/app/hooks/file-system/unique-file";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { SelectControl, SettingGroup, SettingItem } from "../components/SettingControls";
import PrivacyModeSetting from "./PrivacyModeSetting";

// Settings → Files: Vault (new notes folder, hidden files, code file search) and Autosave
// groups, then Privacy (PrivacyModeSetting).
export default function FilesSettings() {
  const [autosaveMode, setAutosaveMode] = useAtom(atom_autosaveMode);
  const [showHiddenFiles, setShowHiddenFiles] = useAtom(atom_showHiddenFiles);
  const [newNoteFolder, setNewNoteFolder] = useAtom(atom_newNoteFolder);
  const [searchMarkdownOnly, setSearchMarkdownOnly] = useAtom(atom_searchMarkdownOnly);
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
          label="New Files Folder"
          description="Where new files go: drafts (named after their first line), and files made from a template or a link that names no folder. Leave empty for the vault root."
          control={
            <BareInput
              value={newNoteFolder}
              onChange={(e) => setNewNoteFolder(e.target.value)}
              onBlur={() => setNewNoteFolder(normalizeFolderPath(newNoteFolder))}
              placeholder="Vault root"
              aria-label="New files folder"
              className={`${FIELD_COMPACT_CLASS} w-44`}
            />
          }
        />
        <SettingItem
          label="Show Hidden Files"
          description="Show files and folders starting with . or _ in Files and search."
          control={<Toggle variant="soft" active={showHiddenFiles} onChange={handleShowHiddenFilesChange} />}
        />
        <SettingItem
          label="Search Markdown Files Only"
          description="Limit the command palette's / text search to Markdown notes. Turn this off to include other readable text files."
          control={<Toggle variant="soft" active={searchMarkdownOnly} onChange={setSearchMarkdownOnly} />}
        />
      </SettingGroup>
      <SettingGroup title="Autosave">
        <SettingItem
          label="Autosave Mode"
          description="When unsaved changes are written to disk. After Delay saves two seconds after you stop typing."
          control={
            <SelectControl value={autosaveMode} onChange={(v) => setAutosaveMode(v as any)}>
              <option value="afterDelay">After Delay</option>
              <option value="manual">Manual Only (⌘S)</option>
            </SelectControl>
          }
        />
      </SettingGroup>
      <PrivacyModeSetting />
    </>
  );
}
