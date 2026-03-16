"use client";

import { useEffect, useState } from "react";
import { ClarityResult } from "@/app/services/prompt-clarity";
import { useAtom } from "jotai";
import { atom_showStatusBar, atom_showTimer, atom_zenMode } from "@/app/atoms/atoms";
import { StatusBarTimer } from "./StatusBarTimer";

interface Props {
  stats: {
    words: number;
    tokens: number;
    clarity: ClarityResult;
  };
}

/**
 * EditorStatusBar
 * A compact, single-row footer with a clean separation from the editor text.
 * Hovering reveals a suggestion callout rather than actionable buttons.
 */
const EditorStatusBar = ({ stats }: Props) => {
  const { words, tokens, clarity } = stats;
  const [isMounted, setIsMounted] = useState(false);
  const [showStatusBar] = useAtom(atom_showStatusBar);
  const [showTimer] = useAtom(atom_showTimer);
  const [isZenMode] = useAtom(atom_zenMode);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Prevent hydration mismatch
  if (!isMounted || !clarity) return null;

  const isComplete = clarity.score >= 100;
  const hasTips = clarity.tips && clarity.tips.length > 0;
 
  if (!showStatusBar) {
    return null;
  }

  return (
    <footer className="group/bar relative flex-shrink-0 -mx-2 -mb-2 px-4 h-9 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-[11px] font-medium bg-neutral-50 dark:bg-neutral-900/50 rounded-b-2xl transition-colors">
      
      {/* 1. Statistics (Left) - Greyed out to avoid confusion with main text */}
      <div className="flex items-center gap-3 text-neutral-400 dark:text-neutral-500 whitespace-nowrap shrink-0">
        <div className="flex items-center gap-1">
          <span className="font-mono text-neutral-500 dark:text-neutral-400 tabular-nums">
            {words.toLocaleString()}
          </span>
          <span className="text-[9px] uppercase tracking-tighter">words</span>
        </div>
        
        <div className="h-2.5 w-[1px] bg-neutral-200 dark:bg-neutral-800" />
        
        <div className="flex items-center gap-1">
          <span className="font-mono text-neutral-500 dark:text-neutral-400 tabular-nums">
            ~{tokens.toLocaleString()}
          </span>
          <span className="text-[9px] uppercase tracking-tighter">tokens</span>
        </div>
      
        {showTimer && <div className="h-2.5 w-[1px] bg-neutral-200 dark:bg-neutral-800" />}
       
        {showTimer && <StatusBarTimer isZenMode={isZenMode}/>}
      </div>

      {/* 2. Status Label & Next Step */}
      <div className="flex items-center gap-3 ml-4 min-w-0">
        <div className="flex items-center gap-2 text-[10px] whitespace-nowrap">
          <span className={`font-bold uppercase tracking-wider ${isComplete ? 'text-emerald-600' : 'text-amber-600'}`}>
            {clarity.label}
          </span>
          <span className="text-neutral-300 dark:text-neutral-700">/</span>
          <span className="text-neutral-500 dark:text-neutral-400 italic truncate max-w-[150px] sm:max-w-none">
            {clarity.nextStep}
          </span>
        </div>
        
        {/* Status Indicator Dot */}
        <div className="relative flex h-1.5 w-1.5 items-center justify-center shrink-0">
          <div className={`h-full w-full rounded-full transition-colors duration-500 ${
            isComplete ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]' : 'bg-amber-400'
          }`} />
          {!isComplete && (
            <span className="absolute h-full w-full animate-ping rounded-full bg-amber-400/40" />
          )}
        </div>
      </div>

      {/* 3. Hover Callout for Tips */}
      {hasTips && (
        <div className="absolute bottom-full right-4 mb-2 w-64 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl transition-all duration-200 group-hover/bar:opacity-100 group-hover/bar:translate-y-0 opacity-0 translate-y-1 pointer-events-none z-50 dark:border-neutral-700 dark:bg-neutral-800">
          <div className="px-3 py-1.5 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-700">
             <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">Suggestions</span>
          </div>
          <ul className="p-2.5 space-y-2">
            {clarity.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] leading-tight text-neutral-600 dark:text-neutral-300">
                <div className="h-1 w-1 mt-1 shrink-0 rounded-full bg-amber-400" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </footer>
  );
};

export default EditorStatusBar;
