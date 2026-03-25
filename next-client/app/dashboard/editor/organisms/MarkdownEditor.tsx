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
 * Custom Syntax Highlight
 */
const highlightMarkdownMonochrome = (
  code: string,
  searchTerm?: string,
  setMatchCount?: (count: number) => void,
) => {
  let escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 1. Search Highlight
  if (searchTerm && searchTerm.trim().length > 0) {
    try {
      const regex = new RegExp(`(${searchTerm})`, "gi");
      const matches = escaped.match(regex);
      if (setMatchCount) setMatchCount(matches ? matches.length : 0);
      escaped = escaped.replace(
        regex,
        `<mark class="bg-orange-300/50 dark:bg-orange-500/40 text-inherit rounded-sm">$1</mark>`,
      );
    } catch (e) {
      if (setMatchCount) setMatchCount(0);
    }
  } else if (setMatchCount) {
    setMatchCount(0);
  }

  // 2. Multi-line Code Blocks
  escaped = escaped.replace(
    /(```[a-z]*\n?)([\s\S]*?)(```)/g,
    `<span class="opacity-20 font-mono">$1</span><span class="text-neutral-900 dark:text-neutral-100 bg-neutral-100/30 dark:bg-neutral-800/30 rounded-sm font-mono">$2</span><span class="opacity-20 font-mono">$3</span>`,
  );

  // 3. Tables
  escaped = escaped.replace(/^(\s*\|.*\|[\s]*)$/gm, (match) => {
    const formatted = match.replace(
      /([|:-])/g,
      '<span class="opacity-20 text-sky-500">$1</span>',
    );
    return `<span class="font-mono text-neutral-900 dark:text-neutral-100">${formatted}</span>`;
  });

  // 4. Blockquotes & Nested Blockquotes
  escaped = escaped.replace(
    /^(\s*(?:&gt;\s*)+)(.*)$/gm,
    (match, markers, content) => {
      const fadedMarkers = markers.replace(
        /&gt;/g,
        '<span class="opacity-30 text-sky-500">&gt;</span>',
      );
      return `<span class="font-mono">${fadedMarkers}</span><span class="italic text-neutral-700 dark:text-neutral-300">${content}</span>`;
    },
  );

  // 5. Horizontal Rules (---) & Page Breaks (+++)
  escaped = escaped.replace(
    /^(\s*([-+*])\2{2,}\s*)$/gm,
    `<span class="opacity-20 text-sky-500 dark:text-sky-400 font-mono">$1</span>`,
  );

  // 6. Lists & Task Lists ([ ] or [x])
  escaped = escaped.replace(
    /^(\s*([\d+\.\-\*]+|\[[ xX]\])\s+)(.*)$/gm,
    `<span class="opacity-30 font-mono">$1</span><span class="text-neutral-900 dark:text-neutral-100">$3</span>`,
  );

  // 7. Headings (Stable scaling: weight-based to prevent cursor de-sync)
  escaped = escaped.replace(/^(#{1,6})(\s.+)$/gm, (match, hashes, content) => {
    const level = hashes.length;
    const styles = {
      1: "font-black text-neutral-900 dark:text-neutral-100 underline decoration-neutral-300/50",
      2: "font-bold text-neutral-900 dark:text-neutral-100",
      3: "font-bold text-neutral-700 dark:text-neutral-300",
      4: "font-semibold text-neutral-600 dark:text-neutral-400",
      5: "font-medium text-neutral-500 dark:text-neutral-500",
      6: "font-medium text-neutral-400 dark:text-neutral-600",
    };
    return `<span class="opacity-20 font-mono">${hashes}</span><span class="${styles[level] || styles[6]}">${content}</span>`;
  });

  // 8. Strikethrough, Bold & Inline Code
  // Strikethrough (~~)
  escaped = escaped.replace(
    /(~~)(.*?)\1/g,
    `<span class="opacity-20 font-mono">$1</span><span class="line-through text-neutral-500 dark:text-neutral-400">$2</span><span class="opacity-20 font-mono">$1</span>`,
  );

  // Bold (** or __)
  escaped = escaped.replace(
    /(\*\*|__)(.*?)\1/g,
    `<span class="opacity-20">$1</span><span class="font-bold text-neutral-900 dark:text-neutral-100">$2</span><span class="opacity-20">$1</span>`,
  );

  // Inline Code (`)
  escaped = escaped.replace(
    /(`)([^`\n]+)(`)/g,
    `<span class="opacity-20 font-mono">$1</span><span class="bg-neutral-100/50 dark:bg-neutral-800/50 text-neutral-900 dark:text-neutral-100 rounded font-mono">$2</span><span class="opacity-20 font-mono">$3</span>`,
  );

  // 9. Links & URLs
  escaped = escaped.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    `<span class="text-sky-600 dark:text-sky-400 font-medium cursor-pointer">[$1]</span><span class="cursor-pointer text-sky-600 dark:text-sky-400 underline opacity-60 font-mono">($2)</span>`,
  );

  escaped = escaped.replace(
    /(^|[^\(])(https?:\/\/[^\s<]+)/g,
    `$1<span class="text-sky-600 dark:text-sky-400 underline cursor-pointer font-mono">$2</span>`,
  );

  return escaped;
};

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  fontFamily,
  fontSize,
  searchTerm,
  onTextareaReady,
  setMatchCount,
  matchCount,
  currentIndex,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const highlight = useCallback(
    (code: string) =>
      highlightMarkdownMonochrome(code, searchTerm, setMatchCount),
    [searchTerm, setMatchCount],
  );

  // Force capture of the textarea element
  useEffect(() => {
    const findTextarea = () => {
      const textarea = wrapperRef.current?.querySelector("textarea");
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
        const right = rightMatch
          ? start + (rightMatch.index || 0)
          : text.length;
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
