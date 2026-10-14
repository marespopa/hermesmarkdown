"use client";

import React from "react";
import { useAtom } from "jotai";
import { atom_vimMode } from "@/app/atoms/atoms";
import { atom_focusMode, type FocusMode } from "@/app/atoms/ui-atoms";
import Toggle from "@/app/components/Toggle";
import { SelectControl, SettingGroup, SettingItem } from "../components/SettingControls";
import { FOCUS_OPTIONS } from "../focus-options";

// Settings → Editor: the Writing group (Vim mode, Focus). Word wrap, line
// numbers and invisibles are command-palette toggles only (SettingsCommands);
// the sidebar is opened and closed where you work, not here.
export default function EditorSettings() {
  const [vimMode, setVimMode] = useAtom(atom_vimMode);
  const [focusMode, setFocusMode] = useAtom(atom_focusMode);

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
