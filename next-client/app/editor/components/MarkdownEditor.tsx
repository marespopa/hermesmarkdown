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
  onTextareaReady?: (element: HTMLTextAreaElement | null) => void;
  setMatchCount?: (count: number) => void;
}

const REGEX_CODE_INLINE = /(`)(.*?)(`)/g;
const REGEX_HASHTAG = /(^|\s)(#[\w-]+)(?=\s|$)/gim;
const REGEX_CURRENCY = /\$(?![{])(\d+(\.\d+)?)/g;
const REGEX_LINK = /(\[)([^\]]+)(\]\()([^)]+)(\))/g;
const REGEX_BOLD = /(\*\*|__)(.*?)\1/g;
const REGEX_ITALIC = /(\*|_)(.*?)\1/g;
const REGEX_STRIKETHROUGH = /(~~)(.*?)(~~)/g;
const REGEX_MD_LINK = /\[[^\]]+\]\((https?:\/\/[^\s)]+)\)/g;
const REGEX_TODO_TAGS = /#(todo|prog|done|urgn)\b/gi;
const REGEX_CHECKBOX = /^(\s*[-*]\s*\[)([ xX])(\])/;
const REGEX_URL_PASTE = /^(https?:\/\/[^\s]+)$/i;
const REGEX_CALC = /calc\(([^)]+)\)=$/;

function processInlineMarkdown(text: string) {
  let html = text;

  if (html.includes("`")) {
    html = html.replace(
      REGEX_CODE_INLINE,
      `<span ${SUBTLE}>$1</span><span class="bg-zinc-100/80 dark:bg-zinc-800/50 rounded-sm">$2</span><span ${SUBTLE}>$3</span>`,
    );
  }

  if (html.includes("#")) {
    html = html.replace(REGEX_HASHTAG, (match, before, fullTag) => {
      const tagName = fullTag.slice(1).toLowerCase();
      const isWorkflow = WORKFLOW_TAGS.includes(tagName);
      const colorClass = isWorkflow
        ? TAG_COLORS[tagName]
        : "text-zinc-700 dark:text-zinc-300";

      return `${before}<span class="${colorClass} font-bold cursor-pointer">${fullTag}</span>`;
    });
  }

  if (html.includes("$")) {
    html = html.replace(
      REGEX_CURRENCY,
      `<span class="text-emerald-600 dark:text-emerald-400">$&</span>`,
    );
  }

  if (html.includes("[")) {
    html = html.replace(
      REGEX_LINK,
      `<span ${SUBTLE}>$1</span><span class="text-blue-600 dark:text-blue-400 underline">$2</span><span ${SUBTLE}>$3$4$5</span>`,
    );
  }

  if (html.includes("*") || html.includes("_")) {
    html = html.replace(
      REGEX_BOLD,
      `<span ${SUBTLE}>$1</span><strong class="font-bold text-zinc-900 dark:text-zinc-50">$2</strong><span ${SUBTLE}>$1</span>`,
    );
    html = html.replace(
      REGEX_ITALIC,
      `<span ${SUBTLE}>$1</span><em class="italic text-zinc-800 dark:text-zinc-200">$2</em><span ${SUBTLE}>$1</span>`,
    );
  }

  if (html.includes("~~")) {
    html = html.replace(
      REGEX_STRIKETHROUGH,
      `<span ${SUBTLE}>$1</span><del class="line-through opacity-40">$2</del><span ${SUBTLE}>$3</span>`,
    );
  }

  return html;
}

