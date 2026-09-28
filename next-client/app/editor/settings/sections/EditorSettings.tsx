"use client";

import React from "react";
import { useAtom } from "jotai";
import { HiOutlineDesktopComputer, HiOutlineMoon, HiOutlineSun } from "react-icons/hi";
import {
  atom_autosaveDelay,
  atom_autosaveMode,
  atom_editorFontFamily,
  atom_frontmatterCollapsedByDefault,
  atom_lineNumbers,
  atom_showHiddenFiles,
  atom_theme,
  atom_vimMode,
  atom_wordWrap,
  type Theme,
} from "@/app/atoms/atoms";
import {
  atom_autoHideTabs,
  atom_flowMode,
  atom_newNoteFolder,
  atom_onVaultOpen,
  type VaultOpenBehavior,
} from "@/app/atoms/ui-atoms";
import { BareInput } from "@/app/components/Input";
import Toggle from "@/app/components/Toggle";
import { normalizeFolderPath } from "@/app/hooks/file-system/unique-file";
import { useFileSystem } from "@/app/hooks/use-file-system";
import FontPicker from "../components/FontPicker";
import { SegmentedControl, SelectControl, SettingGroup, SettingItem } from "../components/SettingControls";
import { FONTS } from "../font-options";

const THEME_OPTIONS: { label: string; value: Theme; Icon: React.ComponentType<{ size?: number }> }[] = [
  { label: "Light", value: "light", Icon: HiOutlineSun },
  { label: "Dark", value: "dark", Icon: HiOutlineMoon },
  { label: "System", value: "system", Icon: HiOutlineDesktopComputer },
];

// Settings → Editor: Appearance, Vault Home & New Notes, Typography, and Autosave groups.
export default function EditorSettings() {
  const [theme, setTheme] = useAtom(atom_theme);
  const [wordWrap, setWordWrap] = useAtom(atom_wordWrap);
  const [lineNumbers, setLineNumbers] = useAtom(atom_lineNumbers);
  const [vimMode, setVimMode] = useAtom(atom_vimMode);
  const [flowMode, setFlowMode] = useAtom(atom_flowMode);
  const [frontmatterCollapsedByDefault, setFrontmatterCollapsedByDefault] = useAtom(atom_frontmatterCollapsedByDefault);
  const [autosaveMode, setAutosaveMode] = useAtom(atom_autosaveMode);
  const [autosaveDelay, setAutosaveDelay] = useAtom(atom_autosaveDelay);
  const [showHiddenFiles, setShowHiddenFiles] = useAtom(atom_showHiddenFiles);
  const [editorFontFamily, setEditorFontFamily] = useAtom(atom_editorFontFamily);
  const [autoHideTabs, setAutoHideTabs] = useAtom(atom_autoHideTabs);
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
      <SettingGroup title="Appearance">
        <SettingItem
          label="Theme"
          description="System follows your OS's light/dark setting and switches automatically when it changes."
          control={<SegmentedControl options={THEME_OPTIONS} value={theme} onChange={setTheme} />}
        />
        <SettingItem
          label="Word Wrap"
          description="Wrap long lines to fit the viewport width."
          control={<Toggle variant="soft" active={wordWrap} onChange={setWordWrap} />}
        />
        <SettingItem
          label="Line Numbers"
          description="Show line numbers beside the source editor."
          control={<Toggle variant="soft" active={lineNumbers} onChange={setLineNumbers} />}
        />
        <SettingItem
          label="Vim Mode"
          description="Use Vim motions and editing modes in the source editor."
          control={<Toggle variant="soft" active={vimMode} onChange={setVimMode} />}
        />
        <SettingItem
          label="Flow Mode"
          description="While you write, fade everything except the current paragraph and keep the line you're typing on centered on screen."
          control={<Toggle variant="soft" active={flowMode} onChange={setFlowMode} />}
        />
        <SettingItem
          label="Auto-hide Tabs"
          description="Hide the tab bar while a single note is open and the workspace isn't split. Save and tab options stay in the pane's corner."
          control={<Toggle variant="soft" active={autoHideTabs} onChange={setAutoHideTabs} />}
        />
        <SettingItem
          label="Collapse Frontmatter"
          description="Start with the YAML frontmatter folded when opening files."
          control={
            <Toggle
              variant="soft"
              active={frontmatterCollapsedByDefault}
              onChange={setFrontmatterCollapsedByDefault}
              label="Collapse frontmatter by default"
            />
          }
        />
        <SettingItem
          label="Show Hidden Files"
          description="Reveal dotfiles and folders (such as .hermes/) and _-prefixed files in the file tree and search. Off by default to keep browsing focused on your notes."
          control={<Toggle variant="soft" active={showHiddenFiles} onChange={handleShowHiddenFilesChange} />}
        />
      </SettingGroup>
      <SettingGroup title="Vault Home & New Notes">
        <SettingItem
          label="On Vault Open"
          description="Show recent notes first, or reopen the tabs from last time. Either way, your tabs are restored."
          control={
            <SelectControl value={onVaultOpen} onChange={(v) => setOnVaultOpen(v as VaultOpenBehavior)}>
              <option value="home">Home feed</option>
              <option value="resume">Resume last tabs</option>
            </SelectControl>
          }
        />
        <SettingItem
          label="New Notes Folder"
          description="Where new notes are saved in the vault. They're named after their first line. Leave empty for the vault root."
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
      </SettingGroup>
      <SettingGroup title="Typography">
        <SettingItem
          label="Font"
          description="Choose a paper-like typeface for the Markdown editor. Fonts are self-hosted and keep a system fallback."
          layout="stack"
          control={<FontPicker fonts={FONTS} value={editorFontFamily} onChange={setEditorFontFamily} />}
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
