"use client";

import React, { useRef, useEffect, useCallback } from "react";
import Editor from "react-simple-code-editor";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  fontFamily: string;
  fontSize: string;
  searchTerm?: string;
  matchCount?: number;
  currentIndex?: number;
  onTextareaReady?: (element: HTMLTextAreaElement | null) => void;
  setMatchCount?: (count: number) => void;
}

/**
 * Fades syntax markers (tokens) using low opacity.
 */
const highlightMarkdownMonochrome = (
  code: string, 
  searchTerm?: string, 
  setMatchCount?: (count: number) => void
) => {
  let escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  if (searchTerm && searchTerm.trim().length > 0) {
    try {
      const regex = new RegExp(`(${searchTerm})`, "gi");
      const matches = escaped.match(regex);
      if (setMatchCount) setMatchCount(matches ? matches.length : 0);
      escaped = escaped.replace(regex, `<mark class="bg-orange-300/50 dark:bg-orange-500/40 text-inherit rounded-sm px-0.5">$1</mark>`);
    } catch (e) {
      if (setMatchCount) setMatchCount(0);
    }
  } else if (setMatchCount) {
    setMatchCount(0);
  }

  // Links styling
  escaped = escaped.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, 
    `<span class="text-neutral-900 dark:text-neutral-100 font-medium">[$1]</span><span class="text-blue-500 opacity-70 underline">($2)</span>`);

  escaped = escaped.replace(/(^|[^\(])(https?:\/\/[^\s<]+)/g, 
    `$1<span class="text-blue-500 underline">$2</span>`);

  // Markdown styling
  escaped = escaped.replace(/^(#{1,6})(\s.+)$/gm, 
    `<span class="opacity-25">$1</span><span class="font-bold text-neutral-900 dark:text-neutral-100">$2</span>`);
  
  escaped = escaped.replace(/(\*\*|__)(.*?)\1/g, 
    `<span class="opacity-25">$1</span><span class="font-bold text-neutral-900 dark:text-neutral-100">$2</span><span class="opacity-25">$1</span>`);

  return escaped;
};

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ 
  value, onChange, fontFamily, fontSize, searchTerm, onTextareaReady, setMatchCount, matchCount, currentIndex 
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const highlight = useCallback((code: string) => (
    highlightMarkdownMonochrome(code, searchTerm, setMatchCount)
  ), [searchTerm, setMatchCount]);

  // Force capture of the textarea element
  useEffect(() => {
    const findTextarea = () => {
      const textarea = wrapperRef.current?.querySelector('textarea');
      if (textarea) {
        textareaRef.current = textarea as HTMLTextAreaElement;
        if (onTextareaReady) onTextareaReady(textareaRef.current);
      }
    };
    
    findTextarea();
    // Re-check after a brief timeout to ensure library has injected DOM
    const timer = setTimeout(findTextarea, 50);
    return () => clearTimeout(timer);
  }, [onTextareaReady]);

  const handleInteraction = (e: React.MouseEvent) => {
    if (!textareaRef.current) return;

    if (e.ctrlKey || e.metaKey) {
      const textarea = textareaRef.current;
      setTimeout(() => {
        const start = textarea.selectionStart;
        const text = textarea.value;
        const left = text.lastIndexOf(" ", start - 1) + 1;
        const rightMatch = text.slice(start).match(/[\s)\]]/);
        const right = rightMatch ? start + (rightMatch.index || 0) : text.length;
        const segment = text.slice(left, right).trim();
        const urlMatch = segment.match(/https?:\/\/[^\s)\]]+/);
        if (urlMatch) window.open(urlMatch[0], "_blank", "noopener,noreferrer");
      }, 0);
    } else {
      // Force focus immediately
      textareaRef.current.focus();
    }
  };

  return (
    <div 
      ref={wrapperRef}
      onMouseDownCapture={handleInteraction} // Use Capture Phase
      className="relative w-full min-h-screen cursor-text bg-transparent py-4 px-2" 
    >
      <div 
        className={`
          editor-container w-full h-full
          [&_*]:!border-none [&_*]:!outline-none [&_*]:!ring-0
          [&_textarea]:!p-0 [&_pre]:!p-0
          [&_textarea]:!leading-relaxed [&_pre]:!leading-relaxed
          [&_textarea]:!min-h-[100vh] [&_pre]:!min-h-[100vh]
          [&_textarea]:!text-transparent 
          [&_textarea]:!caret-neutral-900 dark:[&_textarea]:!caret-white
          [&_textarea]:!z-10 [&_pre]:!z-0
          [&_textarea]::selection:bg-blue-500/30
        `}
        style={{ fontFamily, fontSize }}
      >
        <Editor
          value={value}
          onValueChange={onChange}
          highlight={highlight}
          textareaId="markdown-editor"
          className="w-full h-full"
        />
      </div>
    </div>
  );
};

export default MarkdownEditor;
