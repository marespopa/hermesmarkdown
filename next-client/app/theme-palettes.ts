// Color themes per mode: the light mode and the dark mode each pick one of
// their own three palettes (Settings → Appearance, the Theme commands):
// Paper / Ink (paper and blue ink; Ink is the dark paper), the defaults;
// Sepia, a warm reading page, and Nord, arctic blue; and Quartz / Onyx,
// neutral with no tint, a bright blue caret and selection, and headings in
// the ink. The colors live
// in theme-palettes.scss, keyed by <html data-light-theme / data-dark-theme>;
// the first palette of each list is the default, set on <html> before the
// first paint (layout.tsx) when nothing else was picked. Paper and Ink are
// the plain globals.scss tokens, with no block of their own.
// The swatch values here only draw the picker's previews.

export type LightTheme = "paper" | "sepia" | "quartz";
export type DarkTheme = "ink" | "nord" | "onyx";

export interface ThemePalette<T extends string> {
  value: T;
  label: string;
  description: string;
  swatch: { surface: string; chrome: string; fg: string; accent: string };
}

export const LIGHT_THEMES: ThemePalette<LightTheme>[] = [
  {
    value: "paper",
    label: "Paper",
    description: "Grey-white paper, blue ink",
    swatch: { surface: "#F1F0EB", chrome: "#E8E7E0", fg: "#2A3A5E", accent: "#3A5A8C" },
  },
  {
    value: "sepia",
    label: "Sepia",
    description: "Warm cream, for reading",
    swatch: { surface: "#F4ECD8", chrome: "#E8DEC6", fg: "#4F3D2C", accent: "#5E6624" },
  },
  {
    value: "quartz",
    label: "Quartz",
    description: "Neutral page, blue caret",
    swatch: { surface: "#F7F7F7", chrome: "#EDEDED", fg: "#1F1F1F", accent: "#15BDEC" },
  },
];

export const DARK_THEMES: ThemePalette<DarkTheme>[] = [
  {
    value: "ink",
    label: "Ink",
    description: "Dark paper, ink blue",
    swatch: { surface: "#211E1B", chrome: "#181614", fg: "#E6E0D6", accent: "#8FA8D0" },
  },
  {
    value: "nord",
    label: "Nord",
    description: "Arctic blue",
    swatch: { surface: "#2E3440", chrome: "#262B35", fg: "#ECEFF4", accent: "#88C0D0" },
  },
  {
    value: "onyx",
    label: "Onyx",
    description: "Neutral dark, blue caret",
    swatch: { surface: "#1A1A1A", chrome: "#101010", fg: "#DADADA", accent: "#2CC4F0" },
  },
];

// Palettes from earlier versions, moved to their closest current one.
const LEGACY_LIGHT_THEMES: Record<string, LightTheme> = {
  sage: "paper",
  porcelain: "quartz",
  plain: "quartz",
  solarized: "sepia",
};
const LEGACY_DARK_THEMES: Record<string, DarkTheme> = {
  midnight: "nord",
  dusk: "ink",
  graphite: "onyx",
  solarized: "nord",
};

export const DEFAULT_LIGHT_THEME: LightTheme = "paper";
export const DEFAULT_DARK_THEME: DarkTheme = "ink";

// Stored values come from localStorage, so a palette from an earlier version
// moves to its closest current one, and anything else unknown (a
// hand-edited value) falls back to the default.
export function resolveLightTheme(value: unknown): LightTheme {
  if (LIGHT_THEMES.some((t) => t.value === value)) return value as LightTheme;
  return (typeof value === "string" && LEGACY_LIGHT_THEMES[value]) || DEFAULT_LIGHT_THEME;
}

export function resolveDarkTheme(value: unknown): DarkTheme {
  if (DARK_THEMES.some((t) => t.value === value)) return value as DarkTheme;
  return (typeof value === "string" && LEGACY_DARK_THEMES[value]) || DEFAULT_DARK_THEME;
}

// For the pre-paint script (layout.tsx), which can't import the resolvers.
export const LEGACY_THEME_MAP = { light: LEGACY_LIGHT_THEMES, dark: LEGACY_DARK_THEMES };
