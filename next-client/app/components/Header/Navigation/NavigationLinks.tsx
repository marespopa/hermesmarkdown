"use client";

import React from "react";
import NavigationLink from "./NavigationLink";
import { useAtom } from "jotai";
import { atom_theme } from "@/app/atoms/atoms";
import Button from "@/app/components/Button";
import { FaSun, FaMoon } from "react-icons/fa";
import { HiOutlineDesktopComputer } from "react-icons/hi";
import { getNextTheme, getThemeLabel } from "@/app/utils/theme";

export default function NavigationLinks() {
  const [theme, setTheme] = useAtom(atom_theme);
  const themeLabel = getThemeLabel(theme);

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
            onClick={() => setTheme(getNextTheme(theme))}
            aria-label={themeLabel}
            title={themeLabel}
            data-testid="theme-toggle"
            suppressHydrationWarning
          >
            {theme === "system" ? (
              <HiOutlineDesktopComputer className="w-5 h-5" />
            ) : theme === "light" ? (
              <FaSun className="w-5 h-5" />
            ) : (
              <FaMoon className="w-5 h-5" />
            )}
          </Button>
        </li>
      </ul>
    </nav>
  );
}
