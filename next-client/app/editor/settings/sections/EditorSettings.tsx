"use client";

import React from "react";
import { useAtom } from "jotai";
import {
  atom_lineNumbers,
  atom_vimMode,
  atom_wordWrap,
} from "@/app/atoms/atoms";
import { atom_focusMode, atom_showInvisibles, atom_sidebarOpen, type FocusMode } from "@/app/atoms/ui-atoms";
import Toggle from "@/app/components/Toggle";
import { SelectControl, SettingGroup, SettingItem } from "../components/SettingControls";
import { FOCUS_OPTIONS } from "../focus-options";

// Settings → Editor: Layout (sidebar, word wrap, line numbers, invisibles) and Writing (Vim mode, Focus) groups.
export default function EditorSettings() {
  const [sidebarOpen, setSidebarOpen] = useAtom(atom_sidebarOpen);
  const [wordWrap, setWordWrap] = useAtom(atom_wordWrap);
  const [lineNumbers, setLineNumbers] = useAtom(atom_lineNumbers);
  const [showInvisibles, setShowInvisibles] = useAtom(atom_showInvisibles);
  const [vimMode, setVimMode] = useAtom(atom_vimMode);
  const [focusMode, setFocusMode] = useAtom(atom_focusMode);

  return (
    <>
      <SettingGroup title="Layout">
        <SettingItem
          label="Show Sidebar"
          description="Your open notes and the vault's files on the left edge of the window. Also the first toolbar button and Ctrl/Cmd+Alt+S. Desktop only."
          control={<Toggle variant="soft" active={sidebarOpen} onChange={setSidebarOpen} label="Show sidebar" />}
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
          label="Show Invisibles"
          description="Mark empty lines with ¶ and show spaces as dots and tabs as arrows, so a blank line is easy to see."
          control={<Toggle variant="soft" active={showInvisibles} onChange={setShowInvisibles} />}
        />
      </SettingGroup>
      <SettingGroup title="Writing">
        <SettingItem
          label="Vim Mode"
          description="Use Vim motions and editing modes in the source editor."
          control={<Toggle variant="soft" active={vimMode} onChange={setVimMode} />}
        />
        <SettingItem
          label="Focus"
          description="Fade the toolbar, tabs and sidebar once you start typing, leaving only the page; move the mouse to bring them back. The strongest level also dims every paragraph but the one you're in and keeps your line centered."
          control={
            <SelectControl value={focusMode} onChange={(value) => setFocusMode(value as FocusMode)} ariaLabel="Focus">
              {FOCUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </SelectControl>
          }
        />
      </SettingGroup>
    </>
  );
}
