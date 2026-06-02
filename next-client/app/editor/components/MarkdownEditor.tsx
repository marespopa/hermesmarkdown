"use client";

import React, { useRef, useEffect, useCallback, useState, useMemo } from "react";
import Editor from "react-simple-code-editor";
import getCaretCoordinates from "textarea-caret";
import { useAtom } from "jotai";
import {
  atom_fontSize,
  atom_fontFamily,
  atom_wordWrap,
  atom_isZenModeActive,
  atom_cursorPosition,
  atom_isEditorFocused,
  atom_editorWidth,
} from "@/app/atoms/atoms";

import {
  WORKFLOW_TAGS,
  TAG_COLORS,
  TAG_CYCLE,
  SHORTCODES,
  TEMPLATES,
} from "./constants";

const FADED = 'class="opacity-[0.15] dark:opacity-[0.2] transition-opacity duration-500 hover:opacity-100"';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onTextareaReady?: (element: HTMLTextAreaElement | null) => void;
  setMatchCount?: (count: number) => void;
  onWikiLinkClick?: (name: string) => void;
}

const REGEX_CODE_INLINE = /(`)(.*?)(`)/g;
const REGEX_WIKILINK = /\[\[([^\]]+)\]\]/g;
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

  if (html.includes("[[")) {
    html = html.replace(REGEX_WIKILINK, (match, content) => {
      const parts = content.split("|");
      const displayText = parts.length > 1 ? parts[1].trim() : parts[0].trim();
      return `<span ${FADED}>[[</span><span class="text-purple-600 dark:text-purple-400 font-bold underline cursor-pointer">${displayText}</span><span ${FADED}>]]</span>`;
    });
  }

  if (html.includes("`")) {
    html = html.replace(
      REGEX_CODE_INLINE,
      `<span ${FADED}>$1</span><span class="bg-zinc-100/80 dark:bg-zinc-800/50 rounded-sm">$2</span><span ${FADED}>$3</span>`,
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
      `<span ${FADED}>$1</span><span class="text-blue-600 dark:text-blue-400 underline">$2</span><span ${FADED}>$3$4$5</span>`,
    );
  }

  if (html.includes("*") || html.includes("_")) {
    html = html.replace(
      REGEX_BOLD,
      `<span ${FADED}>$1</span><strong class="font-bold text-zinc-900 dark:text-zinc-50">$2</strong><span ${FADED}>$1</span>`,
    );
    html = html.replace(
      REGEX_ITALIC,
      `<span ${FADED}>$1</span><em class="italic text-zinc-800 dark:text-zinc-200">$2</em><span ${FADED}>$1</span>`,
    );
  }

  if (html.includes("~~")) {
    html = html.replace(
      REGEX_STRIKETHROUGH,
      `<span ${FADED}>$1</span><del class="line-through opacity-40">$2</del><span ${FADED}>$3</span>`,
    );
  }

  return html;
}

