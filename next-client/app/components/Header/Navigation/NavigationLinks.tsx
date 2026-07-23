"use client";

import React from "react";
import NavigationLink from "./NavigationLink";
import { useSetAtom } from "jotai";
import { atom_theme } from "@/app/atoms/atoms";
import { useResolvedTheme } from "@/app/hooks/use-resolved-theme";
import Button from "@/app/components/Button";
import { FaSun, FaMoon } from "react-icons/fa";

export default function NavigationLinks() {
  const setTheme = useSetAtom(atom_theme);
  // Quick toggle always sets an explicit light/dark choice (not "system") —
  // the three-way picker for that lives in Settings, this is just a fast
  // flip from wherever the theme currently resolves to.
  const theme = useResolvedTheme();
  return (
    <nav className="ml-auto" data-testid="navigation">
      <ul className="flex flex-col md:flex-row space-x-4 gap-8 items-center">
        <li>
          <NavigationLink label="Home" href="/" />
        </li>
        <li>
          <NavigationLink label="Documentation" href="/documentation" />
        </li>
        <li>
          <NavigationLink label="Contact" href="/contact" />
        </li>
        <li>
          <Button
            variant="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label={theme === "light" ? "Dark" : "Light"}
            title={theme === "light" ? "Dark" : "Light"}
            data-testid="theme-toggle"
            // "system" resolves from the OS preference, unknown to SSR —
            // see use-resolved-theme.ts.
            suppressHydrationWarning
          >
            {theme === "light" ? (
              <FaMoon className="w-5 h-5" />
            ) : (
              <FaSun className="w-5 h-5" />
            )}
          </Button>
        </li>
      </ul>
    </nav>
  );
}
