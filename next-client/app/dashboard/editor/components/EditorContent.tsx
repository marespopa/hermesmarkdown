import React from "react";
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
  return (
    <div className={`${zenMode ? 'h-full overflow-y-auto w-full' : 'flex-1 flex flex-col min-h-0 w-full mb-4'}`}>
      <div
        className={`flex-1 min-h-0 w-full px-2 py-2 flex flex-col ${
          zenMode
            ? 'h-full overflow-y-auto rounded-2xl bg-white dark:bg-neutral-900 p-4 pr-0 w-[calc(100%-2rem)]'
            : 'h-full max-h-[calc(100vh-240px)] overflow-auto bg-white dark:bg-neutral-800 rounded-2xl shadow-lg border border-strongblack dark:border-white/20'
        }`}
      >
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
    </div>
  );
}
