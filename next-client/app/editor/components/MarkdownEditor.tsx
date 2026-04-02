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

const SUBTLE =
  'class="text-neutral-500/30 dark:text-neutral-400/20 select-none"';
const WORKFLOW_TAGS = ["todo", "prog", "done", "urgn", "wait"];
const TAG_COLORS = {
  todo: "text-blue-600 dark:text-blue-400",
  prog: "text-amber-600 dark:text-amber-400",
  done: "text-green-600 dark:text-green-400",
  urgn: "text-red-600 dark:text-red-400",
  wait: "text-purple-600 dark:text-purple-400",
};
const TAG_CYCLE = {
  urgn: "todo",
  todo: "prog",
  prog: "wait",
  wait: "done",
  done: "todo",
};
const SHORTCODES = {
  "..d": () => new Date().toLocaleDateString("en-CA"),
  "{date}": () => new Date().toLocaleDateString("en-CA"),
  "{time}": () =>
    new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
};

function highlightMarkdownMonochrome(
  code: string,
  fontFamily: string,
  searchTerm?: string,
) {
  const customFont = fontFamily ? `style="font-family: ${fontFamily};"` : "";

  let html = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  if (searchTerm?.trim() && searchTerm.length > 1) {
    const safeSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    html = html.replace(
      new RegExp(`(${safeSearch})`, "gi"),
      '<mark class="bg-blue-500/20 dark:bg-blue-400/30 text-inherit rounded-sm">$1</mark>',
    );
  }

  html = html.replace(
    /(```|[~`]{1,3})([\s\S]*?)\1/g,
    `<span ${SUBTLE}>$1</span><span class="bg-zinc-100/50 dark:bg-zinc-800/40">$2</span><span ${SUBTLE}>$1</span>`,
  );

  html = html.replace(
    /^(#{1,6}\s+)(.*)$/gm,
    `<span ${SUBTLE}>$1</span><span class="font-bold text-zinc-900 dark:text-zinc-50">$2</span>`,
  );
  html = html.replace(
    /^(&gt;\s?)(.*)$/gm,
    `<span ${SUBTLE}>$1</span><span class="text-zinc-500 dark:text-zinc-400">$2</span>`,
  );

  html = html.replace(
    /(\[)([^\]]+)(\]\()([^)]+)(\))/g,
    `<span ${SUBTLE}>$1</span><span class="text-blue-600 dark:text-blue-400 underline underline-offset-4">$2</span><span ${SUBTLE}>$3$4$5</span>`,
  );

  const tagRegex = new RegExp(
    `(?:^|\\s)#(${WORKFLOW_TAGS.join("|")})(?=\\s|$)`,
    "gim",
  );
  html = html.replace(tagRegex, (match, tagName) => {
    const colorClass = TAG_COLORS[tagName.toLowerCase()] || "text-zinc-500";
    return `<span class="${colorClass} font-semibold cursor-pointer" ${customFont}>${match} <small class="opacity-30 select-none">↻</small></span>`;
  });

  html = html.replace(
    /^(\s*[-*+]\s+)(\[[ xX]\]\s+)?(.*)$/gm,
    (m, bull, check, label) => {
      const isChecked = check?.toLowerCase().includes("x");
      const checkHtml = check ? `<span ${SUBTLE}>${check}</span>` : "";
      return `<span ${SUBTLE}>${bull}</span>${checkHtml}<span class="${isChecked ? "line-through opacity-40" : "text-zinc-900 dark:text-zinc-100"}">${label}</span>`;
    },
  );

  html = html.replace(
    /(\*\*|__)(.*?)\1/g,
    `<span ${SUBTLE}>$1</span><strong class="font-bold text-zinc-900 dark:text-zinc-50">$2</strong><span ${SUBTLE}>$1</span>`,
  );
  html = html.replace(
    /(\*|_)(.*?)\1/g,
    `<span ${SUBTLE}>$1</span><em class="italic text-zinc-800 dark:text-zinc-200">$2</em><span ${SUBTLE}>$1</span>`,
  );

  html = html.replace(/\|/g, `<span ${SUBTLE}>|</span>`);
  html = html.replace(
    /^( {0,3}([*+-])(?:\s*\2){2,}\s*)$/gm,
    `<span ${SUBTLE}>$1</span>`,
  );

  return html;
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = "Begin writing...",
  searchTerm,
  onTextareaReady,
}: MarkdownEditorProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [fontFamily] = useAtom(atom_fontFamily);
  const [fontSize] = useAtom(atom_fontSize);
  const [wordWrap] = useAtom(atom_wordWrap);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [isOverLink, setIsOverLink] = useState(false);

  const highlight = useCallback(
    (code: string) => highlightMarkdownMonochrome(code, fontFamily, searchTerm),
    [searchTerm, fontFamily],
  );

  useEffect(() => {
    const textarea = wrapperRef.current?.querySelector("textarea");
    if (textarea) {
      textareaRef.current = textarea as HTMLTextAreaElement;
      if (onTextareaReady) onTextareaReady(textareaRef.current);
    }
  }, [onTextareaReady]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) =>
      (e.ctrlKey || e.metaKey) && setIsCtrlPressed(true);
    const handleKeyUp = () => setIsCtrlPressed(false);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  function findLinkAtPos(text: string, pos: number) {
    const mdRegex = /\[[^\]]+\]\((https?:\/\/[^\s)]+)\)/g;
    let match;
    while ((match = mdRegex.exec(text)) !== null) {
      if (pos >= match.index && pos <= match.index + match[0].length)
        return match[1];
    }
    return null;
  }

  function handleValueChange(val: string) {
    const textarea = textareaRef.current;
    if (!textarea) return onChange(val);

    const start = textarea.selectionStart;
    let processedVal = val;
    let cursorOffset = 0;

    if (val.includes(".") || val.includes("{")) {
      Object.entries(SHORTCODES).forEach(([code, getValue]) => {
        if (processedVal.includes(code)) {
          const replacement = getValue();
          processedVal = processedVal.split(code).join(replacement);
          cursorOffset += replacement.length - code.length;
        }
      });
    }

    if (val.length > value.length) {
      const lastChar = val[start - 1];
      if (lastChar === "\n" || lastChar === " ") {
        const lines = processedVal.split("\n");
        let needsShift = false;
        const tagPattern = new RegExp(
          `^(.*#(${WORKFLOW_TAGS.join("|")}))(\\s*\\S.*)$`,
          "i",
        );

        const cleanedLines = lines.map((line) => {
          const match = line.match(tagPattern);
          if (match) {
            needsShift = true;
            return `${match[1]}\n${match[3].trim()}`;
          }
          return line;
        });

        if (needsShift) {
          processedVal = cleanedLines.join("\n");
          cursorOffset += 1;
        }
      }
    }

    onChange(processedVal);

    if (cursorOffset !== 0) {
      requestAnimationFrame(() => {
        textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
      });
    }
  }

  function handleEditorClick(e: React.MouseEvent<HTMLTextAreaElement>) {
    const textarea = e.currentTarget;
    const pos = textarea.selectionStart;

    if (e.ctrlKey || e.metaKey) {
      const url = findLinkAtPos(value, pos);
      if (url) {
        e.preventDefault();
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
    }

    const textBefore = value.substring(0, pos);
    const lineStartIndex = textBefore.lastIndexOf("\n") + 1;
    const lineEndIndex =
      value.indexOf("\n", pos) === -1 ? value.length : value.indexOf("\n", pos);
    const currentLine = value.substring(lineStartIndex, lineEndIndex);

    const tagRegex = /#(todo|prog|done|urgn|wait)\b/gi;
    let tagMatch;
    while ((tagMatch = tagRegex.exec(currentLine)) !== null) {
      const tagStart = lineStartIndex + tagMatch.index;
      const tagEnd = tagStart + tagMatch[0].length;
      if (pos >= tagStart && pos <= tagEnd) {
        e.preventDefault();
        const nextTag = `#${TAG_CYCLE[tagMatch[1].toLowerCase()]}`;
        textarea.setSelectionRange(tagStart, tagEnd);
        document.execCommand("insertText", false, nextTag);
        return;
      }
    }

    const checkboxMatch = currentLine.match(/^(\s*[-\*]\s*\[)([ xX])(\])/);
    if (checkboxMatch) {
      const boxStart = lineStartIndex + checkboxMatch[0].indexOf("[");
      const boxEnd = lineStartIndex + checkboxMatch[0].indexOf("]") + 1;
      if (pos >= boxStart && pos <= boxEnd) {
        e.preventDefault();
        const charIdx = lineStartIndex + checkboxMatch[1].length;
        const nextChar = value[charIdx].toLowerCase() === "x" ? " " : "x";
        textarea.setSelectionRange(charIdx, charIdx + 1);
        document.execCommand("insertText", false, nextChar);
      }
    }
  }

  return (
    <div
      ref={wrapperRef}
      className="relative w-full min-h-screen p-2 [overflow-anchor:none] [contain:content] overflow-x-auto"
    >
      <div
        className={`editor-container relative h-full antialiased
          ${wordWrap ? "w-full" : "w-max min-w-full"}
          [&_textarea]:!bg-transparent [&_textarea]:!text-transparent [&_textarea]:!caret-blue-500
          [&_textarea]:!z-10 [&_pre]:!z-0 [&_pre]:!pointer-events-none
          [&_textarea]:!outline-none [&_textarea]:!p-0 [&_pre]:!p-0
          [&_textarea]:!leading-[1.7] [&_pre]:!leading-[1.7]
          ${wordWrap ? "[&_textarea]:!white-space-pre-wrap [&_pre]:!white-space-pre-wrap" : "[&_textarea]:!white-space-pre [&_pre]:!white-space-pre"}
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
          padding={0}
          onClick={handleEditorClick}
          onMouseMove={(e) => {
            if (!e.ctrlKey && !e.metaKey) return setIsOverLink(false);
            setIsOverLink(
              !!findLinkAtPos(value, e.currentTarget.selectionStart),
            );
          }}
          textareaClassName={
            isCtrlPressed && isOverLink ? "!cursor-pointer" : "!cursor-text"
          }
        />
      </div>
    </div>
  );
}
