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

const highlightMarkdownMonochrome = (code: string, searchTerm?: string) => {
  let escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  if (searchTerm?.trim()) {
    try {
      const safeSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${safeSearch})`, "gi");
      escaped = escaped.replace(
        regex,
        `<mark class="bg-blue-500/20 dark:bg-blue-400/30 text-inherit rounded-sm">$1</mark>`,
      );
    } catch (e) {}
  }

  const sym =
    'class="opacity-25 dark:opacity-20 transition-opacity hover:opacity-100"';

  // 1. Fenced Code Blocks
  escaped = escaped.replace(
    /(```[a-z]*[\n\r]?)([\s\S]*?)(```)/g,
    (_, open, content, close) =>
      `<span class="bg-zinc-50/50 dark:bg-zinc-800/30 rounded-md"><span ${sym}>${open}</span><span class="text-zinc-800 dark:text-zinc-200">${content}</span><span ${sym}>${close}</span></span>`,
  );

  // 2. Headings (Run before blockquotes, avoid capturing newlines)
  escaped = escaped.replace(
    /^(#{1,6})(\s[^\n\r]*)$/gm,
    `<span ${sym}>$1</span><span class="font-semibold text-zinc-900 dark:text-zinc-50">$2</span>`,
  );

  // 3. Horizontal Rule (Prevent breakages between blocks)
  escaped = escaped.replace(
    /^(\s*---+\s*)$/gm,
    `<span class="opacity-30 text-zinc-400">$1</span>`,
  );

  // 4. Blockquotes (Ensure [^\n\r]* to avoid height drift)
  escaped = escaped.replace(
    /^((?:&gt;\s*)+)([^\n\r]*)$/gm,
    `<span class="bg-zinc-100/40 dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400"><span ${sym}>$1</span>$2</span>`,
  );

  // 5. Lists
  escaped = escaped.replace(
    /^(\s*([\d+\.\-\*]+|\[[ xX]\])\s+)([^\n\r]*)$/gm,
    `<span ${sym}>$1</span><span class="text-zinc-900 dark:text-zinc-100">$3</span>`,
  );

  // 6. Links
  escaped = escaped.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    `<span class="text-blue-600 dark:text-blue-400 underline-offset-4">[$1]</span><span ${sym}>($2)</span>`,
  );

  escaped = escaped.replace(
    /(?<!\()https?:\/\/[^\s<]+(?![^<]*>|[^<>]*<\/a>)/g,
    `<span class="text-blue-600 dark:text-blue-400 underline-offset-4">$&</span>`,
  );

  // 7. Bold & Italics
  escaped = escaped.replace(
    /(\*\*|__)(.*?)\1/g,
    `<span ${sym}>$1</span><strong class="font-semibold text-zinc-900 dark:text-zinc-50">$2</strong><span ${sym}>$1</span>`,
  );
  escaped = escaped.replace(
    /(\*|_)(.*?)\1/g,
    `<span ${sym}>$1</span><em class="italic text-zinc-800 dark:text-zinc-200">$2</em><span ${sym}>$1</span>`,
  );

  // 8. Strikethrough
  escaped = escaped.replace(
    /~~(.*?)~~/g,
    `<span ${sym}>~~</span><del class="line-through text-zinc-500/70">$1</del><span ${sym}>~~</span>`,
  );

  return escaped;
};

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = "Begin writing...",
  searchTerm,
  onTextareaReady,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [fontFamily] = useAtom(atom_fontFamily);
  const [fontSize] = useAtom(atom_fontSize);
  const [isTyping, setIsTyping] = useState(false);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [isOverLink, setIsOverLink] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const highlight = useCallback(
    (code: string) => highlightMarkdownMonochrome(code, searchTerm),
    [searchTerm],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) =>
      (e.ctrlKey || e.metaKey) && setIsCtrlPressed(true);
    const handleKeyUp = (e: KeyboardEvent) => setIsCtrlPressed(false);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const textarea = wrapperRef.current?.querySelector("textarea");
    if (textarea) {
      textareaRef.current = textarea as HTMLTextAreaElement;
      if (onTextareaReady) onTextareaReady(textareaRef.current);
    }
  }, [onTextareaReady]);

  const findLinkAtPos = (text: string, pos: number) => {
    const mdRegex = /\[[^\]]+\]\((https?:\/\/[^\s)]+)\)/g;
    let match;
    while ((match = mdRegex.exec(text)) !== null) {
      if (pos >= match.index && pos <= match.index + match[0].length)
        return match[1];
    }
    const rawRegex = /https?:\/\/[^\s)]+/g;
    while ((match = rawRegex.exec(text)) !== null) {
      if (pos >= match.index && pos <= match.index + match[0].length)
        return match[0];
    }
    return null;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (!e.ctrlKey && !e.metaKey) {
      if (isOverLink) setIsOverLink(false);
      return;
    }
    // selectionStart is a good proxy for character index under mouse in this editor
    const pos = e.currentTarget.selectionStart;
    const url = findLinkAtPos(value, pos);
    setIsOverLink(!!url);
  };

  const handleTextareaClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      const pos = e.currentTarget.selectionStart;
      const url = findLinkAtPos(value, pos);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleValueChange = (val: string) => {
    onChange(val);
    setIsTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 1500);
  };

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full min-h-screen transition-all duration-700 ${isTyping ? "opacity-80" : "opacity-100"} p-2`}
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
          ${isCtrlPressed && isOverLink ? "[&_textarea]:!cursor-pointer" : "[&_textarea]:!cursor-text"}
          antialiased
        `}
        style={{ fontFamily, fontSize }}
      >
        {!value && (
          <div className="absolute top-0 left-0 opacity-20 pointer-events-none italic">
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
          onMouseMove={handleMouseMove}
          onClick={handleTextareaClick}
        />
      </div>
    </div>
  );
};

export default MarkdownEditor;
