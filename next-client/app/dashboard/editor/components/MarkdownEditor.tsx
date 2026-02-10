import React, { useState, useRef, useEffect } from "react";
import Editor from "react-simple-code-editor";
import Button from "@/app/components/Button";
import { FaTimes } from "react-icons/fa";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  fontFamily: string;
  fontSize: string;
  searchTerm?: string;
  matchCount?: number;
  currentIndex?: number;
  onTextareaReady?: (element: HTMLTextAreaElement | null) => void;
}

// Custom Tailwind-based markdown highlighter (with table support)
const highlightMarkdownWithTailwind = (code: string, searchTerm?: string, matchCount?: number, currentIndex?: number) => {
  // Highlight search matches if searchTerm is provided
  if (searchTerm && searchTerm.length > 0) {
    const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedSearchTerm, "gi");
    let matchIdx = 0;
    code = code.replace(regex, (match) => {
      let highlight;
      if (matchCount && currentIndex !== undefined && matchIdx === currentIndex) {
        highlight = `<span class=\"bg-amber-300 dark:bg-amber-600 text-black dark:text-white font-bold\">${match}</span>`;
      } else {
        highlight = `<span class=\"bg-amber-100 dark:bg-amber-800 text-black dark:text-white\">${match}</span>`;
      }
      matchIdx++;
      return highlight;
    });
  }

  // Table header separator (| --- | --- |)
  code = code.replace(
    /^(\s*\|?\s*:?-+:?\s*\|)+\s*$/gm,
    match => `<span class=\"text-neutral-500 dark:text-neutral-400\">${match}</span>`
  );
  // Table header row (the line before the separator)
  code = code.replace(
    /^(\s*\|.*\|\s*)\n(\s*\|?\s*:?-+:?\s*\|.*)$/gm,
    (match, header, separator) =>
      `<span class=\"font-bold text-amber-600 dark:text-amber-400\">${header}</span>\n${separator}`
  );
  // Table pipes (|)
  code = code.replace(/\|/g, '<span class="text-neutral-400 dark:text-neutral-500">|</span>');

  // Headings (##, #) - bold and color only, no size
  code = code.replace(
    /^(#{1,6})\s(.+)$/gm,
    match => `<span class=\"font-bold text-amber-600 dark:text-amber-400\">${match}</span>`
  );
  // Alternate heading syntax (=== and ---)
  code = code.replace(
    /^(.+)\n(=+|-+)\s*$/gm,
    match => `<span class=\"font-bold text-amber-600 dark:text-amber-400\">${match}</span>`
  );
  // Bold (**text** or __text__) - wrap entire match
  code = code.replace(
    /(\*\*|__)(.*?)\1/g,
    match => `<span class="font-bold text-neutral-900 dark:text-neutral-100">${match}</span>`
  );
  // Italic (*text* or _text_) - wrap entire match
  code = code.replace(
    /(\*|_)(.*?)\1/g,
    match => `<span class="italic text-neutral-700 dark:text-neutral-300">${match}</span>`
  );
  // Bold and Italic (***text*** or ___text___) - wrap entire match
  code = code.replace(
    /(\*\*\*|___)(.*?)\1/g,
    match => `<span class="font-bold italic text-neutral-900 dark:text-neutral-100">${match}</span>`
  );
  // Strikethrough (~~text~~) - wrap entire match
  code = code.replace(
    /(~~)(.*?)\1/g,
    match => `<span class="line-through text-neutral-500 dark:text-neutral-400">${match}</span>`
  );
  // Superscript (^text^) - wrap entire match
  code = code.replace(
    /([a-zA-Z0-9])\^([^\s^]+)\^/g,
    (match, base, superscript) => `<span class="text-purple-600 dark:text-purple-400">${base}^${superscript}^</span>`
  );
  // Lists (-, *, +) - color only the marker
  code = code.replace(
    /^(\s*)([-*+])\s(.+)$/gm,
    (match, spaces, marker, content) => 
      `${spaces}<span class="text-amber-600 dark:text-amber-400">${marker}</span> <span class="text-neutral-900 dark:text-neutral-100">${content}</span>`
  );
  // Ordered lists (1. 2. 3.) - color only the number
  code = code.replace(
    /^(\s*)(\d+\.)\s(.+)$/gm,
    (match, spaces, number, content) => 
      `${spaces}<span class="text-amber-600 dark:text-amber-400">${number}</span> <span class="text-neutral-900 dark:text-neutral-100">${content}</span>`
  );
  // Fenced code blocks (```language\ncode\n```) - color entire block
  code = code.replace(
    /```[\s\S]*?```/g,
    match => `<span class="text-teal-600 dark:text-teal-400">${match}</span>`
  );
  // Inline code - color entire block
  code = code.replace(
    /`([^`\n]+)`/g,
    match => `<span class="text-teal-600 dark:text-teal-400">${match}</span>`
  );
  // Horizontal rule (---, ***, ___) - wrap entire match
  code = code.replace(
    /^(\s*)([-*_]{3,})\s*$/gm,
    match => `<span class="text-neutral-400 dark:text-neutral-600">${match}</span>`
  );
  // Links [text](url) - wrap entire match
  code = code.replace(
    /(\[[^\]]+\]\([^\)]+\))/g,
    match => `<span class="underline text-blue-600 dark:text-blue-400">${match}</span>`
  );
  // Images ![alt](url) - wrap entire match
  code = code.replace(
    /(!\[[^\]]+\]\([^\)]+\))/g,
    match => `<span class="text-green-600 dark:text-green-400">${match}</span>`
  );
  // Blockquotes (>) - wrap entire match
  code = code.replace(
    /^(\s*>\s*.+)$/gm,
    match => `<span class="text-neutral-600 dark:text-neutral-400 border-l-4 border-neutral-300 dark:border-neutral-600 pl-2">${match}</span>`
  );
  // Escaped characters (\) - wrap entire match
  code = code.replace(
    /\\([\\`*_{}\[\]()#+\-\.!|])/g,
    match => `<span class="text-neutral-500 dark:text-neutral-400">${match}</span>`
  );
  return code;
};

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ value, onChange, fontFamily, fontSize, searchTerm, matchCount, currentIndex, onTextareaReady }) => {
  const [popup, setPopup] = useState<{ text: string; url: string } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Handler to hide popup
  const handlePopupClose = () => {
    setPopup(null);
    // Clear selection in textarea
    if (textareaRef.current) {
      textareaRef.current.selectionStart = textareaRef.current.selectionEnd;
    }
  };

  // Attach select event to textarea and selectionchange for mobile
  useEffect(() => {
    if (!wrapperRef.current) return;
    const textarea = wrapperRef.current.querySelector('textarea');
    if (!textarea) return;
    textareaRef.current = textarea as HTMLTextAreaElement;
    onTextareaReady?.(textareaRef.current);

    const handleSelect = () => {
      const selection = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
      let match = selection.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        setPopup({ text: match[1], url: match[2] });
        return;
      }
      match = selection.match(/\(([^)]+)\)\[([^\]]+)\]/);
      if (match) {
        setPopup({ text: match[2], url: match[1] });
        return;
      }
      setPopup(null);
    };

    textarea.addEventListener('select', handleSelect);

    // Fallback for mobile: selectionchange on document
    const handleSelectionChange = () => {
      if (document.activeElement === textarea) {
        handleSelect();
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      textarea.removeEventListener('select', handleSelect);
      document.removeEventListener('selectionchange', handleSelectionChange);
      onTextareaReady?.(null);
    };
  }, [value, onTextareaReady]);

  return (
    <div className="relative flex-1 min-h-0" ref={wrapperRef}>
      <Editor
        value={value}
        onValueChange={onChange}
        highlight={highlightMarkdownWithTailwind}
        padding={{ top: 16, right: 16, bottom: 48, left: 16 }}
        textareaId="markdown-editor"
        textareaClassName="w-full h-full bg-transparent outline-none resize-none overflow-y-scroll"
        preClassName="w-full h-full leading-relaxed bg-transparent"
        style={{
          minHeight: "400px",
          height: "100%",
          color: "inherit",
          fontFamily,
          fontSize
        }}
        spellCheck={true}
        autoFocus={true}
        data-testid="editor-textarea"
      />
      {popup && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: 32,
            transform: "translateX(-50%)",
            zIndex: 1000,
          }}
          className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-4 py-4 rounded-2xl shadow-xl flex flex-col items-center gap-2 border border-neutral-200 dark:border-neutral-700 min-w-[260px]"
        >
          <div className="flex w-full justify-between items-center mb-1">
            <div className="text-base font-semibold">Markdown Link</div>
            <Button
              variant="icon"
              aria-label="Close popup"
              title="Close"
              onMouseDown={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); handlePopupClose(); }}
              styles="ml-2"
            >
              <FaTimes />
            </Button>
          </div>
          <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-1 break-all font-mono">[{popup.text}]({popup.url})</div>
          <a
            href={popup.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 text-lg font-medium"
          >
            Go to link
          </a>
        </div>
      )}
    </div>
  );
};

export default MarkdownEditor; 