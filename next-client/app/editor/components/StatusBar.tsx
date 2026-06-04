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
  atom_isVaultPending,
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
  const [isVaultPending] = useAtom(atom_isVaultPending);

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
    <footer className={`h-6 ${isZenModeActive ? "border-b" : "max-md:border-b md:border-t"} border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-3xl flex items-center justify-between px-3 shrink-0 pointer-events-auto z-40 select-none transition-all duration-700 ease-in-out`}>
      {/* Left Side: Cursor & Interactive Metrics */}
      <div className={`flex items-center gap-3 sm:gap-4 text-ui-micro text-zinc-500 dark:text-zinc-400 transition-opacity duration-500 ${!showStats ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        <div className="flex items-center gap-3 pr-3 sm:pr-4 border-r border-zinc-200/50 dark:border-zinc-800/50">
          <span className="flex items-center gap-1">
            <span className="opacity-60">Ln</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{cursorPosition.line}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="opacity-60">Col</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{cursorPosition.col}</span>
          </span>
        </div>

        <button
          onClick={cycleMetricMode}
          className="flex items-center gap-2 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors group"
          title="Click to cycle metrics"
        >
          {metricMode === "words" && (
            <span className="flex items-center gap-1.5">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{wordCount}</span>
              <span className="opacity-60 group-hover:opacity-100">words</span>
            </span>
          )}
          {metricMode === "chars" && (
            <span className="flex items-center gap-1.5">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{charCount}</span>
              <span className="opacity-60 group-hover:opacity-100">chars</span>
            </span>
          )}
          {metricMode === "readingTime" && (
            <span className="flex items-center gap-1.5">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{readingTime}</span>
              <span className="opacity-60 group-hover:opacity-100">min read</span>
            </span>
          )}
        </button>
      </div>

      {/* Right Side: Vault Status, Save Status & Toggles */}
      <div className="flex items-center gap-3 sm:gap-4 text-ui-micro text-zinc-500 dark:text-zinc-400">
        <div className={`flex items-center gap-3 sm:gap-4 pr-3 sm:pr-4 border-r border-zinc-200/50 dark:border-zinc-800/50 transition-opacity duration-500 ${!showStats ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
          {isVaultPending ? (
            <span className="flex items-center gap-1.5 text-amber-500" title="Vault Access Paused">
              <HiOutlineDatabase size={12} />
              <span className="hidden sm:inline">paused</span>
            </span>
          ) : vaultHandle ? (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500" title="Vault Connected">
              <HiOutlineDatabase size={12} />
              <span className="hidden sm:inline">vault</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 opacity-60" title="Local Mode (No Vault)">
              <HiOutlineLightningBolt size={12} />
              <span className="hidden sm:inline">local</span>
            </span>
          )}

          <div className="truncate max-w-[80px] sm:max-w-[150px] flex items-center gap-2">
            {saveStatus.state === "saving" ? (
              <span className="text-blue-500 animate-pulse">saving…</span>
            ) : saveStatus.state === "saved" ? (
              <span className="text-emerald-500">saved</span>
            ) : (
              <span className="opacity-60 truncate">
                {(fileName || "draft").toLowerCase().endsWith(".md")
                  ? fileName || "draft"
                  : `${fileName || "draft"}.md`}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => setIsZenModeActive(!isZenModeActive)}
          className={`flex items-center gap-1.5 transition-colors ${
            isZenModeActive
              ? "text-blue-500"
              : "hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
          title="Toggle Zen Mode (Ctrl+Shift+Z)"
        >
          {isZenModeActive ? <HiOutlineEye size={13} /> : <HiOutlineEyeOff size={13} />}
          <span className="hidden sm:inline">zen</span>
        </button>
      </div>
    </footer>
  );
}
