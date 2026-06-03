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

  if (!showStats && !isZenModeActive) return null;

  return (
    <footer className={`h-8 border-t border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-3xl flex items-center justify-between px-6 shrink-0 pointer-events-auto z-40 select-none transition-all duration-700 ease-in-out ${isEditorFocused && !isZenModeActive ? "max-md:h-0 max-md:opacity-0 max-md:pointer-events-none max-md:border-none" : "h-8 opacity-100"}`}>
      {/* Left Side: Cursor & Interactive Metrics */}
      <div className={`flex items-center gap-3 sm:gap-6 text-[9px] font-bold tracking-[0.2em] text-zinc-400 dark:text-zinc-500 uppercase transition-opacity duration-500 ${!showStats ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        <div className="hidden sm:flex items-center gap-4 pr-6 border-r border-zinc-200/50 dark:border-zinc-800/50 h-3">
          <span className="flex items-center gap-1.5">
            <span className="opacity-40">LN</span>
            <span className="text-zinc-900 dark:text-zinc-100">{cursorPosition.line}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="opacity-40">COL</span>
            <span className="text-zinc-900 dark:text-zinc-100">{cursorPosition.col}</span>
          </span>
        </div>

        <button 
          onClick={cycleMetricMode}
          className="flex items-center gap-2 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors group"
          title="Click to cycle metrics"
        >
          {metricMode === "words" && (
            <span className="flex items-center gap-1.5">
              <span className="text-zinc-900 dark:text-zinc-100">{wordCount}</span>
              <span className="opacity-40 group-hover:opacity-100 hidden sm:inline">WORDS</span>
            </span>
          )}
          {metricMode === "chars" && (
            <span className="flex items-center gap-1.5">
              <span className="text-zinc-900 dark:text-zinc-100">{charCount}</span>
              <span className="opacity-40 group-hover:opacity-100 hidden sm:inline">CHARS</span>
            </span>
          )}
          {metricMode === "readingTime" && (
            <span className="flex items-center gap-1.5">
              <span className="text-zinc-900 dark:text-zinc-100">{readingTime}</span>
              <span className="opacity-40 group-hover:opacity-100 hidden sm:inline">MIN READ</span>
            </span>
          )}
        </button>
      </div>
      
      {/* Right Side: Vault Status, Save Status & Toggles */}
      <div className="flex items-center gap-3 sm:gap-6 text-[9px] font-bold tracking-[0.2em] text-zinc-400 dark:text-zinc-500 uppercase">
        <div className={`flex items-center gap-3 sm:gap-6 pr-6 border-r border-zinc-200/50 dark:border-zinc-800/50 h-3 transition-opacity duration-500 ${!showStats ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
          {vaultHandle ? (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500" title="Vault Connected">
              <HiOutlineDatabase size={11} />
              <span className="hidden sm:inline">VAULT</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 opacity-40" title="Local Mode (No Vault)">
              <HiOutlineLightningBolt size={11} />
              <span className="hidden sm:inline">LOCAL</span>
            </span>
          )}

          <div className="truncate max-w-[80px] sm:max-w-[150px] flex items-center gap-2">
            {saveStatus.state === "saving" ? (
              <span className="text-blue-500 animate-pulse">SAVING...</span>
            ) : saveStatus.state === "saved" ? (
              <span className="text-emerald-500">SAVED</span>
            ) : (
              <span className="opacity-40 truncate">
                {(fileName || "draft").toLowerCase().endsWith(".md") 
                  ? fileName || "draft" 
                  : `${fileName || "draft"}.md`}
              </span>
            )}
          </div>
        </div>

        <button 
          onClick={() => setIsZenModeActive(!isZenModeActive)}
          className={`flex items-center gap-2 transition-colors ${
            isZenModeActive 
              ? "text-blue-500" 
              : "hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
          title="Toggle Zen Mode (Ctrl+Shift+Z)"
        >
          {isZenModeActive ? <HiOutlineEye size={16} /> : <HiOutlineEyeOff size={16} />}
          <span className="hidden sm:inline">ZEN</span>
        </button>
      </div>
    </footer>
  );
}
