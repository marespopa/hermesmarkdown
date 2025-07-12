"use client";

import { useAtom } from "jotai";
import { useEffect } from "react";
import { atom_theme } from "@/app/atoms/atoms";

type Props = {
  children: React.ReactNode;
};

export default function ThemeProvider({ children }: Props) {
  const [theme] = useAtom(atom_theme);

  useEffect(() => {
    const root = window.document.documentElement;
    
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  return <>{children}</>;
} 