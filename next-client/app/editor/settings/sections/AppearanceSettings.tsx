"use client";

import React from "react";
import { useAtom } from "jotai";
import { HiOutlineDesktopComputer, HiOutlineMoon, HiOutlineSun } from "react-icons/hi";
import { atom_editorFontFamily, atom_renderedFontSize, atom_sidebarOpen, atom_theme, type Theme } from "@/app/atoms/atoms";
import Toggle from "@/app/components/Toggle";
import FontPicker from "../components/FontPicker";
import { SegmentedControl, SettingGroup, SettingItem } from "../components/SettingControls";
import { FONTS, TEXT_SIZES } from "../font-options";

const THEME_OPTIONS: { label: string; value: Theme; Icon: React.ComponentType<{ size?: number }> }[] = [
  { label: "Light", value: "light", Icon: HiOutlineSun },
  { label: "Dark", value: "dark", Icon: HiOutlineMoon },
  { label: "System", value: "system", Icon: HiOutlineDesktopComputer },
];

// Settings → Appearance: Theme, Toolbar and Typography groups.
export default function AppearanceSettings() {
  const [theme, setTheme] = useAtom(atom_theme);
  const [editorFontFamily, setEditorFontFamily] = useAtom(atom_editorFontFamily);
  const [sidebarOpen, setSidebarOpen] = useAtom(atom_sidebarOpen);
  const [textSize, setTextSize] = useAtom(atom_renderedFontSize);

  return (
    <>
      <SettingGroup title="Theme">
        <SettingItem
          label="Theme"
          description="System follows your OS's light/dark setting and switches automatically when it changes."
          control={<SegmentedControl options={THEME_OPTIONS} value={theme} onChange={setTheme} />}
        />
      </SettingGroup>
      <SettingGroup title="Toolbar">
        <SettingItem
          label="Show Sidebar"
          description="Your open notes and the vault's files on the left edge of the window. Also the first toolbar button and Ctrl/Cmd+Alt+S. Desktop only."
          control={<Toggle variant="soft" active={sidebarOpen} onChange={setSidebarOpen} label="Show sidebar" />}
        />
      </SettingGroup>
      <SettingGroup title="Typography">
        <SettingItem
          label="Font"
          description="Choose a paper-like typeface for the Markdown editor. Fonts are self-hosted and keep a system fallback."
          layout="stack"
          control={<FontPicker fonts={FONTS} value={editorFontFamily} onChange={setEditorFontFamily} />}
        />
        <SettingItem
          label="Text size"
          description="The size of your notes' text."
          layout="stack"
          control={<SegmentedControl options={TEXT_SIZES} value={textSize} onChange={setTextSize} />}
        />
      </SettingGroup>
    </>
  );
}
