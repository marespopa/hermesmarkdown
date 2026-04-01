"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
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

  // Search Highlighting
  if (searchTerm?.trim()) {
    try {
      const safeSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${safeSearch})`, "gi");
      escaped = escaped.replace(
        regex,
        `<mark class="bg-blue-500/20 dark:bg-blue-400/30 text-inherit rounded-sm transition-all shadow-[0_0_0_1px_rgba(59,130,246,0.1)]">$1</mark>`,
      );
    } catch (e) {}
  }

  // Syntax style: Faint and elegant (iA Writer style)
  const sym =
    'class="opacity-25 dark:opacity-20 font-normal transition-opacity hover:opacity-100"';

  // Fenced Code Blocks
  escaped = escaped.replace(
    /(```[a-z]*[\n\r]?)([\s\S]*?)(```)/g,
    (_, open, content, close) =>
      `<span class="block bg-zinc-50/50 dark:bg-zinc-800/30 rounded-md my-2"><span ${sym}>${open}</span><span class="text-zinc-800 dark:text-zinc-200">${content}</span><span ${sym}>${close}</span></span>`,
  );

  // Lists & Checkboxes
  escaped = escaped.replace(
    /^(\s*([\d+\.\-\*]+|\[[ xX]\])\s+)(.*)$/gm,
    `<span ${sym}>$1</span><span class="text-zinc-900 dark:text-zinc-100">$3</span>`,
  );

  // Headings (Subtle size progression via font-weight rather than massive scaling)
  escaped = escaped.replace(
    /^(#{1,6})(\s.+)$/gm,
    `<span ${sym}>$1</span><span class="font-semibold text-zinc-900 dark:text-zinc-50">$2</span>`,
  );

  // Bold & Italics
  escaped = escaped.replace(
    /(\*\*|__)(.*?)\1/g,
    `<span ${sym}>$1</span><strong class="font-semibold text-zinc-900 dark:text-zinc-50">$2</strong><span ${sym}>$1</span>`,
  );
  escaped = escaped.replace(
    /(\*|_)(.*?)\1/g,
    `<span ${sym}>$1</span><em class="italic text-zinc-800 dark:text-zinc-200">$2</em><span ${sym}>$1</span>`,
  );

  // Links (Clean Apple-blue accents)
  escaped = escaped.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    `<span class="text-blue-600 dark:text-blue-400 underline decoration-blue-500/30 underline-offset-4 cursor-pointer">[$1]</span><span ${sym}>($2)</span>`,
  );

  return escaped;
};

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = "Begin writing...",
  searchTerm,
  onTextareaReady,
  setMatchCount,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [fontFamily] = useAtom(atom_fontFamily);
  const [fontSize] = useAtom(atom_fontSize);

  // Microinteraction state: "Focus Mode" feel
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const highlight = useCallback(
    (code: string) =>
      highlightMarkdownMonochrome(code, searchTerm, setMatchCount),
    [searchTerm, setMatchCount],
  );

  useEffect(() => {
    const textarea = wrapperRef.current?.querySelector("textarea");
    if (textarea) {
      textareaRef.current = textarea as HTMLTextAreaElement;
      if (onTextareaReady) onTextareaReady(textareaRef.current);
    }
  }, [onTextareaReady]);

  const handleValueChange = (val: string) => {
    onChange(val);

    // Microinteraction: Fade UI elements while typing (Focus Mode)
    setIsTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 1500);
  };

  return (
    <div
      ref={wrapperRef}
      className={`
        relative w-full min-h-screen transition-all duration-700 ease-in-out
        ${isTyping ? "opacity-80 scale-[1.002]" : "opacity-100 scale-100"}
        p-2
      `}
    >
      <div
        className={`
          editor-container w-full h-full relative selection:bg-blue-500/15
          [&_textarea]:!outline-none [&_textarea]:!border-none
          [&_textarea]:!bg-transparent [&_textarea]:!p-0
          [&_textarea]:!leading-[1.7] [&_pre]:!leading-[1.7]
          [&_textarea]:!min-h-[80vh] [&_pre]:!min-h-[80vh]
          [&_textarea]:!text-transparent
          [&_textarea]:!caret-blue-500 dark:[&_textarea]:!caret-blue-400
          [&_textarea]:!z-10 [&_pre]:!z-0
          
          /* Typography smoothing for Apple/iA feel */
          antialiased font-feature-settings-['ss01','ss02','cv01']
        `}
        style={{ fontFamily, fontSize }}
      >
        {!value && (
          <div className="absolute top-0 left-0 opacity-20 pointer-events-none italic select-none">
            {placeholder}
          </div>
        )}
        <Editor
          value={value}
          onValueChange={handleValueChange}
          highlight={highlight}
          textareaId="markdown-editor"
          className="w-full h-full"
          padding={0}
        />
      </div>
    </div>
  );
};

export default MarkdownEditor;
