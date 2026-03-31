"use client";

import React from "react";
import { useAtom } from "jotai";
import { atom_fontSize, atom_fontFamily, atom_theme } from "@/app/atoms/atoms";
import DialogModal from "@/app/components/DialogModal/DialogModal";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const SettingsDialog = ({ isOpen, onClose }: Props) => {
  const [fontSize, setFontSize] = useAtom(atom_fontSize);
  const [fontFamily, setFontFamily] = useAtom(atom_fontFamily);
  const [theme, setTheme] = useAtom(atom_theme);

  const monoFonts = [
    {
      name: "System Mono",
      value:
        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
    },
    {
      name: "Fira Code",
      value: "'Fira Code', 'Fira Mono', 'Source Code Pro', monospace",
    },
    {
      name: "JetBrains",
      value: "'JetBrains Mono', 'Geist Mono', 'Cascadia Code', monospace",
    },
    {
      name: "iA Mono",
      value: "'iA Writer Mono', 'IBM Plex Mono', 'Courier New', monospace",
    },
  ];

  const sizes = [
    { label: "S", value: "13px" }, // Equivalent to text-sm (approx)
    { label: "M", value: "15px" }, // Equivalent to text-base (approx)
    { label: "L", value: "18px" }, // Equivalent to text-lg
    { label: "XL", value: "22px" }, // Equivalent to text-xl
  ];

  return (
    <DialogModal isOpened={isOpen} onClose={onClose}>
      <div className="flex flex-col gap-8 w-full min-w-[280px] py-4">
        {/* Typeface Selection */}
        <div className="space-y-4">
          <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-30">
            Typeface (Mono)
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {monoFonts.map((font) => (
              <button
                key={font.value}
                onClick={() => setFontFamily(font.value)}
                className={`px-3 py-2 text-[10px] uppercase tracking-wider rounded-lg border transition-all ${
                  fontFamily === font.value
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-black"
                    : "border-neutral-200 dark:border-neutral-800 opacity-50 hover:opacity-100"
                }`}
              >
                {font.name}
              </button>
            ))}
          </div>
        </div>

        {/* Font Size Selection */}
        <div className="space-y-4">
          <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-30">
            Text Size
          </h3>
          <div className="flex gap-2">
            {sizes.map((size) => (
              <button
                key={size.value}
                onClick={() => setFontSize(size.value)}
                className={`flex-1 py-2 text-[10px] rounded-lg border transition-all ${
                  fontSize === size.value
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-black"
                    : "border-neutral-200 dark:border-neutral-800 opacity-50 hover:opacity-100"
                }`}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-800">
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-30">
            Appearance
          </span>
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="text-[10px] uppercase tracking-widest px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
          >
            {theme} mode
          </button>
        </div>
      </div>
    </DialogModal>
  );
};

export default SettingsDialog;
