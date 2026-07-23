"use client";

import { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { atom_theme } from "@/app/atoms/atoms";

const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

// atom_theme can be "system", which isn't itself a paintable value — this
// resolves it down to "light" | "dark", live-updating whenever the OS
// preference changes while "system" is selected. Anything that needs to
// render differently per theme (ThemeProvider's <html class="dark">,
// Navbar's logo swap, ...) should read this instead of the raw atom.
export function useResolvedTheme(): "light" | "dark" {
  const theme = useAtomValue(atom_theme);
  // Always starts false, on both server and the first client render — this
  // has to stay in lockstep with what got server-rendered (which never has
  // a `window` to check), or React flags a hydration mismatch the instant
  // this differs from the SSR'd markup. The real value is read in the
  // effect below, which runs post-hydration (a normal client-only update,
  // not part of the SSR diff), same discipline atomWithStorage itself uses
  // for atom_theme's own persisted value.
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

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
