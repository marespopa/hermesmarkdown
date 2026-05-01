"use client";

import React from "react";
import { FaSun, FaMoon } from "react-icons/fa";
import { useAtom } from "jotai";
import { atom_theme } from "@/app/atoms/atoms";
import { useRouter } from "next/navigation";
import Button from "@/app/components/Button/Button.component";

type Props = {
  handleClose: () => void;
};

export default function MobileNavigationLinks({ handleClose }: Props) {
  const [theme, setTheme] = useAtom(atom_theme);
  const router = useRouter();

  const navBtnStyles =
    "w-full py-2 px-5 border border-black dark:border-white bg-white dark:bg-gray-900 text-black dark:text-white rounded-none text-base hover:bg-black hover:text-white transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-neutral-900 bg-opacity-95 dark:bg-opacity-95">
      <Button
        variant="bare"
        onClick={handleClose}
        styles="absolute top-4 right-4 text-3xl text-neutral-700 dark:text-neutral-300 focus:outline-none"
        aria-label="Close Menu"
      >
        &times;
      </Button>
      <div className="flex flex-col gap-3 w-full max-w-xs px-4">
        <Button
          variant="bare"
          onClick={() => {
            handleClose();
            router.push("/");
          }}
          styles={navBtnStyles}
        >
          Home
        </Button>
        <Button
          variant="bare"
          onClick={() => {
            handleClose();
            router.push("/documentation");
          }}
          styles={navBtnStyles}
        >
          Documentation
        </Button>
        <Button
          variant="bare"
          onClick={() => {
            handleClose();
            router.push("/contact");
          }}
          styles={navBtnStyles}
        >
          Contact
        </Button>
        <Button
          variant="bare"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          styles={`${navBtnStyles} flex items-center justify-center gap-2`}
        >
          {theme === "light" ? (
            <FaMoon className="w-5 h-5" />
          ) : (
            <FaSun className="w-5 h-5" />
          )}
          {theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
        </Button>
      </div>
    </div>
  );
}
