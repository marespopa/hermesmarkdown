"use client";

import React from "react";
import { useAtom } from "jotai";
import {
  atom_wordWrap,
  atom_fontSize,
  atom_theme,
  atom_showStats,
  atom_isZenModeActive,
  atom_isWizardOpen,
  atom_autosaveMode,
  atom_autosaveDelay,
  atom_editorWidth,
} from "@/app/atoms/atoms";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import Button from "@/app/components/Button";
import Toggle from "@/app/components/Toggle";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const SettingItem = ({ label, description, control }: { label: string; description?: string; control: React.ReactNode }) => (
  <div className="flex items-center justify-between py-3 border-b border-neutral-100 dark:border-neutral-800/30 last:border-0">
    <div className="flex flex-col pr-4">
      <span className="text-ui-footnote font-medium leading-none">{label}</span>
      {description && <span className="text-ui-footnote text-neutral-500 dark:text-neutral-400 mt-1.5 leading-tight">{description}</span>}
    </div>
    <div className="flex-shrink-0">
      {control}
    </div>
  </div>
);

const SettingGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-6 last:mb-0">
    <h3 className="text-ui-footnote font-medium text-neutral-500 dark:text-neutral-400 mb-2.5 px-1">
      {title}
    </h3>
    <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-[20px] px-4 py-1 border border-neutral-200/50 dark:border-neutral-800/50">
      {children}
    </div>
  </div>
);

const SettingsDialog = ({ isOpen, onClose }: Props) => {
  const [fontSize, setFontSize] = useAtom(atom_fontSize);
  const [theme, setTheme] = useAtom(atom_theme);
  const [wordWrap, setWordWrap] = useAtom(atom_wordWrap);
  const [showStats, setShowStats] = useAtom(atom_showStats);
  const [isZenModeActive, setIsZenModeActive] = useAtom(atom_isZenModeActive);
  const [autosaveMode, setAutosaveMode] = useAtom(atom_autosaveMode);
  const [autosaveDelay, setAutosaveDelay] = useAtom(atom_autosaveDelay);
  const [editorWidth, setEditorWidth] = useAtom(atom_editorWidth);
  const [, setIsWizardOpen] = useAtom(atom_isWizardOpen);
  
  const sizes = [
    { label: "Compact", value: "14px" },
    { label: "Standard", value: "16px" },
    { label: "Large", value: "18px" },
    { label: "XL", value: "22px" },
  ];

  const widthOptions = [
    { label: "Standard", value: "standard" },
    { label: "Narrow", value: "narrow" },
  ];

  return (
    <DialogModal isOpened={isOpen} onClose={onClose} styles="!max-w-md !max-h-[85vh] !rounded-[32px] !backdrop-blur-2xl !bg-white/80 dark:!bg-zinc-900/80 !border-none !shadow-2xl">
      <div className="flex flex-col min-h-0">
        <div className="space-y-1 mb-6 px-1">
          <h2 className="text-ui-title-2 font-bold tracking-tight">Settings</h2>
          <p className="text-ui-footnote text-neutral-500 dark:text-neutral-400 font-medium">Environment Configuration</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2 pb-1">
          <SettingGroup title="Typography">
            <SettingItem 
              label="Text Size" 
              control={
                <div className="flex bg-zinc-200/50 dark:bg-zinc-800 p-1 rounded-xl">
                  {sizes.map(s => (
                    <button
                      key={s.label}
                      onClick={() => setFontSize(s.value)}
                      className={`px-3 py-1.5 text-ui-footnote font-semibold rounded-lg transition-all ${
                        fontSize === s.value ? "bg-white dark:bg-zinc-700 shadow-sm text-blue-600 dark:text-blue-400" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
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
              label="Autosave Mode" 
              description="When to persist changes."
              control={
                <select 
                  value={autosaveMode} 
                  onChange={(e) => setAutosaveMode(e.target.value as any)}
                  className="bg-zinc-200/50 dark:bg-zinc-800 text-ui-caption font-semibold rounded-xl px-3 py-1.5 outline-none border border-transparent focus:border-blue-500/50 cursor-pointer appearance-none text-center min-w-[130px] transition-all"
                >
                  <option value="afterDelay">After Delay</option>
                  <option value="onFocusChange">On Focus Change</option>
                  <option value="manual">Manual Only</option>
                </select>
              } 
            />
            {autosaveMode === "afterDelay" && (
              <SettingItem 
                label="Autosave Delay" 
                description="Wait time after typing."
                control={
                  <select 
                    value={autosaveDelay} 
                    onChange={(e) => setAutosaveDelay(Number(e.target.value))}
                    className="bg-zinc-200/50 dark:bg-zinc-800 text-ui-caption font-semibold rounded-xl px-3 py-1.5 outline-none border border-transparent focus:border-blue-500/50 cursor-pointer appearance-none text-center min-w-[130px] transition-all"
                  >
                    <option value={500}>0.5s</option>
                    <option value={1000}>1s</option>
                    <option value={2000}>2s</option>
                    <option value={3000}>3s</option>
                    <option value={5000}>5s</option>
                    <option value={10000}>10s</option>
                  </select>
                } 
              />
            )}
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
            <SettingItem 
              label="Editor Width" 
              description="Maximum horizontal text span."
              control={
                <div className="flex bg-zinc-200/50 dark:bg-zinc-800 p-1 rounded-xl">
                  {widthOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setEditorWidth(opt.value as any)}
                      className={`px-3 py-1.5 text-ui-footnote font-semibold rounded-lg transition-all ${
                        editorWidth === opt.value ? "bg-white dark:bg-zinc-700 shadow-sm text-blue-600 dark:text-blue-400" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              } 
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
                  className="h-9 px-5 text-ui-footnote font-medium border-zinc-200 dark:border-zinc-800"
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
