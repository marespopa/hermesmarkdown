// Color themes per mode: the light mode and the dark mode each pick one of
// their own palettes (Settings → Appearance, the Theme commands). The colors
// live in globals.scss, keyed by <html data-light-theme / data-dark-theme>;
// the first palette of each list is the default and has no override there.
// The swatch values here only draw the picker's previews.

export type LightTheme = "paper" | "sepia" | "porcelain" | "sage" | "solarized";
export type DarkTheme = "ink" | "midnight" | "graphite" | "dusk" | "nord";

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
    description: "Soft off-white",
    swatch: { surface: "#FAF9F7", chrome: "#F0EFEC", fg: "#2A2825", accent: "#A2563E" },
  },
  {
    value: "sepia",
    label: "Sepia",
    description: "Warm cream",
    swatch: { surface: "#F7F1E5", chrome: "#ECE3D1", fg: "#3A2F23", accent: "#8A5A2B" },
  },
  {
    value: "porcelain",
    label: "Porcelain",
    description: "Cool white",
    swatch: { surface: "#F8F9FB", chrome: "#ECEFF3", fg: "#1F2329", accent: "#3F6EA8" },
  },
  {
    value: "sage",
    label: "Sage",
    description: "Soft green",
    swatch: { surface: "#F4F6F1", chrome: "#E7ECE1", fg: "#232A22", accent: "#4F6B3A" },
  },
  {
    value: "solarized",
    label: "Solarized",
    description: "Classic cream",
    swatch: { surface: "#FDF6E3", chrome: "#EEE8D5", fg: "#073642", accent: "#1A6BA6" },
  },
];

export const DARK_THEMES: ThemePalette<DarkTheme>[] = [
  {
    value: "ink",
    label: "Ink",
    description: "Warm dark",
    swatch: { surface: "#211E1B", chrome: "#181614", fg: "#ECE7E0", accent: "#D88B68" },
  },
  {
    value: "midnight",
    label: "Midnight",
    description: "Deep blue",
    swatch: { surface: "#1A1F29", chrome: "#12161E", fg: "#E4E8EF", accent: "#7AA7E8" },
  },
  {
    value: "graphite",
    label: "Graphite",
    description: "Neutral gray",
    swatch: { surface: "#1C1C1E", chrome: "#111112", fg: "#E9E9EB", accent: "#A3ACB9" },
  },
  {
    value: "dusk",
    label: "Dusk",
    description: "Muted violet",
    swatch: { surface: "#221E2A", chrome: "#19161F", fg: "#ECE6F2", accent: "#B49BE0" },
  },
  {
    value: "nord",
    label: "Nord",
    description: "Arctic blue",
    swatch: { surface: "#2E3440", chrome: "#262B35", fg: "#ECEFF4", accent: "#88C0D0" },
  },
];

export const DEFAULT_LIGHT_THEME: LightTheme = "paper";
export const DEFAULT_DARK_THEME: DarkTheme = "ink";

// Stored values come from localStorage, so anything unknown (a removed
// palette, a hand-edited value) falls back to the default.
export function resolveLightTheme(value: unknown): LightTheme {
  return LIGHT_THEMES.some((t) => t.value === value) ? (value as LightTheme) : DEFAULT_LIGHT_THEME;
}

export function resolveDarkTheme(value: unknown): DarkTheme {
  return DARK_THEMES.some((t) => t.value === value) ? (value as DarkTheme) : DEFAULT_DARK_THEME;
}
