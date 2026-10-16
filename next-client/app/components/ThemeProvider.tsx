"use client";

import { useLayoutEffect } from "react";
import { useAtomValue } from "jotai";
import { atom_darkTheme, atom_lightTheme } from "@/app/atoms/atoms";
import { useResolvedTheme } from "@/app/hooks/use-resolved-theme";
import { resolveDarkTheme, resolveLightTheme } from "@/app/theme-palettes";

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

  // useLayoutEffect (not useEffect) — applies the class synchronously before
  // the browser paints. With useEffect there's a one-frame gap on toggle
  // where other components have already re-rendered for the new theme but
  // <html>'s `dark` class (which every Tailwind `dark:` style depends on)
  // hasn't flipped yet, producing a visible flash of the old theme.
  useLayoutEffect(() => {
    const root = window.document.documentElement;

    if (resolvedTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [resolvedTheme]);

  // Both palettes stay on <html>; globals.scss applies the light one without
  // `dark` and the dark one with it, so switching mode needs no update here.
  useLayoutEffect(() => {
    const root = window.document.documentElement;
    root.dataset.lightTheme = lightTheme;
    root.dataset.darkTheme = darkTheme;
  }, [lightTheme, darkTheme]);

  return <>{children}</>;
}