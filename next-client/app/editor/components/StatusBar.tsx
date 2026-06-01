"use client";

import React, { useMemo } from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  atom_content,
  atom_fileName,
  atom_saveStatus,
  atom_showStats,
  atom_isZenModeActive,
  atom_cursorPosition,
  atom_statusMetricMode,
  atom_vaultHandle,
  atom_isEditorFocused,
} from "@/app/atoms/atoms";
import { 
  HiOutlineLightningBolt, 
  HiOutlineDatabase,
  HiOutlineClock,
  HiOutlineEye,
  HiOutlineEyeOff
} from "react-icons/hi";

export default function StatusBar() {
  const [content] = useAtom(atom_content);
  const [fileName] = useAtom(atom_fileName);
  const [saveStatus] = useAtom(atom_saveStatus);
  const [showStats] = useAtom(atom_showStats);
  const [isZenModeActive, setIsZenModeActive] = useAtom(atom_isZenModeActive);
  const [cursorPosition] = useAtom(atom_cursorPosition);
  const [metricMode, setMetricMode] = useAtom(atom_statusMetricMode);
  const [vaultHandle] = useAtom(atom_vaultHandle);
  const isEditorFocused = useAtomValue(atom_isEditorFocused);

  const wordCount = useMemo(() => {
    return content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;
  }, [content]);

  const charCount = content.length;
  const readingTime = Math.ceil(wordCount / 200);

  const cycleMetricMode = () => {
    const modes: ("words" | "chars" | "readingTime")[] = ["words", "chars", "readingTime"];
    const currentIndex = modes.indexOf(metricMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setMetricMode(modes[nextIndex]);
  };

  if (!showStats) return null;

  return (
    <footer className={`h-7 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between px-4 shrink-0 pointer-events-auto z-40 select-none transition-all duration-500 ease-in-out ${isEditorFocused ? "max-md:h-0 max-md:opacity-0 max-md:pointer-events-none max-md:border-none" : "h-7 opacity-100"}`}>
      {/* Left Side: Cursor & Interactive Metrics */}
      <div className="flex items-center gap-2 sm:gap-4 text-[8px] font-mono tracking-[0.15em] text-zinc-400 dark:text-zinc-600 uppercase">
        <div className="hidden sm:flex items-center gap-3 pr-4 border-r border-zinc-200 dark:border-zinc-800 h-3">
          <span className="flex items-center gap-1">
            <span className="opacity-50">LN</span>
            <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{cursorPosition.line}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="opacity-50">COL</span>
            <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{cursorPosition.col}</span>
          </span>
        </div>

        <button 
          onClick={cycleMetricMode}
          className="flex items-center gap-2 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors group"
          title="Click to cycle metrics"
        >
          {metricMode === "words" && (
            <span className="flex items-center gap-1">
              <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{wordCount}</span>
              <span className="opacity-50 group-hover:opacity-100 hidden sm:inline">WORDS</span>
            </span>
          )}
          {metricMode === "chars" && (
            <span className="flex items-center gap-1">
              <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{charCount}</span>
              <span className="opacity-50 group-hover:opacity-100 hidden sm:inline">CHARS</span>
            </span>
          )}
          {metricMode === "readingTime" && (
            <span className="flex items-center gap-1">
              <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{readingTime}</span>
              <span className="opacity-50 group-hover:opacity-100 hidden sm:inline">MIN READ</span>
            </span>
          )}
        </button>
      </div>
      
      {/* Right Side: Vault Status, Save Status & Toggles */}
      <div className="flex items-center gap-2 sm:gap-4 text-[8px] font-mono tracking-[0.15em] text-zinc-400 dark:text-zinc-600 uppercase">
        <div className="flex items-center gap-2 sm:gap-4 pr-4 border-r border-zinc-200 dark:border-zinc-800 h-3">
          {vaultHandle ? (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-500 font-semibold" title="Vault Connected">
              <HiOutlineDatabase size={10} />
              <span className="hidden sm:inline tracking-widest">VAULT</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 opacity-50" title="Local Mode (No Vault)">
              <HiOutlineLightningBolt size={10} />
              <span className="hidden sm:inline tracking-widest">LOCAL</span>
            </span>
          )}

          <div className="truncate max-w-[80px] sm:max-w-[150px] flex items-center gap-2">
            {saveStatus.state === "saving" ? (
              <span className="text-blue-500 animate-pulse font-semibold">SAVING...</span>
            ) : saveStatus.state === "saved" ? (
              <span className="text-emerald-500 font-semibold">SAVED</span>
            ) : (
              <span className="opacity-50 truncate">{fileName || "draft"}.md</span>
            )}
          </div>
        </div>

        <button 
          onClick={() => setIsZenModeActive(!isZenModeActive)}
          className={`flex items-center gap-1.5 transition-colors ${
            isZenModeActive 
              ? "text-blue-500 font-semibold" 
              : "hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
          title="Toggle Zen Mode (Ctrl+Shift+Z)"
        >
          {isZenModeActive ? <HiOutlineEye size={10} /> : <HiOutlineEyeOff size={10} />}
          <span className="hidden sm:inline">ZEN</span>
        </button>
      </div>
    </footer>
  );
}
