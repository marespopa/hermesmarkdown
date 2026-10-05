"use client";

import React from "react";
import { useAtom } from "jotai";
import {
  atom_lineNumbers,
  atom_vimMode,
  atom_wordWrap,
} from "@/app/atoms/atoms";
import { atom_flowMode } from "@/app/atoms/ui-atoms";
import Toggle from "@/app/components/Toggle";
import { SettingGroup, SettingItem } from "../components/SettingControls";

// Settings → Editor: Layout (word wrap, line numbers) and Writing (Vim, flow mode) groups.
export default function EditorSettings() {
  const [wordWrap, setWordWrap] = useAtom(atom_wordWrap);
  const [lineNumbers, setLineNumbers] = useAtom(atom_lineNumbers);
  const [vimMode, setVimMode] = useAtom(atom_vimMode);
  const [flowMode, setFlowMode] = useAtom(atom_flowMode);

  return (
    <>
      <SettingGroup title="Layout">
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
