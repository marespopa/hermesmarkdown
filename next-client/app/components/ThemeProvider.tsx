"use client";

import { useLayoutEffect } from "react";
import { useResolvedTheme } from "@/app/hooks/use-resolved-theme";

type Props = {
  children: React.ReactNode;
};

export default function ThemeProvider({ children }: Props) {
  // Already resolves "system" against the live OS preference (and re-renders
  // on change) — see use-resolved-theme.ts — so this effect only ever sees
  // a paintable "light"/"dark" value.
  const resolvedTheme = useResolvedTheme();

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

  return <>{children}</>;
}