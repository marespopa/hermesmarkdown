"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Editor from "react-simple-code-editor";
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

/**
 * Fades syntax markers (tokens) using low opacity.
 */
const highlightMarkdownMonochrome = (
  code: string, 
  searchTerm?: string, 
  matchCount?: number, 
  currentIndex?: number
) => {
  let escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 1. Hide Code Blocks & Inline Code (Monochrome style)
  const codeBlocks: string[] = [];
  escaped = escaped.replace(/```[\s\S]*?```/g, (match) => {
    const id = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(`<span class="opacity-50 font-mono">${match}</span>`);
    return id;
  });

  const inlineCodes: string[] = [];
  escaped = escaped.replace(/`([^`\n]+)`/g, (match) => {
    const id = `__INLINE_CODE_${inlineCodes.length}__`;
    inlineCodes.push(`<span class="bg-neutral-100 dark:bg-neutral-800/50 px-1 rounded font-mono opacity-80">${match}</span>`);
    return id;
  });

  // 2. Agentic Tags (Faded)
  escaped = escaped.replace(
    /&lt;(\/?[a-zA-Z0-9_]+)&gt;/g,
    `<span class="opacity-40 font-medium">&lt;$1&gt;</span>`
  );

  // 3. Search Highlights (Keep functional but grayscale)
  if (searchTerm && searchTerm.length > 0) {
    const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedSearch, "gi");
    let matchIdx = 0;
    escaped = escaped.replace(regex, (match) => {
      const isCurrent = matchCount && currentIndex !== undefined && matchIdx === currentIndex;
      const colorClass = isCurrent 
        ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-black" 
        : "bg-neutral-200 dark:bg-neutral-700 text-current";
      
      const res = `<span class="${colorClass} rounded-sm px-0.5">${match}</span>`;
      matchIdx++;
      return res;
    });
  }

  // 4. Structural Markdown 
  
  // Headings: Fade the '#' symbols
  escaped = escaped.replace(/^(#{1,6})(\s.+)$/gm, 
    `<span class="opacity-20 font-normal">$1</span><span class="font-bold text-neutral-900 dark:text-neutral-50">$2</span>`);
  
  // Lists: Fade the bullets/numbers
  escaped = escaped.replace(/^(\s*)([-*+]|\d+\.)(\s)/gm, 
    `$1<span class="opacity-30">$2</span>$3`);
  
  // Bold & Italic: Fade the markers
  escaped = escaped.replace(/(\*\*|__)(.*?)\1/g, 
    `<span class="opacity-20">$1</span><span class="font-bold text-neutral-900 dark:text-neutral-50">$2</span><span class="opacity-20">$1</span>`);
  escaped = escaped.replace(/(\*|_)(.*?)\1/g, 
    `<span class="opacity-20">$1</span><span class="italic text-neutral-900 dark:text-neutral-50">$2</span><span class="opacity-20">$1</span>`);

  // Links: Underline the text, ghost the URL
  escaped = escaped.replace(/(!?\[)(.*?)(\]\()(.*?)(\))/g, 
    `<span class="opacity-20">$1</span><span class="underline decoration-neutral-300 dark:decoration-neutral-600">$2</span><span class="opacity-20">$3$4$5</span>`);

  // Blockquotes: Fade the '>'
  escaped = escaped.replace(/^(&gt;\s)(.+)$/gm, 
    `<span class="opacity-20">$1</span><span class="italic opacity-70">$2</span>`);

  // Strikethrough
  escaped = escaped.replace(/~~([^~]+)~~/g, '<span class="opacity-20">~~</span><span class="line-through opacity-40">$1</span><span class="opacity-20">~~</span>');
  
  // 5. Reveal Placeholders
  inlineCodes.forEach((html, i) => { escaped = escaped.replace(`__INLINE_CODE_${i}__`, html); });
  codeBlocks.forEach((html, i) => { escaped = escaped.replace(`__CODE_BLOCK_${i}__`, html); });

  return escaped;
};

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ 
  value, onChange, fontFamily, fontSize, searchTerm, matchCount, currentIndex, onTextareaReady 
}) => {
  const [popup, setPopup] = useState<{ text: string; url: string } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const highlight = useCallback((code: string) => (
    highlightMarkdownMonochrome(code, searchTerm, matchCount, currentIndex)
  ), [searchTerm, matchCount, currentIndex]);

  useEffect(() => {
    const textarea = wrapperRef.current?.querySelector('textarea');
    if (!textarea) return;
    textareaRef.current = textarea as HTMLTextAreaElement;
    onTextareaReady?.(textareaRef.current);

    const handleSelect = () => {
      const selection = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
      const match = selection.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (match) setPopup({ text: match[1], url: match[2] });
      else setPopup(null);
    };

    textarea.addEventListener('mouseup', handleSelect);
    textarea.addEventListener('keyup', handleSelect);

    return () => {
      textarea.removeEventListener('mouseup', handleSelect);
      textarea.removeEventListener('keyup', handleSelect);
      onTextareaReady?.(null);
    };
  }, [onTextareaReady]);

  return (
    <div className="relative w-full h-full min-h-[400px] bg-transparent" ref={wrapperRef}>
      <Editor
        value={value}
        onValueChange={onChange}
        highlight={highlight}
        padding={32}
        textareaId="markdown-editor"
        textareaClassName="outline-none resize-none caret-neutral-900 dark:caret-neutral-100 text-neutral-800 dark:text-neutral-200 selection:bg-neutral-950/10 dark:selection:bg-neutral-50/20"
        className="w-full min-h-full font-mono"
        style={{ 
          fontFamily, 
          fontSize, 
          lineHeight: '1.6',
          minHeight: '100%' // Crucial for visibility
        }}
      />

      {popup && (
        <div className="fixed bottom-12 right-12 z-50 animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-2 pl-4 rounded-full shadow-xl flex items-center gap-4">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-30">Link</span>
            <span className="text-xs text-neutral-500 truncate max-w-[150px] font-mono">{popup.url}</span>
            <a href={popup.url} target="_blank" rel="noreferrer" className="bg-neutral-900 text-white dark:bg-neutral-100 dark:text-black px-4 py-1.5 rounded-full text-xs font-bold hover:opacity-80 transition-opacity">
              Open
            </a>
            <button onClick={() => setPopup(null)} className="pr-2 opacity-30 hover:opacity-100">
              <FaTimes size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarkdownEditor;
