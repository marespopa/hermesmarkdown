"use client";

import { useAtom } from "jotai";
import { FaSun, FaMoon } from "react-icons/fa";
import { atom_theme } from "@/app/atoms/atoms";

export default function ThemeToggle() {
  const [theme, setTheme] = useAtom(atom_theme);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      data-testid="theme-toggle"
    >
      {theme === "light" ? (
        <FaMoon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      ) : (
        <FaSun className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      )}
    </button>
  );
} 