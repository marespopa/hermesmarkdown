"use client";

import React from "react";
import { useAtom } from "jotai";
import {
  atom_wordWrap,
  atom_fontSize,
  atom_fontFamily,
  atom_theme,
  atom_showStats,
} from "@/app/atoms/atoms";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import Button from "@/app/components/Button";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const SettingsDialog = ({ isOpen, onClose }: Props) => {
  const [fontSize, setFontSize] = useAtom(atom_fontSize);
  const [fontFamily, setFontFamily] = useAtom(atom_fontFamily);
  const [theme, setTheme] = useAtom(atom_theme);
  const [wordWrap, setWordWrap] = useAtom(atom_wordWrap);
  const [showStats, setShowStats] = useAtom(atom_showStats);

  const monoFonts = [
    {
      name: "System",
      value: "ui-monospace, SFMono-Regular, Consolas, monospace",
    },
    { name: "JetBrains", value: "var(--font-jetbrains), monospace" },
    { name: "Fira Code", value: "var(--font-fira), monospace" },
    { name: "IBM Plex", value: "var(--font-ibm), monospace" },
  ];

  const sizes = [
    { label: "S", value: "13px" },
    { label: "M", value: "15px" },
    { label: "L", value: "18px" },
    { label: "XL", value: "22px" },
  ];

  return (
    <DialogModal isOpened={isOpen} onClose={onClose}>
      {/* - min-w-full on mobile to prevent squishing 
          - Increased gap for better visual separation 
      */}
      <div className="flex flex-col gap-6 md:gap-8 w-full min-w-full sm:min-w-[340px] py-2 sm:py-4">
        {/* Typeface Selection */}
        <div className="space-y-3">
          <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-30 px-1">
            Typeface (Mono)
          </h3>
          {/* 2-column grid is fine for font names, but we add h-10 for better touch area */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
            {monoFonts.map((font) => (
              <Button
                key={font.value}
                variant={fontFamily === font.value ? "primary" : "secondary"}
                onClick={() => setFontFamily(font.value)}
                className="w-full h-10 sm:h-9 text-[11px] sm:text-[10px] border-none shadow-none"
              >
                {font.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Font Size Selection */}
        <div className="space-y-3">
          <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-30 px-1">
            Text Size
          </h3>
          <div className="flex gap-1.5 p-1 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
            {sizes.map((size) => (
              <Button
                key={size.value}
                variant={fontSize === size.value ? "primary" : "secondary"}
                onClick={() => setFontSize(size.value)}
                className="flex-1 h-10 sm:h-9 text-[11px] sm:text-[10px] border-none shadow-none"
              >
                {size.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Word Wrap Toggle */}
        <div className="space-y-3">
          <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-30 px-1">
            Editor Behavior
          </h3>
          <div className="flex flex-col gap-2">
            <div className="flex gap-1.5 p-1 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <Button
                variant={wordWrap ? "primary" : "secondary"}
                onClick={() => setWordWrap(true)}
                className="flex-1 h-10 sm:h-9 text-[11px] sm:text-[10px] border-none shadow-none"
              >
                Wrap
              </Button>
              <Button
                variant={!wordWrap ? "primary" : "secondary"}
                onClick={() => setWordWrap(false)}
                className="flex-1 h-10 sm:h-9 text-[11px] sm:text-[10px] border-none shadow-none"
              >
                No Wrap
              </Button>
            </div>

            <div className="flex gap-1.5 p-1 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <Button
                variant={showStats ? "primary" : "secondary"}
                onClick={() => setShowStats(true)}
                className="flex-1 h-10 sm:h-9 text-[11px] sm:text-[10px] border-none shadow-none"
              >
                Show Stats
              </Button>
              <Button
                variant={!showStats ? "primary" : "secondary"}
                onClick={() => setShowStats(false)}
                className="flex-1 h-10 sm:h-9 text-[11px] sm:text-[10px] border-none shadow-none"
              >
                Hide Stats
              </Button>
            </div>
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="flex items-center justify-between pt-6 border-t border-zinc-100 dark:border-zinc-800">
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-30">
            Appearance
          </span>
          <Button
            variant="secondary"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="h-10 sm:h-9 px-5 rounded-full text-[11px] sm:text-[10px] uppercase tracking-widest border-zinc-200 dark:border-zinc-700"
          >
            {theme} mode
          </Button>
        </div>
      </div>
    </DialogModal>
  );
};

export default SettingsDialog;
