"use client";

import React from "react";
import NavigationLink from "./NavigationLink";
import { FaTimesCircle, FaSun, FaMoon } from "react-icons/fa";
import { useAtom } from "jotai";
import { atom_theme } from "@/app/atoms/atoms";

type Props = {
  handleClose: () => void;
};

export default function MobileNavigationLinks({ handleClose }: Props) {
  const [theme, setTheme] = useAtom(atom_theme);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-gray-900 bg-opacity-95 dark:bg-opacity-95">
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 text-3xl text-gray-700 dark:text-gray-300 focus:outline-none"
        aria-label="Close Menu"
      >
        &times;
      </button>
      <div className="flex flex-col gap-3 w-full max-w-xs px-4">
        <button
          className="w-full py-3 border border-black dark:border-white bg-white dark:bg-gray-900 text-black dark:text-white font-mono font-bold rounded-none text-lg hover:bg-black hover:text-white transition-colors"
          onClick={() => {
            handleClose();
            window.location.href = "/";
          }}
        >
          Home
        </button>
        <button
          className="w-full py-3 border border-black dark:border-white bg-white dark:bg-gray-900 text-black dark:text-white font-mono font-bold rounded-none text-lg hover:bg-black hover:text-white transition-colors"
          onClick={() => {
            handleClose();
            window.location.href = "/documentation";
          }}
        >
          Learn Markdown
        </button>
        <button
          className="w-full py-3 border border-black dark:border-white bg-white dark:bg-gray-900 text-black dark:text-white font-mono font-bold rounded-none text-lg hover:bg-black hover:text-white transition-colors"
          onClick={() => {
            handleClose();
            window.location.href = "/faq";
          }}
        >
          FAQ
        </button>
        <button
          className="w-full py-3 border border-black dark:border-white bg-white dark:bg-gray-900 text-black dark:text-white font-mono font-bold rounded-none text-lg hover:bg-black hover:text-white transition-colors flex items-center justify-center gap-2"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          {theme === "light" ? <FaMoon className="w-5 h-5" /> : <FaSun className="w-5 h-5" />}
          {theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
        </button>
      </div>
    </div>
  );
}
