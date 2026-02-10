"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Editor from "react-simple-code-editor";
import { analyzePromptClarity, getClarityDotColor } from "@/app/services/prompt-clarity";
import { PROMPT_TEMPLATES } from "@/app/dashboard/editor/organisms/PromptCommandBar/prompt-templates";
import { buildAutocompleteData } from "@/app/components/autocomplete/build-autocomplete-data";
import AutocompleteList from "@/app/components/autocomplete/AutocompleteList";

// Simplified markdown highlighter for demo
const highlightMarkdown = (code: string) => {
  // YAML frontmatter
  code = code.replace(
    /^---[\s\S]*?---/gm,
    match => `<span class="text-purple-600 dark:text-purple-400">${match}</span>`
  );
  // Headings
  code = code.replace(
    /^(#{1,6})\s(.+)$/gm,
    match => `<span class="font-bold text-amber-600 dark:text-amber-400">${match}</span>`
  );
  // Bold
  code = code.replace(
    /(\*\*|__)(.*?)\1/g,
    match => `<span class="font-bold">${match}</span>`
  );
  // Lists
  code = code.replace(
    /^(\s*)([-*+])\s/gm,
    (match, spaces, marker) => `${spaces}<span class="text-amber-600 dark:text-amber-400">${marker}</span> `
  );
  // Inline code
  code = code.replace(
    /`([^`]+)`/g,
    match => `<span class="text-teal-600 dark:text-teal-400">${match}</span>`
  );
  return code;
};

const DEMO_CONTENT = `# Task
Review the following API endpoint for security vulnerabilities.

## Constraints
- MUST check for SQL injection, XSS, and auth bypass
- MUST provide severity rating for each issue
- Do not include false positives or non-issues

## Output Format
Return as a markdown list with severity, issue, and fix.

Type / on the next row to see available commands...`;

interface DemoEditorProps {
  className?: string;
}

export default function DemoEditor({ className = "" }: DemoEditorProps) {
  const [content, setContent] = useState(DEMO_CONTENT);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  const [activeIndex, setActiveIndex] = useState(0);
  const [slashStartIndex, setSlashStartIndex] = useState<number | null>(null);
  const [filterText, setFilterText] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);

  // Build autocomplete data with grouping (same as Full Editor)
  const autocompleteData = useMemo(() => {
    return buildAutocompleteData(filterText, filterText.length, PROMPT_TEMPLATES);
  }, [filterText]);

  const handleContentChange = useCallback((newContent: string) => {
    const prevContent = content;
    setContent(newContent);

    // Find cursor position by comparing old and new content
    const cursorPos = newContent.length - (prevContent.length - (prevContent.length < newContent.length ? 0 : 1));
    
    // Check if "/" was just typed
    const lastChar = newContent[newContent.length - 1];
    const charBeforeLast = newContent[newContent.length - 2];
    
    if (lastChar === '/' && (charBeforeLast === '\n' || charBeforeLast === ' ' || charBeforeLast === undefined || newContent.length === 1)) {
      // Show autocomplete
      setShowAutocomplete(true);
      setSlashStartIndex(newContent.length - 1);
      setFilterText("");
      setActiveIndex(0);
      
      // Position autocomplete near the editor
      if (editorRef.current) {
        const rect = editorRef.current.getBoundingClientRect();
        setAutocompletePosition({
          top: Math.min(200, rect.height / 2),
          left: 20
        });
      }
    } else if (showAutocomplete && slashStartIndex !== null) {
      // Update filter text based on what's typed after /
      const textAfterSlash = newContent.slice(slashStartIndex);
      if (textAfterSlash.includes(' ') || textAfterSlash.includes('\n')) {
        // Space or newline typed, close autocomplete
        setShowAutocomplete(false);
        setSlashStartIndex(null);
        setFilterText("");
      } else {
        setFilterText(textAfterSlash);
      }
    }
  }, [content, showAutocomplete, slashStartIndex]);

  const insertTemplate = useCallback((template: string) => {
    if (slashStartIndex !== null) {
      const beforeSlash = content.slice(0, slashStartIndex);
      const newContent = beforeSlash + template;
      setContent(newContent);
    }
    setShowAutocomplete(false);
    setSlashStartIndex(null);
    setFilterText("");
  }, [content, slashStartIndex]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showAutocomplete) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => Math.min(prev + 1, autocompleteData.flatItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (autocompleteData.flatItems[activeIndex]) {
          insertTemplate(autocompleteData.flatItems[activeIndex].template);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowAutocomplete(false);
        setSlashStartIndex(null);
        setFilterText("");
        break;
    }
  }, [showAutocomplete, activeIndex, autocompleteData.flatItems, insertTemplate]);

  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (editorRef.current && !editorRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={editorRef} className={`bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden relative ${className}`}>
      {/* Editor Header */}
      <div className="bg-neutral-100 dark:bg-neutral-800 px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="ml-2 text-sm text-neutral-500 dark:text-neutral-400 font-mono">security-review.md</span>
        </div>
        <div className="text-xs text-neutral-400 dark:text-neutral-500">
          Try typing <kbd className="px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded text-[10px]">/</kbd> below on an empty row
        </div>
      </div>
      
      {/* Editor Content */}
      <div className="h-[400px] overflow-auto relative" onKeyDown={handleKeyDown}>
        <Editor
          value={content}
          onValueChange={handleContentChange}
          highlight={highlightMarkdown}
          padding={16}
          className="font-mono text-sm min-h-full"
          style={{
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            fontSize: "14px",
            lineHeight: "1.6",
            minHeight: "100%",
          }}
          textareaClassName="focus:outline-none"
        />
        
        {/* Autocomplete Dropdown */}
        {showAutocomplete && autocompleteData.flatItems.length > 0 && (
          <div 
            className="absolute z-50 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg p-2 w-80"
            style={{ top: autocompletePosition.top, left: autocompletePosition.left }}
          >
            <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400 px-2 pb-1">
              Commands
            </div>
            <AutocompleteList
              groupedItems={autocompleteData.groupedItems}
              activeIndex={activeIndex}
              onSelect={insertTemplate}
            />
          </div>
        )}
      </div>
      
      {/* Status Bar */}
      {(() => {
        const wordCount = content.split(/\s+/).filter(Boolean).length;
        const tokens = Math.ceil(wordCount * 1.35);
        const clarity = analyzePromptClarity(content);
        return (
          <div className="bg-neutral-50 dark:bg-neutral-800 px-4 py-2 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 gap-2 flex-wrap">
            <span>{wordCount} words • ~{tokens} tokens</span>
            <span className={`flex items-center gap-1 ${clarity.color}`} title={clarity.tips.length > 0 ? `Tips: ${clarity.tips.join(', ')}` : 'Prompt clarity score'}>
              <span className={`w-1.5 h-1.5 rounded-full ${getClarityDotColor(clarity.label)}`}></span>
              {clarity.label}
              {clarity.tips.length > 0 && (
                <span className="text-neutral-400 dark:text-neutral-500 ml-1 hidden sm:inline">
                  · {clarity.tips[0]}
                </span>
              )}
            </span>
          </div>
        );
      })()}
    </div>
  );
}
