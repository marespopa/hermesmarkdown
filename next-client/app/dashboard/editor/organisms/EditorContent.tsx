import React, { useMemo } from "react";
import MarkdownEditor from "./MarkdownEditor";

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
  // Calculate word count and token estimate
  const stats = useMemo(() => {
    const words = contentEdited.split(/\s+/).filter(Boolean).length;
    const tokens = Math.ceil(words * 1.35);
    return { words, tokens };
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
        <div className="flex-shrink-0 px-4 py-2 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/50 rounded-b-2xl">
          <span>{stats.words} words • ~{stats.tokens} tokens</span>
          <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            Local only
          </span>
        </div>
      </div>
    </div>
  );
}
