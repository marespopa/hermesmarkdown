"use client";

import React from "react";
import { useAtom } from "jotai";
import {
  atom_lineNumbers,
  atom_vimMode,
  atom_wordWrap,
} from "@/app/atoms/atoms";
import { atom_flowMode, atom_fullWidth, atom_showInvisibles } from "@/app/atoms/ui-atoms";
import Toggle from "@/app/components/Toggle";
import { SettingGroup, SettingItem } from "../components/SettingControls";

// Settings → Editor: Layout (full width, word wrap, line numbers, invisibles) and Writing (Vim, flow mode) groups.
export default function EditorSettings() {
  const [fullWidth, setFullWidth] = useAtom(atom_fullWidth);
  const [wordWrap, setWordWrap] = useAtom(atom_wordWrap);
  const [lineNumbers, setLineNumbers] = useAtom(atom_lineNumbers);
  const [showInvisibles, setShowInvisibles] = useAtom(atom_showInvisibles);
  const [vimMode, setVimMode] = useAtom(atom_vimMode);
  const [flowMode, setFlowMode] = useAtom(atom_flowMode);

  return (
    <>
      <SettingGroup title="Layout">
        <SettingItem
          label="Full Width"
          description="Let the text fill the whole editor instead of stopping at a comfortable reading width."
          control={<Toggle variant="soft" active={fullWidth} onChange={setFullWidth} />}
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
          label="Flow Mode"
          description="While you write, fade everything except the current paragraph and keep the line you're typing on centered on screen."
          control={<Toggle variant="soft" active={flowMode} onChange={setFlowMode} />}
        />
      </SettingGroup>
    </>
  );
}
