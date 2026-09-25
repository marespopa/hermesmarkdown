import type { Theme } from "@/app/atoms/ui-atoms";

const THEME_SEQUENCE: readonly Theme[] = ["system", "light", "dark"];

export function getNextTheme(theme: Theme): Theme {
  const currentIndex = THEME_SEQUENCE.indexOf(theme);
  return THEME_SEQUENCE[(currentIndex + 1) % THEME_SEQUENCE.length];
}

export function getThemeLabel(theme: Theme): string {
  return `Theme: ${theme[0].toUpperCase()}${theme.slice(1)}`;
}
