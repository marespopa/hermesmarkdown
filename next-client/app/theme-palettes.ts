// Color themes per mode: the light mode and the dark mode each pick one of
// their own palettes (Settings → Appearance, the Theme commands), in pairs:
// Paper / Ink (paper and blue ink; Ink is the dark paper), Solarized /
// Solarized, and Plain / Graphite (neutral, no tint at all), plus Sepia, a
// warm reading page, and Nord, arctic blue, with no pair of their own. Paper and
// Ink, the paper pair, are the defaults. The colors live
// in theme-palettes.scss, keyed by <html data-light-theme / data-dark-theme>;
// the first palette of each list is the default, set on <html> before the
// first paint (layout.tsx) when nothing else was picked. Paper and Ink are
// the plain globals.scss tokens, with no block of their own.
// The swatch values here only draw the picker's previews.

export type LightTheme = "paper" | "sepia" | "solarized" | "plain";
export type DarkTheme = "ink" | "nord" | "solarized" | "graphite";

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
    value: "solarized",
    label: "Solarized",
    description: "Classic cream",
    swatch: { surface: "#FDF6E3", chrome: "#EEE8D5", fg: "#073642", accent: "#1A6BA6" },
  },
  {
    value: "plain",
    label: "Plain",
    description: "Neutral white",
    swatch: { surface: "#FCFCFC", chrome: "#F1F1F1", fg: "#1C1C1C", accent: "#2B2B2B" },
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
    value: "solarized",
    label: "Solarized",
    description: "Classic deep teal",
    swatch: { surface: "#002B36", chrome: "#00222B", fg: "#EEE8D5", accent: "#5AABE3" },
  },
  {
    value: "graphite",
    label: "Graphite",
    description: "Neutral dark",
    swatch: { surface: "#1C1C1E", chrome: "#111112", fg: "#E9E9EB", accent: "#C8C8CC" },
  },
];

// Palettes from earlier versions, moved to their closest current one.
const LEGACY_LIGHT_THEMES: Record<string, LightTheme> = { sage: "paper", porcelain: "plain" };
const LEGACY_DARK_THEMES: Record<string, DarkTheme> = { midnight: "nord", dusk: "ink" };

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
