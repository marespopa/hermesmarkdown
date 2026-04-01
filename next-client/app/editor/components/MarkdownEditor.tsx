"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import Editor from "react-simple-code-editor";
import { useAtom } from "jotai";
import {
  atom_fontSize,
  atom_fontFamily,
  atom_wordWrap,
} from "@/app/atoms/atoms";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchTerm?: string;
  onTextareaReady?: (element: HTMLTextAreaElement | null) => void;
  setMatchCount?: (count: number) => void;
}

function highlightMarkdownMonochrome(
  code: string,
  searchTerm?: string,
  wordWrap?: boolean,
) {
  // Constant for all markdown helpers (symbols, ticks, hashes, etc.)
  const SUBTLE_STYLE =
    'class="text-neutral-500/50 dark:text-neutral-400/30 transition-opacity hover:opacity-100"';
  const wrapStyle = wordWrap ? "pre-wrap" : "pre";

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

  // 1. Fenced Code Blocks - Fixed to prevent extra row in wrap mode
  escaped = escaped.replace(
    /(```)([a-z ]*)([\n\r])?([\s\S]*?)(```)/g,
    (_, tickOpen, lang, newline, content, tickClose) => {
      return (
        `<span class="bg-zinc-100/50 dark:bg-zinc-800/40" style="display: inline; white-space: ${wrapStyle}; -webkit-box-decoration-break: clone; box-decoration-break: clone;">` +
        `<span ${SUBTLE_STYLE}>${tickOpen}${lang}${newline || ""}</span>` +
        `<span class="text-zinc-900 dark:text-zinc-100">${content}</span>` +
        `<span ${SUBTLE_STYLE}>${tickClose}</span>` +
        `</span>`
      );
    },
  );

  // 2. Headings
  escaped = escaped.replace(
    /^(#{1,6})(\s[^\n\r]*)$/gm,
    `<span ${SUBTLE_STYLE}>$1</span><span class="font-semibold text-zinc-900 dark:text-zinc-50">$2</span>`,
  );
  // 2.5 Predefined Workflow Tags
  const workflowTags = [
    "done",
    "todo",
    "in-progress",
    "urgent",
    "canceled",
    "waiting",
  ];
  const tagRegex = new RegExp(`^#(${workflowTags.join("|")})$`, "gim");

  escaped = escaped.replace(tagRegex, (match, tagName) => {
    // Map colors to specific tags for better UX
    const colors: Record<string, string> = {
      done: "text-green-600 dark:text-green-400",
      todo: "text-blue-600 dark:text-blue-400",
      "in-progress": "text-amber-600 dark:text-amber-400",
      urgent: "text-red-600 dark:text-red-400",
    };

    const colorClass = colors[tagName.toLowerCase()] || "text-zinc-500";

    // Using border-bottom instead of padding to avoid cursor offset issues
    return `<span class="${colorClass} font-mono font-bold">${match}</span>`;
  });

  // Horizontal Rule
  escaped = escaped.replace(
    /^(\s*[*\-+](?:\s*[*\-+]){2,}\s*)$/gm,
    `<span class="text-transparent bg-gradient-to-r from-zinc-200 via-zinc-200 to-zinc-200 dark:from-zinc-800 dark:via-zinc-800 dark:to-zinc-800 bg-[length:100%_1px] bg-center bg-no-repeat">$1</span>`,
  );

  // Blockquotes
  escaped = escaped.replace(
    /^((?:&gt;\s*)+)([^\n\r]*)$/gm,
    `<span class="bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400"><span ${SUBTLE_STYLE}>$1</span>$2</span>`,
  );

  // Links
  escaped = escaped.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    `<span class="text-blue-600 dark:text-blue-400 underline-offset-4">[$1]</span><span ${SUBTLE_STYLE}>($2)</span>`,
  );

  escaped = escaped.replace(
    /(?<!\()https?:\/\/[^\s<]+(?![^<]*>|[^<>]*<\/a>)/g,
    `<span class="text-blue-600 dark:text-blue-400 underline-offset-4">$&</span>`,
  );

  // Bold & Italics
  escaped = escaped.replace(
    /(\*\*|__)(.*?)\1/g,
    `<span ${SUBTLE_STYLE}>$1</span><strong class="font-semibold text-zinc-900 dark:text-zinc-50">$2</strong><span ${SUBTLE_STYLE}>$1</span>`,
  );

  escaped = escaped.replace(
    /(\*|_)(.*?)\1/g,
    `<span ${SUBTLE_STYLE}>$1</span><em class="italic text-zinc-800 dark:text-zinc-200">$2</em><span ${SUBTLE_STYLE}>$1</span>`,
  );

  // Strikethrough
  escaped = escaped.replace(
    /~~(.*?)~~/g,
    `<span ${SUBTLE_STYLE}>~~</span><del class="line-through text-zinc-500/70">$1</del><span ${SUBTLE_STYLE}>~~</span>`,
  );

  // Lists & Checkboxes
  escaped = escaped.replace(
    /^(\s*(?:[\d+\.\-\*]+|[*+\-]))(\s*\[([ xX])\]\s+)?([^\n\r]*)$/gm,
    (match, bullet, checkGroup, checkChar, label, offset) => {
      const isTask = checkGroup !== undefined;
      const isChecked = isTask && checkChar.toLowerCase() === "x";

      const bulletPart = `<span ${SUBTLE_STYLE}>${bullet}</span>`;

      if (isTask) {
        const checkboxPart = `<span ${SUBTLE_STYLE} font-mono font-bold">${checkGroup}</span>`;

        const labelStyle = isChecked ? 'class="line-through"' : "";

        // WRAP THE WHOLE LINE in the task-wrapper
        return (
          `<span class="task-wrapper cursor-pointer" data-offset="${offset}">` +
          `${bulletPart}${checkboxPart}` +
          `<span ${labelStyle}>${label}</span>` +
          `</span>`
        );
      }

      return `${bulletPart}<span class="text-zinc-900 dark:text-zinc-100">${label}</span>`;
    },
  );

  // Tables
  escaped = escaped.replace(/\|/g, `<span ${SUBTLE_STYLE}>|</span>`);

  return escaped;
}

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
  const [wordWrap] = useAtom(atom_wordWrap);

  const [isTyping, setIsTyping] = useState(false);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [isOverLink, setIsOverLink] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const highlight = useCallback(
    (code: string) => highlightMarkdownMonochrome(code, searchTerm, wordWrap),
    [searchTerm, wordWrap],
  );

  useEffect(() => {
    const textarea = wrapperRef.current?.querySelector("textarea");
    if (textarea) {
      textareaRef.current = textarea as HTMLTextAreaElement;
      if (onTextareaReady) onTextareaReady(textareaRef.current);
    }
  }, [onTextareaReady]);

  // Sync horizontal scrolling when wordWrap is disabled
  useEffect(() => {
    const textarea = textareaRef.current;
    const pre = wrapperRef.current?.querySelector("pre");
    if (!textarea || !pre || wordWrap) return;

    const syncScroll = () => {
      pre.scrollLeft = textarea.scrollLeft;
    };

    textarea.addEventListener("scroll", syncScroll);
    return () => textarea.removeEventListener("scroll", syncScroll);
  }, [wordWrap, value]);

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

  const handleValueChange = (val: string) => {
    onChange(val);
    setIsTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 1500);
  };

  const handleEditorClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const pos = textarea.selectionStart;

    // 1. Handle Link Navigation (Ctrl/Meta + Click)
    if (e.ctrlKey || e.metaKey) {
      const url = findLinkAtPos(value, pos);
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
    }

    const textBefore = value.substring(0, pos);
    const lineStartIndex = textBefore.lastIndexOf("\n") + 1;
    const nextNewline = value.indexOf("\n", pos);
    const lineEndIndex = nextNewline === -1 ? value.length : nextNewline;
    const currentLine = value.substring(lineStartIndex, lineEndIndex);

    const checkboxMatch = currentLine.match(/^(\s*[-\*]\s*\[)([ xX])(\])/);

    if (checkboxMatch) {
      const checkboxEndIndex = lineStartIndex + checkboxMatch[0].length;

      // LOGIC GATE:
      // Trigger toggle IF:
      // A) The click was specifically on the "[ ]" part (the brackets)
      // B) The click was on the text BUT the Cmd/Ctrl key is held down
      const isClickOnCheckbox = pos <= checkboxEndIndex;
      const isIntentionalToggle = e.ctrlKey || e.metaKey;

      if (isClickOnCheckbox || isIntentionalToggle) {
        e.preventDefault();

        const checkCharIndex = lineStartIndex + checkboxMatch[1].length;
        const isChecked = value[checkCharIndex].toLowerCase() === "x";
        const nextChar = isChecked ? " " : "x";

        const newValue =
          value.substring(0, checkCharIndex) +
          nextChar +
          value.substring(checkCharIndex + 1);

        onChange(newValue);

        requestAnimationFrame(() => {
          textarea.setSelectionRange(pos, pos);
          textarea.focus();
        });
      }
    }
  };

  const wrapClasses = wordWrap
    ? "[&_textarea]:!white-space-pre-wrap [&_pre]:!white-space-pre-wrap [&_textarea]:!break-words [&_pre]:!break-words [&_textarea]:!overflow-wrap-anywhere [&_pre]:!overflow-wrap-anywhere [&_textarea]:!overflow-x-hidden"
    : "[&_textarea]:!white-space-pre [&_pre]:!white-space-pre [&_textarea]:!overflow-x-auto [&_pre]:!overflow-x-hidden [&_textarea]:!w-max [&_pre]:!w-max [&_textarea]:!min-w-full [&_pre]:!min-w-full";

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full min-h-screen transition-all duration-700 ${isTyping ? "opacity-70" : "opacity-100"} p-2 ${!wordWrap ? "overflow-x-auto" : "overflow-x-hidden"}`}
    >
      <div
        className={`
          editor-container relative h-full selection:bg-blue-500/15
          ${!wordWrap ? "w-max min-w-full" : "w-full"}
          [&_textarea]:!outline-none [&_textarea]:!border-none
          [&_textarea]:!bg-transparent [&_textarea]:!p-0
          [&_textarea]:!leading-[1.7] [&_pre]:!leading-[1.7]
          ${wrapClasses}
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
          onMouseMove={(e: React.MouseEvent<HTMLTextAreaElement>) => {
            if (!e.ctrlKey && !e.metaKey) {
              if (isOverLink) setIsOverLink(false);
              return;
            }
            const pos = e.currentTarget.selectionStart;
            const url = findLinkAtPos(value, pos);
            setIsOverLink(!!url);
          }}
          onClick={handleEditorClick}
        />
      </div>
    </div>
  );
};

export default MarkdownEditor;
