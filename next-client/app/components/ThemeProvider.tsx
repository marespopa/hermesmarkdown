"use client";

import { useLayoutEffect } from "react";
import { useAtomValue } from "jotai";
import { atom_codeFontFamily, atom_darkTheme, atom_lightTheme, atom_theme } from "@/app/atoms/atoms";
import { useResolvedTheme } from "@/app/hooks/use-resolved-theme";
import { resolveDarkTheme, resolveLightTheme } from "@/app/theme-palettes";
import { normalizeChoice } from "@/app/atoms/choice-storage";
import { CODE_FONT_STACKS, MONO_FONT_STACK } from "@/app/atoms/ui-atoms";

// A stored pick as atomWithStorage writes it (JSON), or null.
function readStored(key: string): unknown {
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}

// The browser and installed-app bars (status bar, Android navigation bar)
// take <meta name="theme-color">; it gets the page's painted --surface, so
// they follow the mode and palette instead of the OS scheme. Every such meta
// is updated (Next renders one from layout.tsx's viewport), none removed.
export function syncThemeColor() {
  const surface = getComputedStyle(document.documentElement).getPropertyValue("--surface").trim();
  if (!surface) return;
  let metas = Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'));
  if (metas.length === 0) {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
    metas = [meta];
  }
  for (const meta of metas) meta.content = surface;
}

type Props = {
  children: React.ReactNode;
};

export default function ThemeProvider({ children }: Props) {
  // Already resolves "system" against the live OS preference (and re-renders
  // on change) — see use-resolved-theme.ts — so this effect only ever sees
  // a paintable "light"/"dark" value.
  const resolvedTheme = useResolvedTheme();
  const lightTheme = resolveLightTheme(useAtomValue(atom_lightTheme));
  const darkTheme = resolveDarkTheme(useAtomValue(atom_darkTheme));
  const theme = useAtomValue(atom_theme);
  const codeFont = useAtomValue(atom_codeFontFamily);
  // Until the atoms have read localStorage (atomWithStorage does that after
  // mount), they hold their defaults, not the reader's picks, while
  // THEME_INIT_SCRIPT (layout.tsx) has already painted <html> with the
  // stored ones. Writing then flashed the default theme for a frame, so
  // each effect waits until its atoms agree with storage. A pick made in
  // the app writes storage before it re-renders, so it always agrees.

  // useLayoutEffect (not useEffect) — applies the class synchronously before
  // the browser paints. With useEffect there's a one-frame gap on toggle
  // where other components have already re-rendered for the new theme but
  // <html>'s `dark` class (which every Tailwind `dark:` style depends on)
  // hasn't flipped yet, producing a visible flash of the old theme.
  useLayoutEffect(() => {
    if ((readStored("theme") ?? "system") !== theme) return;
    const root = window.document.documentElement;

    if (resolvedTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [resolvedTheme, theme]);

  // Both palettes stay on <html>; globals.scss applies the light one without
  // `dark` and the dark one with it, so switching mode needs no update here.
  useLayoutEffect(() => {
    if (resolveLightTheme(readStored("lightTheme")) !== lightTheme) return;
    if (resolveDarkTheme(readStored("darkTheme")) !== darkTheme) return;
    const root = window.document.documentElement;
    root.dataset.lightTheme = lightTheme;
    root.dataset.darkTheme = darkTheme;
  }, [lightTheme, darkTheme]);

  // After the mode and palette effects above, so it reads the new colors.
  useLayoutEffect(() => {
    syncThemeColor();
  }, [resolvedTheme, theme, lightTheme, darkTheme]);

  // The code font, as --font-code (globals.scss) on <html>.
  useLayoutEffect(() => {
    if (normalizeChoice<string>(readStored("codeFontFamily"), CODE_FONT_STACKS, MONO_FONT_STACK) !== codeFont) return;
    window.document.documentElement.style.setProperty("--font-code", codeFont);
  }, [codeFont]);

  return <>{children}</>;
}