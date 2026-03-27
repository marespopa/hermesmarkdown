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
  let pageCounter = 1;

  // 1. Search Highlight
  if (searchTerm?.trim()) {
    try {
      const safeSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${safeSearch})`, "gi");
      escaped = escaped.replace(
        regex,
        `<mark class="bg-orange-300/60 dark:bg-orange-500/40 text-inherit">$1</mark>`,
      );
    } catch (e) {}
  }

  // 2. Multi-line Code Blocks
  escaped = escaped.replace(
    /(```[a-z]*\n?)([\s\S]*?)(```)/g,
    `<span class="opacity-30 text-stone-500">$1</span><span class="font-mono text-stone-900 dark:text-stone-100">$2</span><span class="opacity-30 font-mono text-stone-500">$3</span>`,
  );

  // 3. Tables & Blockquotes
  escaped = escaped.replace(/^(\s*\|.*\|[\s]*)$/gm, (m) => {
    const formatted = m.replace(
      /([|:-])/g,
      '<span class="opacity-30 text-sky-600 dark:text-sky-400">$1</span>',
    );
    return `<span class="text-stone-900 dark:text-stone-100">${formatted}</span>`;
  });

  escaped = escaped.replace(
    /^(\s*(?:&gt;\s*)+)(.*)$/gm,
    (m, markers, content) => {
      const faded = markers.replace(
        /&gt;/g,
        '<span class="opacity-30 text-orange-700 dark:text-orange-400">&gt;</span>',
      );
      return `<span>${faded}</span><span class="text-stone-700 dark:text-stone-300 italic">${content}</span>`;
    },
  );

  // 4. Horizontal Rules (---)
  escaped = escaped.replace(
    /^(\s*([-*])\2{2,}\s*)$/gm,
    '<span class="opacity-30 text-stone-600 dark:text-stone-400">$1</span>',
  );

  // 5. Page Breaks (+++)
  escaped = escaped.replace(/^(\s*\+{3,}\s*)$/gm, (m) => {
    return (
      `<span class="opacity-30 text-stone-600 dark:text-stone-400">${m}</span>` +
      `<span class="opacity-40 text-stone-600 dark:text-stone-400 select-none pointer-events-none">&nbsp;&nbsp;Page ${pageCounter++}</span>`
    );
  });

  // 6. Lists
  escaped = escaped.replace(
    /^(\s*([\d+\.\-\*]+|\[[ xX]\])\s+)(.*)$/gm,
    `<span class="opacity-30 text-stone-600 dark:text-stone-400">$1</span><span class="text-stone-900 dark:text-stone-100">$3</span>`,
  );

  // 7. Headings
  escaped = escaped.replace(
    /^(#{1,6})(\s.+)$/gm,
    `<span class="opacity-30 text-stone-600 dark:text-stone-400">$1</span><span class="font-bold text-stone-900 dark:text-stone-100">$2</span>`,
  );

  // 8. Inline Styles
  escaped = escaped.replace(
    /(~~)(.*?)\1/g,
    `<span class="opacity-30 text-stone-500">$1</span><span class="line-through text-stone-500">$2</span><span class="opacity-30 text-stone-500">$1</span>`,
  );
  escaped = escaped.replace(
    /(\*\*|__)(.*?)\1/g,
    `<span class="opacity-30 text-stone-500">$1</span><span class="font-bold text-stone-900 dark:text-stone-100">$2</span><span class="opacity-30 text-stone-500">$1</span>`,
  );
  escaped = escaped.replace(
    /(`)([^`\n]+)(`)/g,
    `<span class="opacity-30 text-stone-500">$1</span><span class="text-stone-900 dark:text-stone-100">$2</span><span class="opacity-30 text-stone-500">$3</span>`,
  );

  // 9. Links
  escaped = escaped.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    `<span class="text-sky-700 dark:text-sky-400">[$1]</span><span class="opacity-30 text-stone-500">($2)</span>`,
  );
  escaped = escaped.replace(
    /(^|[^\(])(https?:\/\/[^\s<]+)/g,
    `$1<span class="text-sky-700 dark:text-sky-400 underline">$2</span>`,
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
