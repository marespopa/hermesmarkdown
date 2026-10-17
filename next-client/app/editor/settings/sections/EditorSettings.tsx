"use client";

import React from "react";
import { useAtom } from "jotai";
import { atom_vimMode } from "@/app/atoms/atoms";
import { atom_closeSidebarWhileWriting, atom_focusMode, atom_showWordCount, type FocusMode } from "@/app/atoms/ui-atoms";
import Toggle from "@/app/components/Toggle";
import { SelectControl, SettingGroup, SettingItem } from "../components/SettingControls";
import { FOCUS_OPTIONS } from "../focus-options";

// Settings → Editor: the Writing group (Vim mode, Focus, Close Sidebar While
// Writing, Word Count). Word wrap, line numbers and invisibles are
// command-palette toggles only (SettingsCommands).
export default function EditorSettings() {
  const [vimMode, setVimMode] = useAtom(atom_vimMode);
  const [focusMode, setFocusMode] = useAtom(atom_focusMode);
  const [showWordCount, setShowWordCount] = useAtom(atom_showWordCount);
  const [closeSidebarWhileWriting, setCloseSidebarWhileWriting] = useAtom(atom_closeSidebarWhileWriting);

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
          description="Fade the toolbar, tabs and sidebar once you start typing, leaving only the page; move the mouse to bring them back. The two strongest levels also dim every paragraph (or sentence) but the one you're in and keep your line centered."
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
          description="Put the sidebar away as soon as you type in a note, so the page has the window to itself. Off, the sidebar stays open until you close it."
          control={<Toggle variant="soft" active={closeSidebarWhileWriting} onChange={setCloseSidebarWhileWriting} label="Close sidebar while writing" />}
        />
        <SettingItem
          label="Word Count"
          description="Show the note's word count faintly in the corner of the editor. It steps aside while you type."
          control={<Toggle variant="soft" active={showWordCount} onChange={setShowWordCount} label="Word count" />}
        />
      </SettingGroup>
    </>
  );
}
