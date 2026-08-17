"use client";

import { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { atom_theme } from "@/app/atoms/atoms";

const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

function getInitialSystemPrefersDark() {
  if (typeof window === "undefined") return false;
  if (window.document.documentElement.classList.contains("dark")) return true;
  return window.matchMedia(DARK_MEDIA_QUERY).matches;
}

// atom_theme can be "system", which isn't itself a paintable value — this
// resolves it down to "light" | "dark", live-updating whenever the OS
// preference changes while "system" is selected. Anything that needs to
// render differently per theme (ThemeProvider's <html class="dark">,
// Navbar's logo swap, ...) should read this instead of the raw atom.
export function useResolvedTheme(): "light" | "dark" {
  const theme = useAtomValue(atom_theme);
  // On the first client render, prefer the already-applied root class from
  // THEME_INIT_SCRIPT before falling back to matchMedia. That preserves the
  // pre-hydration dark theme for pages that intentionally delay client-only UI
  // (like the landing-page "Welcome Back" toast) until after mount.
  const [systemPrefersDark, setSystemPrefersDark] = useState(getInitialSystemPrefersDark);

  useEffect(() => {
    if (theme !== "system") return;
    const mql = window.matchMedia(DARK_MEDIA_QUERY);
    setSystemPrefersDark(mql.matches);
    const handleChange = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, [theme]);

  if (theme === "system") return systemPrefersDark ? "dark" : "light";
  return theme;
}
