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
 * High-performance Tailwind-based Markdown highlighter.
 * Uses a Placeholder strategy to ignore content inside code blocks.
 */
const highlightMarkdownWithTailwind = (
  code: string, 
  searchTerm?: string, 
  matchCount?: number, 
  currentIndex?: number
) => {
  // 1. Initial escaping
  let escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 2. Hide Code Blocks
  // We extract them into an array and replace them with a unique marker.
  const codeBlocks: string[] = [];
  escaped = escaped.replace(/```[\s\S]*?```/g, (match) => {
    const id = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(`<span class="text-teal-600 dark:text-teal-400 font-mono">${match}</span>`);
    return id;
  });

  const inlineCodes: string[] = [];
  escaped = escaped.replace(/`([^`\n]+)`/g, (match) => {
    const id = `__INLINE_CODE_${inlineCodes.length}__`;
    inlineCodes.push(`<span class="bg-neutral-100 dark:bg-neutral-800 text-teal-600 dark:text-teal-400 rounded font-mono">${match}</span>`);
    return id;
  });

  // 3. Apply Markdown/Agentic Rules (Now safe from code block interference)
  
  // Agentic Tags
  escaped = escaped.replace(
    /&lt;(\/?[a-zA-Z0-9_]+)&gt;/g,
    `<span class="text-amber-600 dark:text-amber-500">&lt;$1&gt;</span>`
  );

  // Search Highlights
  if (searchTerm && searchTerm.length > 0) {
    const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedSearch, "gi");
    let matchIdx = 0;
    escaped = escaped.replace(regex, (match) => {
      const isCurrent = matchCount && currentIndex !== undefined && matchIdx === currentIndex;
      const colorClass = isCurrent 
        ? "bg-amber-400 dark:bg-amber-600 text-black ring-2 ring-amber-500" 
        : "bg-amber-100 dark:bg-amber-900/50 text-neutral-900 dark:text-neutral-100";
      
      const res = `<span class="${colorClass} rounded-sm">${match}</span>`;
      matchIdx++;
      return res;
    });
  }

  // Structural (Headings, Lists, Tables)
  escaped = escaped.replace(/\|/g, '<span class="text-neutral-300 dark:text-neutral-600">|</span>');
  escaped = escaped.replace(/^(#{1,6}\s.+)$/gm, `<span class="font-black text-amber-600 dark:text-amber-500">$1</span>`);
  escaped = escaped.replace(/^(\s*)([-*+]|\d+\.)\s/gm, `$1<span class="text-amber-500">$2</span> `);
  escaped = escaped.replace(/(\*\*|__)(.*?)\1/g, `<span class="font-bold text-neutral-900 dark:text-neutral-50">$1$2$1</span>`);
  escaped = escaped.replace(/(\[[^\]]+\]\([^\)]+\))/g, `<span class="text-blue-500 underline decoration-blue-500/30">$1</span>`);
  escaped = escaped.replace(/^(\s*&gt;\s*.+)$/gm, `<span class="text-neutral-500 border-l-2 border-neutral-200 dark:border-neutral-700 pl-3 italic">$1</span>`);
  escaped = escaped.replace(/~~([^~]+)~~/g, '<span class="line-through opacity-50">~~$1~~</span>');
  
  // 4. Reveal Code Blocks (Restore from placeholders)
  inlineCodes.forEach((html, i) => {
    escaped = escaped.replace(`__INLINE_CODE_${i}__`, html);
  });
  codeBlocks.forEach((html, i) => {
    escaped = escaped.replace(`__CODE_BLOCK_${i}__`, html);
  });

  return escaped;
};

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ 
  value, onChange, fontFamily, fontSize, searchTerm, matchCount, currentIndex, onTextareaReady 
}) => {
  const [popup, setPopup] = useState<{ text: string; url: string } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const prevIndexRef = useRef<number | undefined>(undefined);

  const highlight = useCallback((code: string) => (
    highlightMarkdownWithTailwind(code, searchTerm, matchCount, currentIndex)
  ), [searchTerm, matchCount, currentIndex]);

  useEffect(() => {
    if (prevIndexRef.current === currentIndex) return;
    prevIndexRef.current = currentIndex;
    
    if (!searchTerm || !textareaRef.current || currentIndex === undefined) return;
    
    const text = textareaRef.current.value;
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    
    let matchIdx = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (matchIdx === currentIndex) {
        const lineHeight = parseInt(getComputedStyle(textareaRef.current).lineHeight) || 24;
        const scrollTarget = (text.substring(0, match.index).split('\n').length - 1) * lineHeight;
        const container = textareaRef.current.closest('.overflow-auto') || textareaRef.current.parentElement;
        if (container) {
          container.scrollTo({ top: Math.max(0, scrollTarget - 100), behavior: 'smooth' });
        }
        break;
      }
      matchIdx++;
    }
  }, [searchTerm, currentIndex]);

  useEffect(() => {
    const textarea = wrapperRef.current?.querySelector('textarea');
    if (!textarea) return;
    textareaRef.current = textarea as HTMLTextAreaElement;
    onTextareaReady?.(textareaRef.current);

    const handleSelect = () => {
      const selection = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
      const match = selection.match(/\[([^\]]+)\]\(([^)]+)\)/) || selection.match(/\(([^)]+)\)\[([^\]]+)\]/);
      if (match) setPopup({ text: match[1], url: match[2] });
      else setPopup(null);
    };

    textarea.addEventListener('select', handleSelect);
    const selectionHandler = () => { if (document.activeElement === textarea) handleSelect(); };
    document.addEventListener('selectionchange', selectionHandler);

    return () => {
      textarea.removeEventListener('select', handleSelect);
      document.removeEventListener('selectionchange', selectionHandler);
      onTextareaReady?.(null);
    };
  }, [onTextareaReady]);

  return (
    <div className="relative flex-1 min-h-0 w-full" ref={wrapperRef}>
      <Editor
        value={value}
        onValueChange={onChange}
        highlight={highlight}
        padding={20}
        textareaId="markdown-editor"
        textareaClassName="outline-none resize-none selection:bg-amber-500/30 dark:selection:bg-amber-400/20 selection:text-current"
        className="min-h-[400px] h-full"
        style={{ fontFamily, fontSize, lineHeight: '1.6' }}
      />

      {popup && (
        <div className="fixed left-1/2 bottom-12 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col gap-3 min-w-[280px]">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Linked Resource</span>
              <button onClick={() => setPopup(null)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full">
                <FaTimes className="text-neutral-400" />
              </button>
            </div>
            <div className="text-[11px] text-neutral-500 break-all bg-neutral-50 dark:bg-neutral-950 p-2 rounded border border-neutral-100 dark:border-neutral-800">
              {popup.url}
            </div>
            <a href={popup.url} target="_blank" rel="noreferrer" className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm text-center rounded-xl font-bold transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98]">
              Open Link
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarkdownEditor;
