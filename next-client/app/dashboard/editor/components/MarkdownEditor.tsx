import React from "react";
import Editor from "react-simple-code-editor";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  fontFamily: string;
  fontSize: string;
}

// Custom Tailwind-based markdown highlighter (with table support)
const highlightMarkdownWithTailwind = (code: string) => {
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
    (match, hashes, text) =>
      `<span class=\"font-bold text-amber-600 dark:text-amber-400\">${hashes} ${text}</span>`
  );
  // Bold (**text** or __text__)
  code = code.replace(
    /(\*\*|__)(.*?)\1/g,
    '<span class="font-bold text-neutral-900 dark:text-neutral-100">$2</span>'
  );
  // Italic (*text* or _text_)
  code = code.replace(
    /(\*|_)(.*?)\1/g,
    '<span class="italic text-neutral-700 dark:text-neutral-300">$2</span>'
  );
  // Lists (-, *, +)
  code = code.replace(
    /^(\s*[-*+])\s(.+)$/gm,
    '<span class="text-amber-600 dark:text-amber-400">$1</span> <span class="text-neutral-900 dark:text-neutral-100">$2</span>'
  );
  // Inline code
  code = code.replace(
    /`([^`]+)`/g,
    '<span class="bg-neutral-200 dark:bg-neutral-800 text-amber-700 dark:text-amber-300 rounded px-1 font-mono">$1</span>'
  );
  // Horizontal rule (---, ***, ___)
  code = code.replace(
    /^(\s*)([-*_]){3,}\s*$/gm,
    '<span class="text-neutral-400 dark:text-neutral-600">$1</span>'
  );
  // Links [text](url) - highlight as blue span, not clickable
  code = code.replace(
    /(\[[^\]]+\]\([^\)]+\))/g,
    '<span class="underline text-blue-600 dark:text-blue-400">$1</span>'
  );
  return code;
};

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ value, onChange, fontFamily, fontSize }) => {
  return (
    <Editor
      value={value}
      onValueChange={onChange}
      highlight={highlightMarkdownWithTailwind}
      padding={16}
      textareaId="markdown-editor"
      textareaClassName="w-full h-full bg-transparent outline-none resize-none"
      preClassName="w-full h-full font-mono leading-relaxed bg-transparent"
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