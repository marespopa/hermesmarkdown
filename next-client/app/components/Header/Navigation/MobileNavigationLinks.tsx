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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-neutral-900 bg-opacity-95 dark:bg-opacity-95">
      <button onClick={handleClose} className="absolute top-4 right-4 text-3xl text-neutral-700 dark:text-neutral-300 focus:outline-none" aria-label="Close Menu">&times;</button>
      <div className="flex flex-col gap-3 w-full max-w-xs px-4">
        <button onClick={() => { handleClose(); window.location.href = "/"; }} className="w-full py-2 px-5 border border-black dark:border-white bg-white dark:bg-gray-900 text-black dark:text-white rounded-none text-base hover:bg-black hover:text-white transition-colors">Home</button>
        <button onClick={() => { handleClose(); window.location.href = "/documentation"; }} className="w-full py-2 px-5 border border-black dark:border-white bg-white dark:bg-gray-900 text-black dark:text-white rounded-none text-base hover:bg-black hover:text-white transition-colors">Learn Markdown</button>
        <button onClick={() => { handleClose(); window.location.href = "/faq"; }} className="w-full py-2 px-5 border border-black dark:border-white bg-white dark:bg-gray-900 text-black dark:text-white rounded-none text-base hover:bg-black hover:text-white transition-colors">FAQ</button>
        <button onClick={() => setTheme(theme === "light" ? "dark" : "light")} className="w-full py-2 px-5 border border-black dark:border-white bg-white dark:bg-gray-900 text-black dark:text-white rounded-none text-base hover:bg-black hover:text-white transition-colors flex items-center justify-center gap-2">
          {theme === "light" ? <FaMoon className="w-5 h-5" /> : <FaSun className="w-5 h-5" />}
          {theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
        </button>
      </div>
    </div>
  );
}
