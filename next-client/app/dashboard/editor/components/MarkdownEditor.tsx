import React from "react";
import Editor from "react-simple-code-editor";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  fontFamily: string;
  fontSize: string;
  searchTerm?: string;
  matchCount?: number;
  currentIndex?: number;
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

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ value, onChange, fontFamily, fontSize, searchTerm, matchCount, currentIndex }) => {
  return (
    <Editor
      value={value}
      onValueChange={onChange}
      highlight={(code) => highlightMarkdownWithTailwind(code, searchTerm, matchCount, currentIndex)}
      padding={16}
      textareaId="markdown-editor"
      textareaClassName="w-full h-full bg-transparent outline-none resize-none"
      preClassName="w-full h-full leading-relaxed bg-transparent"
      style={{
        minHeight: "400px",
        color: "inherit",
        fontFamily,
        fontSize
      }}
      spellCheck={true}
      autoFocus={true}
      data-testid="editor-textarea"
    />
  );
};

export default MarkdownEditor; 