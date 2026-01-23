"use client";

import React from "react";
import NavigationLink from "./NavigationLink";
import { useAtom } from "jotai";
import { atom_theme } from "@/app/atoms/atoms";
import Button from "@/app/components/Button";
import { FaSun, FaMoon } from "react-icons/fa";

type Props = {};

export default function NavigationLinks({}: Props) {
  const [theme, setTheme] = useAtom(atom_theme);
  return (
    <nav className="ml-auto" data-testid="navigation">
      <ul className="flex flex-col md:flex-row space-x-4 gap-8 items-center">
        <li>
          <NavigationLink label="Home" href="/" />
        </li>
        <li>
          <NavigationLink label="Learn Markdown" href="/documentation" />
        </li>
        <li>
          <NavigationLink label="FAQ" href="/faq" />
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
          >
            {theme === "light" ? <FaMoon className="w-5 h-5" /> : <FaSun className="w-5 h-5" />}
          </Button>
        </li>
      </ul>
    </nav>
  );
}