function highlightMarkdown(code: string, isZenModeActive: boolean = false, activeLineIndex: number = -1) {
  const lines = code.split("\n");
  let isInsideCodeBlock = false;

  return lines
    .map((line, index) => {
      const html = line
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      let content = "";
      if (html.startsWith("\u0060\u0060\u0060") || html.startsWith("~~~")) {
        isInsideCodeBlock = !isInsideCodeBlock;
        const fence = html.slice(0, 3);
        const lang = html.slice(3);
        content = `<span ${FADED}>${fence}${lang}</span>`;
      } else if (isInsideCodeBlock) {
        const inner = html === "" ? " " : html;
        content = `<span class="bg-zinc-100/50 dark:bg-zinc-800/40">${inner}</span>`;
      } else if (!html.trim()) {
        content = html;
      } else if (/^( {0,3}([-*_])(?:\s*\2){2,}\s*)$/.test(html)) {
        content = `<span ${FADED}>${html}</span>`;
      } else if (html.startsWith("#") && /^#{1,6}\s/.test(html)) {
        content = html.replace(
          /^(#{1,6}\s+)(.*)$/,
          (m, hashes, label) =>
            `<span ${FADED}>${hashes}</span><span class="font-bold text-zinc-900 dark:text-zinc-50">${processInlineMarkdown(label)}</span>`,
        );
      } else if (html.startsWith("&gt;")) {
        content = html.replace(
          /^(&gt;\s?)(.*)$/,
          (m, quote, label) =>
            `<span ${FADED}>${quote}</span><span class="text-zinc-500 dark:text-zinc-400">${processInlineMarkdown(label)}</span>`,
        );
      } else if (/^\s*[-*+]\s+/.test(html)) {
        content = html.replace(
          /^(\s*[-*+]\s+)(\[[ xX]\]\s+)?(.*)$/,
          (m, bull, check, label) => {
            const isChecked = check?.toLowerCase().includes("x");
            const checkHtml = check ? `<span ${FADED}>${check}</span>` : "";
            return `<span ${FADED}>${bull}</span>${checkHtml}<span class="${isChecked ? "line-through opacity-40" : "text-zinc-900 dark:text-zinc-100"}">${processInlineMarkdown(label)}</span>`;
          },
        );
      } else {
        content = processInlineMarkdown(html);
      }

      const isActive = isZenModeActive && index === activeLineIndex;
      return `<div class="transition-all duration-700 ease-in-out ${isActive ? "bg-zinc-400/5 dark:bg-zinc-400/10 -mx-6 px-6 rounded-lg scale-[1.005] opacity-100 shadow-[0_0_40px_-15px_rgba(0,0,0,0.05)]" : isZenModeActive ? "opacity-30 scale-[0.99] blur-[0.3px]" : ""} min-h-[1.8em]">${content || " "}</div>`;
    })
    .join("");
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = "Type / for templates",
  onTextareaReady,
  onWikiLinkClick,
}: MarkdownEditorProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [fontFamily] = useAtom(atom_fontFamily);
  const [fontSize] = useAtom(atom_fontSize);
  const [wordWrap] = useAtom(atom_wordWrap);
  const [isZenModeActive] = useAtom(atom_isZenModeActive);
  const [editorWidth] = useAtom(atom_editorWidth);

  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fluid Typography: Boost font size by 1px on large displays
  const displayFontSize = useMemo(() => {
    const base = parseInt(fontSize);
    if (isNaN(base)) return fontSize;
    return windowWidth >= 1280 ? `${base + 1}px` : fontSize;
  }, [fontSize, windowWidth]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const userScrollTimeout = useRef<NodeJS.Timeout | null>(null);

  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [isOverLink, setIsOverLink] = useState(false);
  const [, setCursorPosition] = useAtom(atom_cursorPosition);
  const [, setIsEditorFocused] = useAtom(atom_isEditorFocused);

  const syncActiveLine = useCallback(() => {
    if (!textareaRef.current) return;
    const pos = textareaRef.current.selectionStart;
    const textUpToCursor = value.substring(0, pos);
    const lines = textUpToCursor.split("\n");
    const lineIndex = lines.length - 1;
    setActiveLineIndex(lineIndex);
    setCursorPosition({
      line: lines.length,
      col: lines[lineIndex].length + 1,
    });
  }, [value, setCursorPosition]);

  const syncScroll = useCallback(() => {
    if (!isZenModeActive || isUserScrolling || !textareaRef.current || !wrapperRef.current) return;

    const textarea = textareaRef.current;
    const wrapper = wrapperRef.current;
    const { top } = getCaretCoordinates(textarea, textarea.selectionStart);

    // In Zen Mode, we want the caret to be around the middle of the screen
    // With pt-[50vh], top=0 corresponds to the middle of the screen.
    const targetScrollTop = top;

    requestAnimationFrame(() => {
      wrapper.scrollTop = targetScrollTop;
    });
  }, [isZenModeActive, isUserScrolling]);

  useEffect(() => {
    const handleSelectionChange = () => {
      if (document.activeElement !== textareaRef.current) return;
      
      const textarea = textareaRef.current;
      if (!textarea) return;
      const isCollapsed = textarea.selectionStart === textarea.selectionEnd;

      // Only sync scroll when the selection is a cursor (collapsed),
      // to avoid jumping during dragging/range selection.
      if (isCollapsed) {
        syncScroll();
      }
      syncActiveLine();
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    
    // Trigger sync immediately and during transition when Zen Mode is toggled
    // We wait for the sidebar transitions to finish for accurate centering
    const timer1 = setTimeout(() => {
      syncScroll();
      syncActiveLine();
    }, 350);

    const timer2 = setTimeout(() => {
      syncScroll();
      syncActiveLine();
    }, 700);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isZenModeActive, syncScroll, syncActiveLine]);

  const handleScroll = useCallback(() => {
    if (!isZenModeActive) return;
    setIsUserScrolling(true);
    if (userScrollTimeout.current) clearTimeout(userScrollTimeout.current);
    userScrollTimeout.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 1500);
  }, [isZenModeActive]);

  const filteredTemplates = TEMPLATES.filter((t) =>
    t.label.toLowerCase().includes(filterQuery.toLowerCase()),
  );

  const highlight = useCallback((code: string) => {
    return highlightMarkdown(code, isZenModeActive, activeLineIndex);
  }, [isZenModeActive, activeLineIndex]);

  const widthClasses = {
    standard: "max-w-full px-4 md:px-8",
    narrow: "max-w-[95%] md:max-w-[850px] mx-auto",
  };

  const paddingClasses = {
    standard: "",
    narrow: "px-1",
  };

  function findLinkAtPos(text: string, pos: number) {
    let match;
    REGEX_MD_LINK.lastIndex = 0;
    while ((match = REGEX_MD_LINK.exec(text)) !== null) {
      if (pos >= match.index && pos <= match.index + match[0].length) {
        return { type: "url", value: match[1] };
      }
    }

    REGEX_WIKILINK.lastIndex = 0;
    while ((match = REGEX_WIKILINK.exec(text)) !== null) {
      if (pos >= match.index && pos <= match.index + match[0].length) {
        return { type: "wiki", value: match[1] };
      }
    }
    return null;
  }

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<any>) => {
      if (!e.ctrlKey && !e.metaKey) {
        setIsOverLink(false);
        return;
      }
      const target = e.currentTarget as HTMLTextAreaElement;
      if (target.selectionStart === undefined) return;
      const link = findLinkAtPos(value, target.selectionStart);
      setIsOverLink(!!link);
    },
    [value],
  );

  useEffect(() => {
    const textarea = wrapperRef.current?.querySelector("textarea");
    if (textarea) {
      textareaRef.current = textarea as HTMLTextAreaElement;
      if (onTextareaReady) onTextareaReady(textareaRef.current);
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
      // Escape special characters in the code for regex
      const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Use negative lookbehind to ensure the code is not preceded by a backslash
      const regex = new RegExp(`(?<!\\\\)${escapedCode}`, "g");
      processedContent = processedContent.replace(regex, getValue());
    });

    // Remove the backslashes used for escaping shortcodes
    processedContent = processedContent.replace(/\\(\{[\w]+\})/g, "$1");
    processedContent = processedContent.replace(/\\\.\.d/g, "..d");

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
          
          // In Zen Mode, we have 50vh padding at the top of the editor-container
          // caret.top is relative to the textarea (which starts after the padding)
          // We need to account for this padding when positioning the menu relative to the wrapper
          const zenPadding = isZenModeActive ? window.innerHeight * 0.5 : 0;
          const adjustedTop = caret.top + zenPadding;
          
          const spaceBelow =
            textarea.clientHeight + zenPadding * 2 - (adjustedTop - textarea.scrollTop);
          const shouldShowUp =
            spaceBelow < menuHeight && adjustedTop > menuHeight;
            
          setMenuPos({
            top: shouldShowUp ? adjustedTop - menuHeight - 8 : adjustedTop + 24,
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
      // Only manually reset selection if the value actually changed due to budgeting
      // Otherwise react-simple-code-editor handles it natively.
      if (textareaRef.current && nextVal !== val) {
        textareaRef.current.setSelectionRange(start, end);
      }
      syncScroll();
      syncActiveLine();
    });
  }

  function handleEditorClick(e: React.MouseEvent<any>) {
    const textarea = e.currentTarget as HTMLTextAreaElement;
    if (textarea.selectionStart === undefined) return;
    const pos = textarea.selectionStart;

    if (e.ctrlKey || e.metaKey) {
      const link = findLinkAtPos(value, pos);
      if (link) {
        e.preventDefault();
        if (link.type === "url") {
          window.open(link.value, "_blank", "noopener,noreferrer");
        } else if (onWikiLinkClick) {
          onWikiLinkClick(link.value);
        }
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

    syncScroll();
    syncActiveLine();
  }

  function handleGlobalKeyDown(e: React.KeyboardEvent) {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "b") {
        e.preventDefault();
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = value.substring(start, end);
        const replacement = `**${selectedText}**`;
        textarea.setSelectionRange(start, end);
        document.execCommand("insertText", false, replacement);
        return;
      }
      if (e.key === "i") {
        e.preventDefault();
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = value.substring(start, end);
        const replacement = `_${selectedText}_`;
        textarea.setSelectionRange(start, end);
        document.execCommand("insertText", false, replacement);
        return;
      }
    }

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
      onScroll={handleScroll}
      onClick={(e) => {
        if (e.target === e.currentTarget && textareaRef.current) {
          textareaRef.current.focus();
        }
      }}
      className={`relative w-full h-full overflow-auto cursor-text ${isZenModeActive ? "no-scrollbar" : "p-2"}`}
      translate="no"
    >
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget && textareaRef.current) {
            const textarea = textareaRef.current;
            textarea.focus();
            
            // If already focused and clicked padding, avoid resetting cursor to end
            // unless we're clicking specifically below the text area.
            const rect = textarea.getBoundingClientRect();
            if (e.clientY < rect.top) {
              textarea.setSelectionRange(0, 0);
            } else {
              const length = textarea.value.length;
              textarea.setSelectionRange(length, length);
            }
          }
        }}
        className={`editor-container relative min-h-full antialiased normal-nums [font-variant-ligatures:none] [font-feature-settings:'liga'_0,'calt'_0] 
          transition-[padding,max-width,opacity] duration-700 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)]
          ${isZenModeActive ? "max-w-[75ch] mx-auto pt-[45vh] pb-[45vh]" : `pt-1 pb-12 mx-auto ${widthClasses[editorWidth]} ${paddingClasses[editorWidth]}`}
          ${wordWrap ? "w-full" : "w-max min-w-full"}
          [&_textarea]:!bg-transparent [&_textarea]:!text-transparent [&_textarea]:!caret-blue-500
          [&_textarea]:!z-10 [&_pre]:!z-0 [&_pre]:!pointer-events-none
          [&_textarea]:!outline-none [&_textarea]:!p-0 [&_pre]:!p-0
          [&_textarea]:!leading-[1.8] [&_pre]:!leading-[1.8]
          [&_textarea]:!tracking-normal [&_pre]:!tracking-normal
          ${wordWrap ? "[&_textarea]:!white-space-pre-wrap [&_pre]:!white-space-pre-wrap" : "[&_textarea]:!white-space-pre [&_pre]:!white-space-pre"}
        `}
        style={{ fontFamily, fontSize: displayFontSize }}
      >
        {!value && (
          <div 
            className="absolute left-0 right-0 opacity-20 pointer-events-none italic"
            style={{ 
              paddingLeft: editorWidth === 'narrow' ? '0' : 'inherit',
              paddingRight: editorWidth === 'narrow' ? '0' : 'inherit',
              top: isZenModeActive ? '45vh' : '4px', // Matches pt-1 (4px) or pt-[45vh]
              lineHeight: '1.8'
            }}
          >
            {placeholder}
          </div>
        )}

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

        <Editor
          value={value}
          onValueChange={handleValueChange}
          highlight={highlight}
          padding={0}
          onClick={handleEditorClick}
          onPaste={handlePaste}
          onMouseMove={handleMouseMove}
          onFocus={() => setIsEditorFocused(true)}
          onBlur={() => setIsEditorFocused(false)}
          textareaClassName={
            isCtrlPressed && isOverLink ? "!cursor-pointer" : "!cursor-text"
          }
        />
      </div>
    </div>
  );
}
