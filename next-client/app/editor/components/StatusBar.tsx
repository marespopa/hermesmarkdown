"use client";

import React, { useMemo } from "react";
import { useAtom } from "jotai";
import {
  atom_content,
  atom_fileName,
  atom_saveStatus,
  atom_showStats,
  atom_isZenModeActive,
  atom_cursorPosition,
  atom_statusMetricMode,
  atom_vaultHandle,
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
    <footer className="h-8 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex items-center justify-between px-4 shrink-0 pointer-events-auto z-40 select-none">
      {/* Left Side: Cursor & Interactive Metrics */}
      <div className="flex items-center gap-2 sm:gap-4 text-[9px] font-mono tracking-widest opacity-60">
        <div className="hidden sm:flex items-center gap-2 pr-4 border-r border-neutral-200 dark:border-neutral-800 h-4">
          <span className="flex items-center gap-1">
            <span className="opacity-40">LN</span>
            <span className="text-blue-500 font-bold">{cursorPosition.line}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="opacity-40">COL</span>
            <span className="text-blue-500 font-bold">{cursorPosition.col}</span>
          </span>
        </div>

        <button 
          onClick={cycleMetricMode}
          className="flex items-center gap-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 px-2 py-0.5 rounded transition-colors group"
          title="Click to cycle metrics"
        >
          {metricMode === "words" && (
            <span className="flex items-center gap-1">
              <span className="text-blue-500 font-bold">{wordCount}</span>
              <span className="opacity-40 group-hover:opacity-100 hidden sm:inline">WORDS</span>
            </span>
          )}
          {metricMode === "chars" && (
            <span className="flex items-center gap-1">
              <span className="text-blue-500 font-bold">{charCount}</span>
              <span className="opacity-40 group-hover:opacity-100 hidden sm:inline">CHARS</span>
            </span>
          )}
          {metricMode === "readingTime" && (
            <span className="flex items-center gap-1">
              <HiOutlineClock className="text-blue-500" size={10} />
              <span className="text-blue-500 font-bold">{readingTime}</span>
              <span className="opacity-40 group-hover:opacity-100 hidden sm:inline">MIN READ</span>
            </span>
          )}
        </button>
      </div>
      
      {/* Right Side: Vault Status, Save Status & Toggles */}
      <div className="flex items-center gap-2 sm:gap-4 text-[9px] font-mono tracking-widest opacity-60">
        <div className="flex items-center gap-2 sm:gap-3 pr-2 sm:pr-4 border-r border-neutral-200 dark:border-neutral-800 h-4">
          {vaultHandle ? (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500 font-bold" title="Vault Connected">
              <HiOutlineDatabase size={10} />
              <span className="hidden sm:inline">VAULT</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 opacity-40" title="Local Mode (No Vault)">
              <HiOutlineLightningBolt size={10} />
              <span className="hidden sm:inline">LOCAL</span>
            </span>
          )}

          <div className="truncate max-w-[80px] sm:max-w-[150px] flex items-center gap-2">
            {saveStatus.state === "saving" ? (
              <span className="text-blue-500 animate-pulse font-bold">SAVING...</span>
            ) : saveStatus.state === "saved" ? (
              <span className="text-emerald-500 font-bold">SAVED</span>
            ) : (
              <span className="opacity-40 truncate">{fileName || "draft"}.md</span>
            )}
          </div>
        </div>

        <button 
          onClick={() => setIsZenModeActive(!isZenModeActive)}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-colors ${
            isZenModeActive 
              ? "bg-blue-500/10 text-blue-500 font-bold" 
              : "hover:bg-neutral-200 dark:hover:bg-neutral-800"
          }`}
          title="Toggle Zen Mode (Ctrl+Shift+Z)"
        >
          {isZenModeActive ? <HiOutlineEye size={12} /> : <HiOutlineEyeOff size={12} />}
          <span className={`${isZenModeActive ? "" : "opacity-40"} hidden sm:inline`}>ZEN</span>
        </button>
      </div>
    </footer>
  );
}
