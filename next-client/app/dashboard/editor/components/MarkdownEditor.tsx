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
    match => `<span class="text-gray-400">${match}</span>`
  );
  // Table header row (the line before the separator)
  code = code.replace(
    /^(\s*\|.*\|\s*)\n(\s*\|?\s*:?-+:?\s*\|.*)$/gm,
    (match, header, separator) =>
      `<span class="font-bold text-gray-900 dark:text-white">${header}</span>\n${separator}`
  );
  // Table pipes (|)
  code = code.replace(/\|/g, '<span class="text-black dark:text-white">|</span>');

  // Headings (##, #) - bold and color only, no size
  code = code.replace(
    /^(#{1,6})\s(.+)$/gm,
    (match, hashes, text) =>
      `<span class="font-bold text-gray-900 dark:text-white">${hashes} ${text}</span>`
  );
  // Bold (**text** or __text__)
  code = code.replace(
    /(\*\*|__)(.*?)\1/g,
    '<span class="font-bold text-gray-900 dark:text-white">$2</span>'
  );
  // Italic (*text* or _text_)
  code = code.replace(
    /(\*|_)(.*?)\1/g,
    '<span class="italic text-gray-700 dark:text-gray-200">$2</span>'
  );
  // Lists (-, *, +)
  code = code.replace(
    /^(\s*[-*+])\s(.+)$/gm,
    '<span class="text-gray-900 dark:text-white">$1</span> <span class="text-gray-900 dark:text-white">$2</span>'
  );
  // Inline code
  code = code.replace(
    /`([^`]+)`/g,
    '<span class="bg-gray-200 dark:bg-gray-800 text-pink-600 dark:text-pink-400 rounded px-1 font-mono">$1</span>'
  );
  // Horizontal rule (---, ***, ___)
  code = code.replace(
    /^(\s*)([-*_]){3,}\s*$/gm,
    '<span class="text-gray-400">$&</span>'
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
        fontFamily,
        fontSize,
        minHeight: "400px",
        background: "transparent",
        color: "inherit",
      }}
      spellCheck={true}
      autoFocus={true}
    />
  );
};

export default MarkdownEditor; 