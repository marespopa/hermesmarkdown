"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import Editor from "react-simple-code-editor";
import { useAtom } from "jotai";
import {
  atom_fontSize,
  atom_fontFamily,
  atom_wordWrap,
} from "@/app/atoms/atoms";
import useIsMobile from "@/app/hooks/use-is-mobile";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchTerm?: string;
  onTextareaReady?: (element: HTMLTextAreaElement | null) => void;
  setMatchCount?: (count: number) => void;
}

const highlightMarkdownMonochrome = (
  code,
  fontFamily,
  searchTerm,
  wordWrap,
) => {
  const SUBTLE_STYLE =
    'class="text-neutral-500/50 dark:text-neutral-400/30 transition-opacity hover:opacity-100"';
  const wrapStyle = wordWrap ? "pre-wrap" : "pre";

  // Use fontFamily from atom if available, fallback to mono
  const customFont = fontFamily ? `font-family: ${fontFamily};` : "";

  let escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Search Term
  if (searchTerm?.length > 1 && searchTerm?.trim()) {
    try {
      const safeSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${safeSearch})`, "gi");
      escaped = escaped.replace(
        regex,
        `<mark class="bg-blue-500/20 dark:bg-blue-400/30 text-inherit rounded-sm">$1</mark>`,
      );
    } catch (e) {}
  }

  // We move code into an array so other regexes don't "see" it.
  const placeholders = [];

  // Fenced Blocks
  escaped = escaped.replace(
    /(```)([a-z ]*)([\n\r])?([\s\S]*?)(```)/g,
    (match) => {
      const id = `__FENCED_${placeholders.length}__`;
      placeholders.push({ id, content: match, type: "fenced" });
      return id;
    },
  );

  // Inline Blocks
  escaped = escaped.replace(/(`)([^`\n\r]+)(`)/g, (match) => {
    const id = `__INLINE_${placeholders.length}__`;
    placeholders.push({ id, content: match, type: "inline" });
    return id;
  });

  // Headings
  escaped = escaped.replace(
    /^(#{1,6})(\s[^\n\r]*)$/gm,
    `<span ${SUBTLE_STYLE}>$1</span><span class="font-semibold text-zinc-900 dark:text-zinc-50">$2</span>`,
  );

  // Workflow Tags
  const workflowTags = ["todo", "prog", "done", "urgn", "wait"];
  const tagRegex = new RegExp(
    `(?:^|\\s)#(${workflowTags.join("|")})(?=\\s|$)`,
    "gim",
  );
  escaped = escaped.replace(tagRegex, (match, tagName) => {
    const colors = {
      todo: "text-blue-600 dark:text-blue-400",
      prog: "text-amber-600 dark:text-amber-400",
      done: "text-green-600 dark:text-green-400",
      urgn: "text-red-600 dark:text-red-400",
      wait: "text-purple-600 dark:text-purple-400",
    };
    const colorClass = colors[tagName.toLowerCase()] || "text-zinc-500";
    return `<span class="${colorClass} font-mono font-bold cursor-pointer" data-testid="status-tag" style="${customFont}">${match} <small class="opacity-40 text-[0.8em] select-none">↻</small></span>`;
  });

  // Horizontal Rule
  escaped = escaped.replace(/^( {0,3}([*+\-])(?:\s*\2){2,}\s*)$/gm, (match) => {
    return `<span class="text-transparent bg-gradient-to-r from-zinc-200 to-zinc-200 dark:from-zinc-800 dark:to-zinc-800 bg-[length:100%_1px] bg-center bg-no-repeat" style="display: inline-block; width: 100%;">${match}</span>`;
  });

  // Blockquotes
  escaped = escaped.replace(
    /^((?:&gt;\s*)+)([^\n\r]*)$/gm,
    `<span class="bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400"><span ${SUBTLE_STYLE}>$1</span>$2</span>`,
  );

  // Links
  escaped = escaped.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    `<span class="text-blue-600 dark:text-blue-400 underline-offset-4">[$1]</span><span ${SUBTLE_STYLE}>($2)</span>`,
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

  // Lists & Checkboxes
  escaped = escaped.replace(
    /^(\s*(?:[\d+\.\-\*]+|[*+\-]))(\s*\[([ xX])\]\s+)?([^\n\r]*)$/gm,
    (match, bullet, checkGroup, checkChar, label) => {
      const isTask = checkGroup !== undefined;
      const isChecked = isTask && checkChar.toLowerCase() === "x";
      const bulletPart = `<span ${SUBTLE_STYLE}>${bullet}</span>`;

      if (isTask) {
        // Leave empty space as per instructions, no [ ] in markdown template logic
        const checkboxPart = `<span ${SUBTLE_STYLE} style="${customFont}">${checkGroup}<span class="text-[10px] ml-[-4px] opacity-30 select-none">◦</span></span>`;
        const labelStyle = isChecked
          ? 'class="line-through opacity-50"'
          : 'class="text-zinc-900 dark:text-zinc-100"';
        return `${bulletPart}${checkboxPart}<span ${labelStyle}>${label}</span>`;
      }
      return `${bulletPart}<span class="text-zinc-900 dark:text-zinc-100">${label}</span>`;
    },
  );

  escaped = escaped.replace(/\|/g, `<span ${SUBTLE_STYLE}>|</span>`);

  placeholders.forEach((p) => {
    let styled;
    if (p.type === "fenced") {
      styled = p.content.replace(
        /(```)([a-z ]*)([\n\r])?([\s\S]*?)(```)/g,
        (_, tOpen, lang, nl, content, tClose) => {
          return (
            `<span class="bg-zinc-100/50 dark:bg-zinc-800/40" style="display: block; white-space: ${wrapStyle}; ${customFont} -webkit-box-decoration-break: clone;">` +
            `<span ${SUBTLE_STYLE}>${tOpen}${lang}${nl || ""}</span>` +
            `<span class="text-zinc-900 dark:text-zinc-100">${content}</span>` +
            `<span ${SUBTLE_STYLE}>${tClose}</span>` +
            `</span>`
          );
        },
      );
    } else {
      styled = p.content.replace(
        /(`)([^`\n\r]+)(`)/g,
        (_, tOpen, content, tClose) => {
          return (
            `<span class="bg-zinc-100/80 dark:bg-zinc-800/80 rounded-sm text-zinc-900 dark:text-zinc-100" style="padding: 0 2px; ${customFont}">` +
            `<span ${SUBTLE_STYLE}>${tOpen}</span>${content}<span ${SUBTLE_STYLE}>${tClose}</span>` +
            `</span>`
          );
        },
      );
    }
    escaped = escaped.replace(p.id, styled);
  });

  return escaped;
};

// Main Component
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
  const isMobile = useIsMobile();
  const [isTyping, setIsTyping] = useState(false);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [isOverLink, setIsOverLink] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const highlight = useCallback(
    (code: string) =>
      highlightMarkdownMonochrome(code, fontFamily, searchTerm, wordWrap),
    [searchTerm, wordWrap],
  );

  useEffect(() => {
    const textarea = wrapperRef.current?.querySelector("textarea");
    if (textarea) {
      textareaRef.current = textarea as HTMLTextAreaElement;
      if (onTextareaReady) onTextareaReady(textareaRef.current);
    }
  }, [onTextareaReady]);

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
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(val);
      return;
    }

    const start = textarea.selectionStart;
    let processedVal = val;
    let cursorOffset = 0;

    // 1. Tag Cleaning Logic: Prevents text after #tags
    const workflowTags = ["todo", "prog", "done", "urgn", "wait"];
    const lines = processedVal.split("\n");
    let needsShift = false;

    const cleanedLines = lines.map((line) => {
      const tagMatch = line.match(
        new RegExp(`^(.*#(${workflowTags.join("|")}))(\\s*\\S.*)$`, "i"),
      );
      if (tagMatch) {
        needsShift = true;
        // Pushes trailing text to a new line
        return `${tagMatch[1]}\n${tagMatch[3].trim()}`;
      }
      return line;
    });

    if (needsShift) {
      processedVal = cleanedLines.join("\n");
      cursorOffset += 1; // Adjust for the newly injected newline
    }

    // 2. Shortcode Processing
    const shortcodes: Record<string, () => string> = {
      "..d": () => new Date().toLocaleDateString("en-CA"),
      "{date}": () => new Date().toLocaleDateString("en-CA"),
      "{time}": () =>
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
    };

    Object.entries(shortcodes).forEach(([code, getValue]) => {
      if (processedVal.includes(code)) {
        const replacement = getValue();
        const occurrences = (
          processedVal.match(
            new RegExp(code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          ) || []
        ).length;
        cursorOffset += (replacement.length - code.length) * occurrences;
        processedVal = processedVal.replaceAll(code, replacement);
      }
    });

    onChange(processedVal);

    if (cursorOffset !== 0) {
      requestAnimationFrame(() => {
        textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
        textarea.focus();
      });
    }

    setIsTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 1500);
  };

  const TAG_CYCLE: Record<string, string> = {
    urgn: "todo",
    todo: "prog",
    prog: "wait",
    wait: "done",
    done: "todo",
  };

  const handleEditorClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const pos = textarea.selectionStart;
    const textBefore = value.substring(0, pos);
    const lineStartIndex = textBefore.lastIndexOf("\n") + 1;
    const nextNewline = value.indexOf("\n", pos);
    const lineEndIndex = nextNewline === -1 ? value.length : nextNewline;
    const currentLine = value.substring(lineStartIndex, lineEndIndex);

    let workingValue = value;
    let didUpdate = false;

    // 1. Link Logic (Priority)
    const url = findLinkAtPos(value, pos);
    if (url) {
      e.preventDefault();
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    // 2. Checkbox Toggle Logic
    // Check if there is a checkbox at the start of the current line
    const checkboxRegex = /^(\s*[-\*]\s*\[)([ xX])(\])/;
    const checkboxMatch = currentLine.match(checkboxRegex);

    if (checkboxMatch) {
      const boxStart = lineStartIndex + checkboxMatch[0].indexOf("[");
      const boxEnd = lineStartIndex + checkboxMatch[0].indexOf("]") + 1;

      // Only toggle if the click is specifically within the [ ] area
      if (pos >= boxStart && pos <= boxEnd) {
        e.preventDefault();
        const checkCharIndex = lineStartIndex + checkboxMatch[1].length;
        const isChecked = workingValue[checkCharIndex].toLowerCase() === "x";
        const nextChar = isChecked ? " " : "x";

        workingValue =
          workingValue.substring(0, checkCharIndex) +
          nextChar +
          workingValue.substring(checkCharIndex + 1);
        didUpdate = true;
      }
    }

    // 3. Status Tag Toggle Logic (Run if checkbox wasn't the target)
    if (!didUpdate) {
      const tagRegex = /#(todo|prog|done|urgn|wait)\b/gi;
      let tagMatch;

      // Iterate through all tags on the line to see if one is under the cursor
      while ((tagMatch = tagRegex.exec(currentLine)) !== null) {
        const tagStart = lineStartIndex + tagMatch.index;
        const tagEnd = tagStart + tagMatch[0].length;

        if (pos >= tagStart && pos <= tagEnd) {
          e.preventDefault();
          const tagName = tagMatch[1].toLowerCase();
          const nextTag = TAG_CYCLE[tagName];

          if (nextTag) {
            workingValue =
              workingValue.substring(0, tagStart) +
              `#${nextTag}` +
              workingValue.substring(tagEnd);
            didUpdate = true;
            break; // Match found, exit loop
          }
        }
      }
    }

    // Finalize Update
    if (didUpdate) {
      onChange(workingValue);

      // Defer selection to next frame to ensure the DOM has updated
      requestAnimationFrame(() => {
        textarea.setSelectionRange(pos, pos);
        textarea.focus();
      });
    }
  };

  const wrapClasses = wordWrap
    ? "[&_textarea]:!white-space-pre-wrap [&_pre]:!white-space-pre-wrap [&_textarea]:!break-words [&_pre]:!break-words [&_textarea]:!overflow-wrap-anywhere [&_pre]:!overflow-wrap-anywhere [&_textarea]:!overflow-x-hidden"
    : "[&_textarea]:!white-space-pre [&_pre]:!white-space-pre [&_textarea]:!overflow-x-auto [&_pre]:!overflow-x-hidden [&_textarea]:!w-max [&_pre]:!w-max [&_textarea]:!min-w-full [&_pre]:!min-w-full";

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full min-h-screen transition-all duration-700 p-2 ${!wordWrap ? "overflow-x-auto" : "overflow-x-hidden"}`}
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
