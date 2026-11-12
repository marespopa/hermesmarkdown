"use client";

import React from "react";
import { useAtom } from "jotai";
import { atom_vimMode } from "@/app/atoms/atoms";
import { atom_focusMode, atom_showOutline, atom_showWordCount, atom_typewriterLevel, type FocusMode, type TypewriterLevel } from "@/app/atoms/ui-atoms";
import { formatShortcut } from "@/app/utils/platform";
import Toggle from "@/app/components/Toggle";
import { SelectControl, SettingGroup, SettingItem } from "../components/SettingControls";
import { FOCUS_OPTIONS } from "../focus-options";
import { TYPEWRITER_OPTIONS } from "../typewriter-options";

// Settings → Editor: the Writing group (Vim mode, Focus, Word Count,
// Typewriter Sound) and the View group (Outline). Word wrap, line numbers,
// and invisibles are command-palette toggles only (SettingsCommands).
export default function EditorSettings() {
  const [vimMode, setVimMode] = useAtom(atom_vimMode);
  const [focusMode, setFocusMode] = useAtom(atom_focusMode);
  const [showWordCount, setShowWordCount] = useAtom(atom_showWordCount);
  const [showOutline, setShowOutline] = useAtom(atom_showOutline);
  const [typewriterLevel, setTypewriterLevel] = useAtom(atom_typewriterLevel);

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
          label="Word Count"
          description="Show the file's word count faintly in the corner of the editor. It steps aside while you type."
          control={<Toggle variant="soft" active={showWordCount} onChange={setShowWordCount} label="Word count" />}
        />
        <SettingItem
          label="Typewriter Sound"
          description="Play a typewriter click as you type in a note, with a carriage return on Enter, at the volume you choose. It's generated on your device, so it works offline."
          control={
            <SelectControl value={typewriterLevel} onChange={(value) => setTypewriterLevel(value as TypewriterLevel)} ariaLabel="Typewriter sound">
              {TYPEWRITER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </SelectControl>
          }
        />
      </SettingGroup>
      <SettingGroup title="View">
        <SettingItem
          label="Outline"
          description={`Show the file's headings in the editor's bottom-right corner, the section you're reading marked; click one to jump there. ${formatShortcut("M", { shift: true })} turns it on or off.`}
          control={<Toggle variant="soft" active={showOutline} onChange={setShowOutline} label="Outline" />}
        />
      </SettingGroup>
    </>
  );
}
