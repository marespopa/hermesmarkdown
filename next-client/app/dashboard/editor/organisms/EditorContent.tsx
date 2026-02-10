import React, { useMemo } from "react";
import MarkdownEditor from "./MarkdownEditor";
import { analyzePromptClarity, getClarityDotColor } from "@/app/services/prompt-clarity";

interface Props { 
  contentEdited: string;
  setContentEdited: (content: string) => void;
  setHasChanges: (hasChanges: boolean) => void;
  fontFamily: string;
  fontSize: string;
  searchTerm?: string;
  matchCount?: number;
  currentIndex?: number;
  zenMode?: boolean;
  onTextareaReady?: (element: HTMLTextAreaElement | null) => void;
}

export default function EditorContent({
  contentEdited,
  setContentEdited,
  setHasChanges,
  fontFamily,
  fontSize,
  searchTerm,
  matchCount,
  currentIndex,
  zenMode = false,
  onTextareaReady,
}: Props) {
  // Calculate word count, token estimate, and prompt clarity
  const stats = useMemo(() => {
    const words = contentEdited.split(/\s+/).filter(Boolean).length;
    const tokens = Math.ceil(words * 1.35);
    const clarity = analyzePromptClarity(contentEdited);
    return { words, tokens, clarity };
  }, [contentEdited]);

  return (
    <div className={`${zenMode ? 'h-full overflow-y-auto w-full' : 'flex-1 flex flex-col min-h-0 w-full mb-4'}`}>
      <div
        className={`flex-1 min-h-0 w-full px-2 py-2 flex flex-col ${
          zenMode
            ? 'h-full overflow-y-auto rounded-2xl bg-white dark:bg-neutral-900 p-4'
            : 'h-full max-h-[calc(100vh-240px)] overflow-hidden bg-white dark:bg-neutral-800 rounded-2xl shadow-lg border border-strongblack dark:border-white/20'
        }`}
      >
        <div className="flex-1 overflow-auto">
          <MarkdownEditor
            value={contentEdited}
            onChange={val => {
              setContentEdited(val);
              setHasChanges(true);
            }}
            fontFamily={fontFamily}
            fontSize={fontSize}
            searchTerm={searchTerm}
            matchCount={matchCount}
            currentIndex={currentIndex}
            onTextareaReady={onTextareaReady}
          />
        </div>
        
        {/* Status Bar */}
        <div className="flex-shrink-0 px-4 py-2 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/50 rounded-b-2xl gap-2 flex-wrap">
          <span>{stats.words} words • ~{stats.tokens} tokens</span>
          <div className="flex items-center gap-3">
            {/* Prompt Clarity Indicator */}
            <span className={`flex items-center gap-1 ${stats.clarity.color}`} title={stats.clarity.tips.length > 0 ? `Tips: ${stats.clarity.tips.join(', ')}` : 'Prompt clarity score'}>
              <span className={`w-1.5 h-1.5 rounded-full ${getClarityDotColor(stats.clarity.label)}`}></span>
              {stats.clarity.label}
              {stats.clarity.tips.length > 0 && (
                <span className="text-neutral-400 dark:text-neutral-500 ml-1 hidden sm:inline">
                  · {stats.clarity.tips[0]}
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
