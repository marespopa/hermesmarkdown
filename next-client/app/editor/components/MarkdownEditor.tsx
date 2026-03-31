"use client";

import React, { useRef, useEffect, useCallback } from "react";
import Editor from "react-simple-code-editor";
import { useAtom } from "jotai";
import { atom_fontSize, atom_fontFamily } from "@/app/atoms/atoms";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchTerm?: string;
  onTextareaReady?: (element: HTMLTextAreaElement | null) => void;
  setMatchCount?: (count: number) => void;
}

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

  // Multi-line Code Blocks
  escaped = escaped.replace(
    /(```[a-z]*\n?)([\s\S]*?)(```)/g,
    `<span class="opacity-30 text-stone-500">$1</span><span class="text-stone-900 dark:text-stone-100">$2</span><span class="opacity-30 text-stone-500">$3</span>`,
  );

  // Tables & Blockquotes
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

  // Rules, Lists, Headings
  escaped = escaped.replace(
    /^(\s*([-*])\2{2,}\s*)$/gm,
    '<span class="opacity-30 text-stone-600 dark:text-stone-400">$1</span>',
  );
  escaped = escaped.replace(
    /^(\s*([\d+\.\-\*]+|\[[ xX]\])\s+)(.*)$/gm,
    `<span class="opacity-30 text-stone-600 dark:text-stone-400">$1</span><span class="text-stone-900 dark:text-stone-100">$3</span>`,
  );
  escaped = escaped.replace(
    /^(#{1,6})(\s.+)$/gm,
    `<span class="opacity-30 text-stone-600 dark:text-stone-400">$1</span><span class="font-bold text-stone-900 dark:text-stone-100">$2</span>`,
  );

  // Inline Styles
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

  // Links
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
  placeholder = "Start writing...",
  searchTerm,
  onTextareaReady,
  setMatchCount,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [fontFamily] = useAtom(atom_fontFamily);
  const [fontSize] = useAtom(atom_fontSize);

  const highlight = useCallback(
    (code: string) =>
      highlightMarkdownMonochrome(code, searchTerm, setMatchCount),
    [searchTerm, setMatchCount],
  );

  useEffect(() => {
    const findTextarea = () => {
      const textarea = wrapperRef.current?.querySelector("textarea");
      if (textarea) {
        textareaRef.current = textarea as HTMLTextAreaElement;
        if (onTextareaReady) onTextareaReady(textareaRef.current);
      }
    };
    findTextarea();
    const timer = setTimeout(findTextarea, 50);
    return () => clearTimeout(timer);
  }, [onTextareaReady]);

  const handleInteraction = (e: React.MouseEvent) => {
    if (!textareaRef.current) return;
    if (e.ctrlKey || e.metaKey) {
      setTimeout(() => {
        const pos = textareaRef.current!.selectionStart;
        const text = textareaRef.current!.value;
        const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
        let match;
        while ((match = linkRegex.exec(text)) !== null) {
          if (pos >= match.index && pos <= match.index + match[0].length) {
            window.open(match[2], "_blank", "noopener,noreferrer");
            break;
          }
        }
      }, 0);
    } else {
      textareaRef.current.focus();
    }
  };

  return (
    <div
      ref={wrapperRef}
      onMouseDownCapture={handleInteraction}
      className="relative w-full min-h-screen cursor-text bg-transparent py-4 px-2"
    >
      <div
        className={`
          editor-container w-full h-full relative
          [&_*]:!border-none [&_*]:!outline-none [&_*]:!ring-0
          [&_textarea]:!p-0 [&_pre]:!p-0
          [&_textarea]:!leading-relaxed [&_pre]:!leading-relaxed
          [&_textarea]:!min-h-[100vh] [&_pre]:!min-h-[100vh]
          [&_textarea]:!text-transparent 
          [&_textarea]:!caret-blue-600 dark:[&_textarea]:!caret-blue-400
          [&_textarea]:!z-10 [&_pre]:!z-0
          [&_textarea]::selection:bg-blue-500/20
          
          /* Placeholder CSS */
          ${!value ? `before:content-['${placeholder}'] before:absolute before:left-0 before:top-0 before:opacity-20 before:pointer-events-none` : ""}
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
