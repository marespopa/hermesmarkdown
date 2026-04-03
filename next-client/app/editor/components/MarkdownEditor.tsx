"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import Editor from "react-simple-code-editor";
import getCaretCoordinates from "textarea-caret";
import { useAtom } from "jotai";
import {
  atom_fontSize,
  atom_fontFamily,
  atom_wordWrap,
} from "@/app/atoms/atoms";

import {
  SUBTLE,
  WORKFLOW_TAGS,
  TAG_COLORS,
  TAG_CYCLE,
  SHORTCODES,
  TEMPLATES,
} from "./constants";

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
  fontFamily: string,
  searchTerm?: string,
) {
  const customFont = fontFamily ? `style="font-family: ${fontFamily};"` : "";
  let isInsideCodeBlock = false;

  const processInline = (text: string) => {
    let html = text;

    // 1. Inline Code
    if (html.includes("`")) {
      html = html.replace(
        /(`)(.*?)(`)/g,
        `<span ${SUBTLE}>$1</span><code class="bg-zinc-100/80 dark:bg-zinc-800/50 rounded">$2</code><span ${SUBTLE}>$3</span>`,
      );
    }

    // 2. Hashtags
    if (html.includes("#")) {
      html = html.replace(
        /(^|\s)(#[\w-]+)(?=\s|$)/gim,
        (match, before, fullTag) => {
          const tagName = fullTag.slice(1).toLowerCase();
          const isWorkflow = WORKFLOW_TAGS.includes(tagName);
          const colorClass = isWorkflow
            ? TAG_COLORS[tagName]
            : "font-bold text-zinc-700 dark:text-zinc-300";
          const indicator = isWorkflow
            ? ' <small class="opacity-30 select-none">↻</small>'
            : "";
          return `${before}<span class="${colorClass} cursor-pointer" ${customFont}>${fullTag}${indicator}</span>`;
        },
      );
    }

    // 3. Links
    if (html.includes("[")) {
      html = html.replace(
        /(\[)([^\]]+)(\]\()([^)]+)(\))/g,
        `<span ${SUBTLE}>$1</span><span class="text-blue-600 dark:text-blue-400 underline underline-offset-4">$2</span><span ${SUBTLE}>$3$4$5</span>`,
      );
    }

    // 4. Bold/Italics
    if (html.includes("*") || html.includes("_")) {
      html = html.replace(
        /(\*\*|__)(.*?)\1/g,
        `<span ${SUBTLE}>$1</span><strong class="font-bold text-zinc-900 dark:text-zinc-50">$2</strong><span ${SUBTLE}>$1</span>`,
      );
      html = html.replace(
        /(\*|_)(.*?)\1/g,
        `<span ${SUBTLE}>$1</span><em class="italic text-zinc-800 dark:text-zinc-200">$2</em><span ${SUBTLE}>$1</span>`,
      );
    }

    return html;
  };

  return code
    .split("\n")
    .map((line) => {
      let html = line
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      // 1. Code Block Toggle
      if (html.startsWith("```") || html.startsWith("~~~")) {
        isInsideCodeBlock = !isInsideCodeBlock;
        const fence = html.slice(0, 3);
        const lang = html.slice(3);
        return `<span ${SUBTLE}>${fence}${lang}</span>`;
      }
      if (isInsideCodeBlock)
        return `<span class="bg-zinc-100/50 dark:bg-zinc-800/40 w-full inline-block">${html}</span>`;

      if (!html.trim()) return html;

      // 2. Horizontal Rule
      if (/^( {0,3}([-*_])(?:\s*\2){2,}\s*)$/.test(html)) {
        return `<span ${SUBTLE}>${html}</span>`;
      }

      // 3. Headings
      if (html.startsWith("#") && /^#{1,6}\s/.test(html)) {
        // Added space check here
        return html.replace(
          /^(#{1,6}\s+)(.*)$/,
          (m, hashes, content) =>
            `<span ${SUBTLE}>${hashes}</span><span class="font-bold text-zinc-900 dark:text-zinc-50">${processInline(content)}</span>`,
        );
      }

      // 4. Blockquotes
      if (html.startsWith("&gt;")) {
        return html.replace(
          /^(&gt;\s?)(.*)$/,
          (m, quote, content) =>
            `<span ${SUBTLE}>${quote}</span><span class="text-zinc-500 dark:text-zinc-400">${processInline(content)}</span>`,
        );
      }

      // 5. Lists
      if (/^\s*[-*+]\s+/.test(html)) {
        return html.replace(
          /^(\s*[-*+]\s+)(\[[ xX]\]\s+)?(.*)$/,
          (m, bull, check, label) => {
            const isChecked = check?.toLowerCase().includes("x");
            const checkHtml = check ? `<span ${SUBTLE}>${check}</span>` : "";
            return `<span ${SUBTLE}>${bull}</span>${checkHtml}<span class="${isChecked ? "line-through opacity-40" : "text-zinc-900 dark:text-zinc-100"}">${processInline(label)}</span>`;
          },
        );
      }

      if (html.includes("|")) {
        html = html.replace(/\|/g, `<span ${SUBTLE}>|</span>`);
      }

      return processInline(html);
    })
    .join("\n");
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = "Type / for templates",
  searchTerm,
  onTextareaReady,
}: MarkdownEditorProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [fontFamily] = useAtom(atom_fontFamily);
  const [fontSize] = useAtom(atom_fontSize);
  const [wordWrap] = useAtom(atom_wordWrap);

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);
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
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey) setIsCtrlPressed(true);
    }
    function handleKeyUp() {
      setIsCtrlPressed(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  function handlePaste(e: React.ClipboardEvent) {
    const pastedText = e.clipboardData.getData("text");
    const urlRegex = /^(https?:\/\/[^\s]+)$/i;

    if (urlRegex.test(pastedText.trim())) {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const url = pastedText.trim();
      const markdownLink = `[link](${url})`;

      // Insert formatted text
      document.execCommand("insertText", false, markdownLink);

      // Calculate selection for the word "link"
      const endPos = textarea.selectionStart;
      const startPos = endPos - markdownLink.length + 1;
      const linkWordEnd = startPos + 4;

      requestAnimationFrame(() => {
        textarea.setSelectionRange(startPos, linkWordEnd);
      });
    }
  }

  function findLinkAtPos(text: string, pos: number) {
    const mdRegex = /\[[^\]]+\]\((https?:\/\/[^\s)]+)\)/g;
    let match;
    while ((match = mdRegex.exec(text)) !== null) {
      if (pos >= match.index && pos <= match.index + match[0].length)
        return match[1];
    }
    return null;
  }

  function insertTemplate(content: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const before = value.substring(0, start - 1);
    const after = value.substring(start);

    let processedContent = content;
    Object.entries(SHORTCODES).forEach(([code, getValue]) => {
      processedContent = processedContent.split(code).join(getValue());
    });

    onChange(before + processedContent + after);
    setMenuOpen(false);

    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = before.length + processedContent.length;
      textarea.setSelectionRange(newPos, newPos);
    });
  }

  function handleValueChange(val: string) {
    const textarea = textareaRef.current;
    if (!textarea) return onChange(val);

    const start = textarea.selectionStart;
    const charBefore = val[start - 2];

    if (val[start - 1] === "/" && (!charBefore || charBefore === "\n")) {
      const caret = getCaretCoordinates(textarea, start);

      // 1. Determine Menu Height (approx 240px for 6 items + padding)
      const menuHeight = 240;
      const spaceBelow =
        textarea.clientHeight - (caret.top - textarea.scrollTop);

      // 2. Decide Position (Up or Down)
      // If space below is less than menu height, shift it up
      const shouldShowUp = spaceBelow < menuHeight && caret.top > menuHeight;

      setMenuPos({
        top: shouldShowUp ? caret.top - menuHeight - 8 : caret.top + 24,
        left: Math.min(caret.left, textarea.clientWidth - 220),
      });

      setMenuOpen(true);
      setSelectedIndex(0);
    } else if (menuOpen) {
      setMenuOpen(false);
    }

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

    const tagRegex = /#(todo|prog|done|urgn)\b/gi;
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

  function handleGlobalKeyDown(e: React.KeyboardEvent) {
    if (!menuOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % TEMPLATES.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(
        (prev) => (prev - 1 + TEMPLATES.length) % TEMPLATES.length,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      insertTemplate(TEMPLATES[selectedIndex].content);
    } else if (e.key === "Escape") {
      setMenuOpen(false);
    }
  }

  return (
    <div
      ref={wrapperRef}
      onKeyDown={handleGlobalKeyDown}
      className="relative w-full min-h-screen p-2 [overflow-anchor:none] [contain:content] overflow-x-auto"
      translate="no"
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
        {menuOpen && (
          <div
            className="absolute z-50 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xl py-1 overflow-hidden"
            style={{
              top: menuPos.top,
              left: menuPos.left,
              fontFamily, // Enforce atom font in menu
            }}
          >
            {TEMPLATES.map((t, i) => (
              <div
                key={t.label}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertTemplate(t.content);
                }}
                className={`px-3 py-2 cursor-pointer text-sm transition-colors ${
                  i === selectedIndex
                    ? "bg-amber-100 dark:bg-neutral-900 text-amber-900 dark:text-zinc-100"
                    : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {t.label}
              </div>
            ))}
          </div>
        )}

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
          onPaste={handlePaste}
          onMouseMove={(e) => {
            if (!e.ctrlKey && !e.metaKey) return setIsOverLink(false);
            setIsOverLink(
              !!findLinkAtPos(
                value,
                (e.target as HTMLTextAreaElement).selectionStart,
              ),
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
