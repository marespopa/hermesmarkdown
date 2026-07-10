"use client";

import { useAtom } from "jotai";
import { useLayoutEffect } from "react";
import { atom_theme } from "@/app/atoms/atoms";

type Props = {
  children: React.ReactNode;
};

export default function ThemeProvider({ children }: Props) {
  const [theme] = useAtom(atom_theme);

  // useLayoutEffect (not useEffect) — applies the class synchronously before
  // the browser paints. With useEffect there's a one-frame gap on toggle
  // where other components have already re-rendered for the new theme but
  // <html>'s `dark` class (which every Tailwind `dark:` style depends on)
  // hasn't flipped yet, producing a visible flash of the old theme.
  useLayoutEffect(() => {
    const root = window.document.documentElement;

    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  return <>{children}</>;
} 