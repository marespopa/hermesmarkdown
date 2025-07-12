"use client";

import { useAtom } from "jotai";
import { FaSun, FaMoon } from "react-icons/fa";
import { atom_theme } from "@/app/atoms/atoms";
import IconButton from "@/app/components/IconButton";

export default function ThemeToggle() {
  const [theme, setTheme] = useAtom(atom_theme);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <IconButton
      icon={theme === "light" ? <FaMoon className="w-5 h-5" /> : <FaSun className="w-5 h-5" />}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      onClick={toggleTheme}
      dataTestId="theme-toggle"
    />
  );
} 