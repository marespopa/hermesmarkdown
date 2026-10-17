"use client";

import React from "react";
import { useAtom } from "jotai";
import { HiOutlineDesktopComputer, HiOutlineMoon, HiOutlineSun } from "react-icons/hi";
import { atom_darkTheme, atom_lightTheme, atom_theme, type Theme } from "@/app/atoms/ui-atoms";
import { DARK_THEMES, LIGHT_THEMES, resolveDarkTheme, resolveLightTheme } from "@/app/theme-palettes";
import ThemePicker from "@/app/editor/settings/components/ThemePicker";
import { SegmentedControl } from "@/app/editor/settings/components/SettingControls";

const MODE_OPTIONS: { label: string; value: Theme; Icon: React.ComponentType<{ size?: number }> }[] = [
  { label: "Light", value: "light", Icon: HiOutlineSun },
  { label: "Dark", value: "dark", Icon: HiOutlineMoon },
  { label: "System", value: "system", Icon: HiOutlineDesktopComputer },
];

// The home page's theme selector: the same mode and palette picks as
// Settings → Appearance (the same atoms), so a visitor can choose their
// colors before opening the editor and the page repaints as they pick.
// Light and Dark show only their own palettes; System shows both.
export default function LandingThemePicker() {
  const [theme, setTheme] = useAtom(atom_theme);
  const [lightTheme, setLightTheme] = useAtom(atom_lightTheme);
  const [darkTheme, setDarkTheme] = useAtom(atom_darkTheme);

  return (
    <div className="space-y-6">
      <SegmentedControl options={MODE_OPTIONS} value={theme} onChange={setTheme} />
      {theme !== "dark" && (
        <div className="space-y-2">
          {theme === "system" && <h3 className="text-ui-footnote font-semibold text-fg-muted">Light</h3>}
          <ThemePicker themes={LIGHT_THEMES} value={resolveLightTheme(lightTheme)} onChange={setLightTheme} />
        </div>
      )}
      {theme !== "light" && (
        <div className="space-y-2">
          {theme === "system" && <h3 className="text-ui-footnote font-semibold text-fg-muted">Dark</h3>}
          <ThemePicker themes={DARK_THEMES} value={resolveDarkTheme(darkTheme)} onChange={setDarkTheme} />
        </div>
      )}
    </div>
  );
}
