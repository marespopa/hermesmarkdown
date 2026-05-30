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

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-3">
      <h3 className="text-[9px] tracking-[0.2em] font-bold opacity-30 px-1">
        {title}
      </h3>
      {children}
    </div>
  );

  return (
    <DialogModal isOpened={isOpen} onClose={onClose} styles="!max-w-md !max-h-[90vh]">
      <div className="flex flex-col h-full max-h-[80vh]">
        <div className="space-y-1 mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-[10px] tracking-widest opacity-40 font-mono">Environment Configuration</p>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8 py-2">
          <Section title="Typeface">
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-800">
              {monoFonts.map((font) => (
                <Button
                  key={font.value}
                  variant={fontFamily === font.value ? "primary" : "secondary"}
                  onClick={() => setFontFamily(font.value)}
                  className="w-full h-10 text-[11px] border-none shadow-none !rounded-xl transition-all"
                >
                  {font.name}
                </Button>
              ))}
            </div>
          </Section>

          <Section title="Text Size">
            <div className="flex gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-800">
              {sizes.map((size) => (
                <Button
                  key={size.value}
                  variant={fontSize === size.value ? "primary" : "secondary"}
                  onClick={() => setFontSize(size.value)}
                  className="flex-1 h-10 text-[11px] border-none shadow-none !rounded-xl transition-all"
                >
                  {size.label}
                </Button>
              ))}
            </div>
          </Section>

          <Section title="Interface">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <span className="text-[9px] tracking-widest opacity-30 font-bold ml-1">Word Wrap</span>
                <div className="flex p-1 bg-neutral-100 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                  <Button
                    variant={wordWrap ? "primary" : "secondary"}
                    onClick={() => setWordWrap(true)}
                    className="flex-1 h-9 text-[10px] border-none shadow-none !rounded-xl"
                  >
                    On
                  </Button>
                  <Button
                    variant={!wordWrap ? "primary" : "secondary"}
                    onClick={() => setWordWrap(false)}
                    className="flex-1 h-9 text-[10px] border-none shadow-none !rounded-xl"
                  >
                    Off
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[9px] tracking-widest opacity-30 font-bold ml-1">Status Bar</span>
                <div className="flex p-1 bg-neutral-100 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                  <Button
                    variant={showStats ? "primary" : "secondary"}
                    onClick={() => setShowStats(true)}
                    className="flex-1 h-9 text-[10px] border-none shadow-none !rounded-xl"
                  >
                    Show
                  </Button>
                  <Button
                    variant={!showStats ? "primary" : "secondary"}
                    onClick={() => setShowStats(false)}
                    className="flex-1 h-9 text-[10px] border-none shadow-none !rounded-xl"
                  >
                    Hide
                  </Button>
                </div>
              </div>
            </div>
          </Section>

          <div className="flex items-center justify-between pt-6 border-t border-neutral-200 dark:border-neutral-800">
            <div className="flex flex-col">
              <span className="text-[10px] tracking-widest font-bold opacity-30">Appearance</span>
              <span className="text-[11px] opacity-60">Switch between light and dark</span>
            </div>
            <Button
              variant="secondary"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="h-10 px-6 rounded-full text-[10px] tracking-[0.2em] font-bold border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
            >
              {theme}
            </Button>
          </div>
        </div>
      </div>
    </DialogModal>
  );
};

export default SettingsDialog;
