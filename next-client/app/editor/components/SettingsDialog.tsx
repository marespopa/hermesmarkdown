"use client";

import React from "react";
import { useAtom } from "jotai";
import {
  atom_wordWrap,
  atom_fontSize,
  atom_fontFamily,
  atom_theme,
  atom_showStats,
  atom_isZenModeActive,
  atom_isWizardOpen,
  atom_isAutoSaveEnabled,
} from "@/app/atoms/atoms";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import Button from "@/app/components/Button";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const Toggle = ({ active, onChange }: { active: boolean; onChange: (v: boolean) => void }) => (
  <button
    type="button"
    role="switch"
    aria-checked={active}
    onClick={() => onChange(!active)}
    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all focus:outline-none ${
      active ? 'bg-blue-500' : 'bg-neutral-300 dark:bg-neutral-700'
    }`}
  >
    <span
      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
        active ? 'translate-x-[18px]' : 'translate-x-[2px]'
      }`}
    />
  </button>
);

const SettingItem = ({ label, description, control }: { label: string; description?: string; control: React.ReactNode }) => (
  <div className="flex items-center justify-between py-3 border-b border-neutral-100 dark:border-neutral-800/30 last:border-0">
    <div className="flex flex-col pr-4">
      <span className="text-[13px] font-medium leading-none">{label}</span>
      {description && <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1.5 leading-tight">{description}</span>}
    </div>
    <div className="flex-shrink-0">
      {control}
    </div>
  </div>
);

const SettingGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-6 last:mb-0">
    <h3 className="text-[10px] tracking-[0.2em] font-bold text-neutral-400 dark:text-neutral-500 uppercase mb-2.5 px-1">
      {title}
    </h3>
    <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-[20px] px-4 py-1 border border-neutral-200/50 dark:border-neutral-800/50">
      {children}
    </div>
  </div>
);

const SettingsDialog = ({ isOpen, onClose }: Props) => {
  const [fontSize, setFontSize] = useAtom(atom_fontSize);
  const [fontFamily, setFontFamily] = useAtom(atom_fontFamily);
  const [theme, setTheme] = useAtom(atom_theme);
  const [wordWrap, setWordWrap] = useAtom(atom_wordWrap);
  const [showStats, setShowStats] = useAtom(atom_showStats);
  const [isZenModeActive, setIsZenModeActive] = useAtom(atom_isZenModeActive);
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useAtom(atom_isAutoSaveEnabled);
  const [, setIsWizardOpen] = useAtom(atom_isWizardOpen);
  
  const monoFonts = [
    { name: "System", value: "ui-monospace, SFMono-Regular, Consolas, monospace" },
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
    <DialogModal isOpened={isOpen} onClose={onClose} styles="!max-w-md !max-h-[90vh]">
      <div className="flex flex-col h-full max-h-[80vh]">
        <div className="space-y-1 mb-6 px-1">
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">Environment Configuration</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2 pb-2">
          <SettingGroup title="Typography">
            <SettingItem 
              label="Typeface" 
              description="Monospace font for the editor."
              control={
                <select 
                  value={fontFamily} 
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="bg-neutral-200/50 dark:bg-neutral-800 text-[11px] font-bold rounded-xl px-2.5 py-1.5 outline-none border border-transparent focus:border-blue-500/50 cursor-pointer appearance-none text-center min-w-[100px]"
                >
                  {monoFonts.map(f => <option key={f.name} value={f.value}>{f.name}</option>)}
                </select>
              } 
            />
            <SettingItem 
              label="Text Size" 
              control={
                <div className="flex bg-neutral-200/50 dark:bg-neutral-800 p-0.5 rounded-xl">
                  {sizes.map(s => (
                    <button
                      key={s.label}
                      onClick={() => setFontSize(s.value)}
                      className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                        fontSize === s.value ? "bg-white dark:bg-neutral-700 shadow-sm text-blue-600 dark:text-blue-400" : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              } 
            />
          </SettingGroup>

          <SettingGroup title="Editor">
            <SettingItem 
              label="Auto-Save" 
              description="Automatically persist changes to files."
              control={<Toggle active={isAutoSaveEnabled} onChange={setIsAutoSaveEnabled} />} 
            />
            <SettingItem 
              label="Word Wrap" 
              description="Wrap long lines to fit viewport."
              control={<Toggle active={wordWrap} onChange={setWordWrap} />} 
            />
            <SettingItem 
              label="Zen Mode" 
              description="Focus on the active line."
              control={<Toggle active={isZenModeActive} onChange={setIsZenModeActive} />} 
            />
          </SettingGroup>

          <SettingGroup title="Interface">
            <SettingItem 
              label="Dark Theme" 
              description="Use dark application colors."
              control={<Toggle active={theme === "dark"} onChange={(active) => setTheme(active ? "dark" : "light")} />} 
            />
            <SettingItem 
              label="Status Bar" 
              description="Show word and character counts."
              control={<Toggle active={showStats} onChange={setShowStats} />} 
            />
          </SettingGroup>

          <SettingGroup title="Guide">
            <SettingItem 
              label="Welcome Tour" 
              description="Replay the introduction wizard."
              control={
                <Button
                  variant="secondary"
                  onClick={() => { setIsWizardOpen(true); onClose(); }}
                  className="h-8 px-4 text-[10px] font-bold uppercase tracking-widest border-neutral-200 dark:border-neutral-800"
                >
                  Start
                </Button>
              } 
            />
          </SettingGroup>
        </div>
      </div>
    </DialogModal>
  );
};

export default SettingsDialog;
