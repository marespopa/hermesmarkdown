"use client";

import React from "react";
import { FaSun, FaMoon } from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import { useAtom } from "jotai";
import { atom_theme } from "@/app/atoms/atoms";
import { useRouter } from "next/navigation";
import Button from "@/app/components/Button/Button.component";
import Portal from "@/app/components/Portal";

type Props = {
  handleClose: () => void;
};

export default function MobileNavigationLinks({ handleClose }: Props) {
  const [theme, setTheme] = useAtom(atom_theme);
  const router = useRouter();

  const navBtnStyles =
    "w-full py-2.5 px-5 rounded-xl bg-neutral-100/80 dark:bg-neutral-800/80 text-neutral-900 dark:text-white text-ui-callout hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors";

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/5 dark:bg-black/20 backdrop-blur-md animate-in fade-in duration-300" />

        {/* Card */}
        <div className="relative z-10 w-full max-w-sm bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl border border-white/20 dark:border-neutral-800/50 rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-500 ease-out">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-20 p-1.5 rounded-full bg-neutral-200/50 dark:bg-neutral-800/50 hover:bg-neutral-300/80 dark:hover:bg-neutral-700/80 transition-all active:scale-90"
            aria-label="Close Menu"
          >
            <IoClose size={20} className="text-neutral-600 dark:text-neutral-300" />
          </button>

          <div className="pt-16 px-6 pb-6 flex flex-col gap-3">
            <Button
              variant="bare"
              onClick={() => {
                handleClose();
                router.push("/");
              }}
              className={navBtnStyles}
            >
              Home
            </Button>
            <Button
              variant="bare"
              onClick={() => {
                handleClose();
                router.push("/documentation");
              }}
              className={navBtnStyles}
            >
              Documentation
            </Button>
            <Button
              variant="bare"
              onClick={() => {
                handleClose();
                router.push("/contact");
              }}
              className={navBtnStyles}
            >
              Contact
            </Button>
            <Button
              variant="bare"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className={`${navBtnStyles} flex items-center justify-center gap-2`}
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
      </div>
    </Portal>
  );
}