function highlightMarkdownVirtual(
  code: string,
  scrollTop: number,
  viewportHeight: number,
  lineHeight: number,
  overscan: number = 20,
) {
  const lines = code.split("\n");
  const totalLines = lines.length;

  const startVisibleIdx = Math.max(
    0,
    Math.floor(scrollTop / lineHeight) - overscan,
  );
  const endVisibleIdx = Math.min(
    totalLines - 1,
    Math.ceil((scrollTop + viewportHeight) / lineHeight) + overscan,
  );

  let isInsideCodeBlock = false;

  // Safe checks using unicode escaping to avoid rendering splits
  for (let i = 0; i < startVisibleIdx; i++) {
    const rawLine = lines[i];
    if (rawLine.startsWith("\u0060\u0060\u0060") || rawLine.startsWith("~~~")) {
      isInsideCodeBlock = !isInsideCodeBlock;
    }
  }

  return lines
    .map((line, index) => {
      if (index < startVisibleIdx || index > endVisibleIdx) {
        if (line.startsWith("\u0060\u0060\u0060") || line.startsWith("~~~")) {
          isInsideCodeBlock = !isInsideCodeBlock;
        }
        return line ? " " : "";
      }

      const html = line
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      if (html.startsWith("\u0060\u0060\u0060") || html.startsWith("~~~")) {
        isInsideCodeBlock = !isInsideCodeBlock;
        const fence = html.slice(0, 3);
        const lang = html.slice(3);
        return `<span ${SUBTLE}>${fence}${lang}</span>`;
      }

      if (isInsideCodeBlock) {
        const content = html === "" ? " " : html;
        return `<span class="bg-zinc-100/50 dark:bg-zinc-800/40">${content}</span>`;
      }

      if (!html.trim()) return html;

      if (/^( {0,3}([-*_])(?:\s*\2){2,}\s*)$/.test(html)) {
        return `<span ${SUBTLE}>${html}</span>`;
      }

      if (html.startsWith("#") && /^#{1,6}\s/.test(html)) {
        return html.replace(
          /^(#{1,6}\s+)(.*)$/,
          (m, hashes, content) =>
            `<span ${SUBTLE}>${hashes}</span><span class="font-bold text-zinc-900 dark:text-zinc-50">${processInlineMarkdown(content)}</span>`,
        );
      }

      if (html.startsWith("&gt;")) {
        return html.replace(
          /^(&gt;\s?)(.*)$/,
          (m, quote, content) =>
            `<span ${SUBTLE}>${quote}</span><span class="text-zinc-500 dark:text-zinc-400">${processInlineMarkdown(content)}</span>`,
        );
      }

      if (/^\s*[-*+]\s+/.test(html)) {
        return html.replace(
          /^(\s*[-*+]\s+)(\[[ xX]\]\s+)?(.*)$/,
          (m, bull, check, label) => {
            const isChecked = check?.toLowerCase().includes("x");
            const checkHtml = check ? `<span ${SUBTLE}>${check}</span>` : "";
            return `<span ${SUBTLE}>${bull}</span>${checkHtml}<span class="${isChecked ? "line-through opacity-40" : "text-zinc-900 dark:text-zinc-100"}">${processInlineMarkdown(label)}</span>`;
          },
        );
      }

      return processInlineMarkdown(html);
    })
    .join("\n");
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = "Type / for templates",
  onTextareaReady,
}: MarkdownEditorProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [fontFamily] = useAtom(atom_fontFamily);
  const [fontSize] = useAtom(atom_fontSize);
  const [wordWrap] = useAtom(atom_wordWrap);

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [isOverLink, setIsOverLink] = useState(false);

  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(800);

  const calculatedLineHeight = fontSize * 1.7;

  const filteredTemplates = TEMPLATES.filter((t) =>
    t.label.toLowerCase().includes(filterQuery.toLowerCase()),
  );

  const highlight = useCallback(
    (code: string) => {
      return highlightMarkdownVirtual(
        code,
        scrollTop,
        viewportHeight,
        calculatedLineHeight,
      );
    },
    [scrollTop, viewportHeight, calculatedLineHeight],
  );

  function findLinkAtPos(text: string, pos: number) {
    let match;
    REGEX_MD_LINK.lastIndex = 0;
    while ((match = REGEX_MD_LINK.exec(text)) !== null) {
      if (pos >= match.index && pos <= match.index + match[0].length) {
        return match[1];
      }
    }
    return null;
  }

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLTextAreaElement>) => {
      if (!e.ctrlKey && !e.metaKey) {
        setIsOverLink(false);
        return;
      }
      const target = e.currentTarget;
      setIsOverLink(!!findLinkAtPos(value, target.selectionStart));
    },
    [value],
  );

  useEffect(() => {
    const textarea = wrapperRef.current?.querySelector("textarea");
    if (textarea) {
      textareaRef.current = textarea as HTMLTextAreaElement;
      if (onTextareaReady) onTextareaReady(textareaRef.current);

      const handleScroll = (e: Event) => {
        setScrollTop((e.target as HTMLTextAreaElement).scrollTop);
      };

      setViewportHeight(textarea.clientHeight || 800);
      textarea.addEventListener("scroll", handleScroll, { passive: true });

      return () => {
        textarea.removeEventListener("scroll", handleScroll);
      };
    }
  }, [onTextareaReady]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) setIsCtrlPressed(true);
    };
    const handleKeyUp = () => setIsCtrlPressed(false);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  function handlePaste(e: React.ClipboardEvent) {
    const pastedText = e.clipboardData.getData("text");

    if (REGEX_URL_PASTE.test(pastedText.trim())) {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const url = pastedText.trim();
      const markdownLink = `[link](${url})`;
      document.execCommand("insertText", false, markdownLink);

      const endPos = textarea.selectionStart;
      const startPos = endPos - markdownLink.length + 1;
      const linkWordEnd = startPos + 4;

      requestAnimationFrame(() => {
        textarea.setSelectionRange(startPos, linkWordEnd);
      });
    }
  }

  function insertTemplate(content: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lengthToRemove = filterQuery.length + 1;
    const before = value.substring(0, start - lengthToRemove);
    const after = value.substring(start);

    let processedContent = content;
    Object.entries(SHORTCODES).forEach(([code, getValue]) => {
      processedContent = processedContent.split(code).join(getValue());
    });

    const fullNewValue = before + processedContent + after;
    const budgetedValue = runAutoBudget(fullNewValue);

    onChange(budgetedValue);

    setMenuOpen(false);
    setFilterQuery("");

    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = before.length + processedContent.length;
      textarea.setSelectionRange(newPos, newPos);
    });
  }

  function runAutoBudget(val: string): string {
    const lines = val.split("\n");
    let currentSum = 0;

    return lines
      .map((line) => {
        if (line.trim().startsWith("Total:")) {
          const newLine = `Total: $${currentSum.toFixed(2)}`;
          currentSum = 0;
          return newLine;
        }

        const currencyMatches = line.match(/-?\$(\d+(\.\d+)?)/g);

        if (currencyMatches) {
          currencyMatches.forEach((m) => {
            const num = parseFloat(m.replace("$", ""));
            if (!isNaN(num)) currentSum += num;
          });
        }
        return line;
      })
      .join("\n");
  }

  function handleValueChange(val: string) {
    const textarea = textareaRef.current;
    if (!textarea) return onChange(val);

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const textUpToCursor = val.substring(0, start);

    const lastNewLine = textUpToCursor.lastIndexOf("\n");
    const currentLineUpToCursor = textUpToCursor.substring(lastNewLine + 1);
    const slashIndex = currentLineUpToCursor.lastIndexOf("/");

    if (
      slashIndex !== -1 &&
      (slashIndex === 0 || currentLineUpToCursor[slashIndex - 1] === " ")
    ) {
      const query = currentLineUpToCursor.substring(slashIndex + 1);
      if (!query.includes(" ")) {
        setFilterQuery(query);
        setSelectedIndex(0);

        if (!menuOpen) {
          const caret = getCaretCoordinates(textarea, start - query.length);
          const menuHeight = 240;
          const spaceBelow =
            textarea.clientHeight - (caret.top - textarea.scrollTop);
          const shouldShowUp =
            spaceBelow < menuHeight && caret.top > menuHeight;
          setMenuPos({
            top: shouldShowUp ? caret.top - menuHeight - 8 : caret.top + 24,
            left: Math.min(caret.left, textarea.clientWidth - 220),
          });
          setMenuOpen(true);
        }
      } else {
        setMenuOpen(false);
      }
    } else {
      setMenuOpen(false);
    }

    const nextVal = runAutoBudget(val);

    const calcMatch = textUpToCursor.match(REGEX_CALC);
    if (calcMatch) {
      const mathExpression = calcMatch[1];
      const fullMatchString = calcMatch[0];
      const sanitized = mathExpression.replace(/[^-()\d/*+.]/g, "");
      const result = new Function(`return (${sanitized})`)();
      const replacement = (Math.round(result * 100) / 100).toString();
      const sliceStart = start - fullMatchString.length;
      textarea.setSelectionRange(sliceStart, start);
      document.execCommand("insertText", false, replacement);
      return;
    }

    for (const [code, getValue] of Object.entries(SHORTCODES)) {
      const sliceStart = Math.max(0, start - code.length);
      const potentialMatch = val.substring(sliceStart, start);
      if (potentialMatch === code) {
        const replacement = getValue();
        textarea.setSelectionRange(sliceStart, start);
        document.execCommand("insertText", false, replacement);
        return;
      }
    }

    onChange(nextVal);

    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.setSelectionRange(start, end);
      }
    });
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

    REGEX_TODO_TAGS.lastIndex = 0;
    let tagMatch;
    while ((tagMatch = REGEX_TODO_TAGS.exec(currentLine)) !== null) {
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

    const checkboxMatch = currentLine.match(REGEX_CHECKBOX);
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
      setSelectedIndex((prev) => (prev + 1) % filteredTemplates.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(
        (prev) =>
          (prev - 1 + filteredTemplates.length) % filteredTemplates.length,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredTemplates[selectedIndex]) {
        insertTemplate(filteredTemplates[selectedIndex].content);
      }
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
        className={`editor-container relative h-full antialiased normal-nums [font-variant-ligatures:none] [font-feature-settings:'liga'_0,'calt'_0]
          ${wordWrap ? "w-full" : "w-max min-w-full"}
          [&_textarea]:!bg-transparent [&_textarea]:!text-transparent [&_textarea]:!caret-blue-500
          [&_textarea]:!z-10 [&_pre]:!z-0 [&_pre]:!pointer-events-none
          [&_textarea]:!outline-none [&_textarea]:!p-0 [&_pre]:!p-0
          [&_textarea]:!leading-[1.7] [&_pre]:!leading-[1.7]
          ${wordWrap ? "[&_textarea]:!white-space-pre-wrap [&_pre]:!white-space-pre-wrap" : "[&_textarea]:!white-space-pre [&_pre]:!white-space-pre"}
        `}
        style={{ fontFamily, fontSize }}
      >
        {menuOpen && filteredTemplates.length > 0 && (
          <div
            className="absolute z-50 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xl py-1 overflow-hidden"
            style={{ top: menuPos.top, left: menuPos.left, fontFamily }}
          >
            {filteredTemplates.map((t, i) => (
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
          onMouseMove={handleMouseMove}
          textareaClassName={
            isCtrlPressed && isOverLink ? "!cursor-pointer" : "!cursor-text"
          }
        />
      </div>
    </div>
  );
}
