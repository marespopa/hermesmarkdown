"use client";

import React from "react";
import { useAtom } from "jotai";
import { HiOutlineDesktopComputer, HiOutlineMoon, HiOutlineSun } from "react-icons/hi";
import { atom_editorFontFamily, atom_theme, type Theme } from "@/app/atoms/atoms";
import FontPicker from "../components/FontPicker";
import { SegmentedControl, SettingGroup, SettingItem } from "../components/SettingControls";
import { FONTS } from "../font-options";

const THEME_OPTIONS: { label: string; value: Theme; Icon: React.ComponentType<{ size?: number }> }[] = [
  { label: "Light", value: "light", Icon: HiOutlineSun },
  { label: "Dark", value: "dark", Icon: HiOutlineMoon },
  { label: "System", value: "system", Icon: HiOutlineDesktopComputer },
];

// Settings → Appearance: Theme and Typography groups.
export default function AppearanceSettings() {
  const [theme, setTheme] = useAtom(atom_theme);
  const [editorFontFamily, setEditorFontFamily] = useAtom(atom_editorFontFamily);

  return (
    <>
      <SettingGroup title="Theme">
        <SettingItem
          label="Theme"
          description="System follows your OS's light/dark setting and switches automatically when it changes."
          control={<SegmentedControl options={THEME_OPTIONS} value={theme} onChange={setTheme} />}
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
    </>
  );
}
