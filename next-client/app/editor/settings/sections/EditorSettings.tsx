"use client";

import React from "react";
import { useAtom } from "jotai";
import { atom_vimMode } from "@/app/atoms/atoms";
import { atom_showGitChanges } from "@/app/atoms/git-atoms";
import { atom_closeSidebarWhileWriting, atom_focusMode, atom_showOutline, atom_showWordCount, type FocusMode } from "@/app/atoms/ui-atoms";
import { formatShortcut } from "@/app/utils/platform";
import Toggle from "@/app/components/Toggle";
import { SelectControl, SettingGroup, SettingItem } from "../components/SettingControls";
import { FOCUS_OPTIONS } from "../focus-options";

// Settings → Editor: the Writing group (Vim mode, Focus, Close Sidebar While
// Writing, Word Count) and the View group (Outline, Git Changes). Word wrap, line numbers and invisibles are
// command-palette toggles only (SettingsCommands).
export default function EditorSettings() {
  const [vimMode, setVimMode] = useAtom(atom_vimMode);
  const [focusMode, setFocusMode] = useAtom(atom_focusMode);
  const [showWordCount, setShowWordCount] = useAtom(atom_showWordCount);
  const [closeSidebarWhileWriting, setCloseSidebarWhileWriting] = useAtom(atom_closeSidebarWhileWriting);
  const [showOutline, setShowOutline] = useAtom(atom_showOutline);
  const [showGitChanges, setShowGitChanges] = useAtom(atom_showGitChanges);

  return (
    <>
      <SettingGroup title="Writing">
        <SettingItem
          label="Vim Mode"
          description="Use Vim motions and editing modes in the source editor."
          control={<Toggle variant="soft" active={vimMode} onChange={setVimMode} />}
        />
        <SettingItem
          label="Focus"
          description="Dim every paragraph (or sentence) but the one you're in, and keep your line centered."
          control={
            <SelectControl value={focusMode} onChange={(value) => setFocusMode(value as FocusMode)} ariaLabel="Focus">
              {FOCUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </SelectControl>
          }
        />
        <SettingItem
          label="Close Sidebar While Writing"
          description="Put the sidebar away as soon as you type in a file, so the page has the window to itself. Off, the sidebar stays open until you close it."
          control={<Toggle variant="soft" active={closeSidebarWhileWriting} onChange={setCloseSidebarWhileWriting} label="Close sidebar while writing" />}
        />
        <SettingItem
          label="Word Count"
          description="Show the note's word count faintly in the corner of the editor. It steps aside while you type."
          control={<Toggle variant="soft" active={showWordCount} onChange={setShowWordCount} label="Word count" />}
        />
      </SettingGroup>
      <SettingGroup title="View">
        <SettingItem
          label="Outline"
          description={`Show the note's headings in the editor's bottom-right corner, the section you're reading marked; click one to jump there. ${formatShortcut("M", { shift: true })} turns it on or off.`}
          control={<Toggle variant="soft" active={showOutline} onChange={setShowOutline} label="Outline" />}
        />
        <SettingItem
          label="Git Changes"
          description="In a disk vault that's a git repository, show what changed since the last commit inline: added lines tinted, and the old lines above them."
          control={<Toggle variant="soft" active={showGitChanges} onChange={setShowGitChanges} label="Git Changes" />}
        />
      </SettingGroup>
    </>
  );
}
