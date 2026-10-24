"use client";

import React from "react";
import { useAtom } from "jotai";
import { HiOutlineDesktopComputer, HiOutlineMoon, HiOutlineSun } from "react-icons/hi";
import {
  atom_codeFontFamily,
  atom_darkTheme,
  atom_editorFontFamily,
  atom_lightTheme,
  atom_renderedFontSize,
  atom_theme,
  type Theme,
} from "@/app/atoms/atoms";
import { atom_fullWidth } from "@/app/atoms/ui-atoms";
import Toggle from "@/app/components/Toggle";
import { DARK_THEMES, LIGHT_THEMES, resolveDarkTheme, resolveLightTheme } from "@/app/theme-palettes";
import FontPicker from "../components/FontPicker";
import ThemePicker from "../components/ThemePicker";
import { SegmentedControl, SettingGroup, SettingItem } from "../components/SettingControls";
import { CODE_FONTS, FONTS, TEXT_SIZES } from "../font-options";

const THEME_OPTIONS: { label: string; value: Theme; Icon: React.ComponentType<{ size?: number }> }[] = [
  { label: "Light", value: "light", Icon: HiOutlineSun },
  { label: "Dark", value: "dark", Icon: HiOutlineMoon },
  { label: "System", value: "system", Icon: HiOutlineDesktopComputer },
];

// Settings → Appearance: Theme (mode, then the palette that mode uses — both
// light and dark palettes only under System, since either may show) and
// Typography (font, code font, text size, full width) groups.
export default function AppearanceSettings() {
  const [theme, setTheme] = useAtom(atom_theme);
  const [lightTheme, setLightTheme] = useAtom(atom_lightTheme);
  const [darkTheme, setDarkTheme] = useAtom(atom_darkTheme);
  const [editorFontFamily, setEditorFontFamily] = useAtom(atom_editorFontFamily);
  const [codeFontFamily, setCodeFontFamily] = useAtom(atom_codeFontFamily);
  const [textSize, setTextSize] = useAtom(atom_renderedFontSize);
  const [fullWidth, setFullWidth] = useAtom(atom_fullWidth);

  return (
    <>
      <SettingGroup title="Theme">
        <SettingItem
          label="Theme"
          description="System follows your OS's light/dark setting and switches automatically when it changes."
          control={<SegmentedControl options={THEME_OPTIONS} value={theme} onChange={setTheme} />}
        />
        {theme !== "dark" && (
          <SettingItem
            label={theme === "system" ? "Light colors" : "Colors"}
            description={theme === "system" ? "Used while your system is light." : "The palette for light mode."}
            layout="stack"
            control={<ThemePicker themes={LIGHT_THEMES} value={resolveLightTheme(lightTheme)} onChange={setLightTheme} />}
          />
        )}
        {theme !== "light" && (
          <SettingItem
            label={theme === "system" ? "Dark colors" : "Colors"}
            description={theme === "system" ? "Used while your system is dark." : "The palette for dark mode."}
            layout="stack"
            control={<ThemePicker themes={DARK_THEMES} value={resolveDarkTheme(darkTheme)} onChange={setDarkTheme} />}
          />
        )}
      </SettingGroup>
      <SettingGroup title="Typography">
        <SettingItem
          label="Font"
          description="The font you write in."
          layout="stack"
          control={<FontPicker fonts={FONTS} value={editorFontFamily} onChange={setEditorFontFamily} />}
        />
        <SettingItem
          label="Code font"
          description="The font for code blocks and inline code."
          layout="stack"
          control={
            <FontPicker fonts={CODE_FONTS} value={codeFontFamily} onChange={setCodeFontFamily} previewText="const x = 0x1F; // =>" />
          }
        />
        <SettingItem
          label="Text size"
          description="The size of the editor's text."
          layout="stack"
          control={<SegmentedControl options={TEXT_SIZES} value={textSize} onChange={setTextSize} />}
        />
        <SettingItem
          label="Full Width"
          description="Let the text fill the whole editor. Turn it off to stop lines at a comfortable reading width."
          control={<Toggle variant="soft" active={fullWidth} onChange={setFullWidth} label="Full width" />}
        />
      </SettingGroup>
    </>
  );
}
