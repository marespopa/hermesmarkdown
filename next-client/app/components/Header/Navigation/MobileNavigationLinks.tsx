"use client";

import React from "react";
import { FaSun, FaMoon } from "react-icons/fa";
import { HiOutlineDesktopComputer } from "react-icons/hi";
import { IoClose } from "react-icons/io5";
import { useAtom } from "jotai";
import { atom_theme } from "@/app/atoms/atoms";
import { useRouter } from "next/navigation";
import Button from "@/app/components/Button/Button.component";
import Portal from "@/app/components/Portal";
import { getNextTheme, getThemeLabel } from "@/app/utils/theme";

type Props = {
  handleClose: () => void;
};

export default function MobileNavigationLinks({ handleClose }: Props) {
  const [theme, setTheme] = useAtom(atom_theme);
  const themeLabel = getThemeLabel(theme);
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
        <div className="absolute inset-0 bg-black/5 dark:bg-black/20 backdrop-blur-md animate-in fade-in duration-overlay-backdrop motion-reduce:animate-none" />

        {/* Card */}
        <div className="relative z-10 w-full max-w-sm glass-panel rounded-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-overlay-panel ease-layout motion-reduce:animate-none">
          <Button
            variant="close"
            onClick={handleClose}
            className="absolute top-4 right-4 z-20"
            aria-label="Close Menu"
          >
            <IoClose size={20} aria-hidden="true" />
          </Button>

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
              onClick={() => setTheme(getNextTheme(theme))}
              className={`${navBtnStyles} flex items-center justify-center gap-2`}
              suppressHydrationWarning
            >
              {theme === "system" ? (
                <HiOutlineDesktopComputer className="w-5 h-5" />
              ) : theme === "light" ? (
                <FaSun className="w-5 h-5" />
              ) : (
                <FaMoon className="w-5 h-5" />
              )}
              {themeLabel}
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
