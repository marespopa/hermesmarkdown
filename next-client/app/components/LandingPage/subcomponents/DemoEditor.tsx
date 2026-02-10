"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Editor from "react-simple-code-editor";

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

const DEMO_CONTENT = `---
title: API Security Review
tags: code-review, security
---

# Task
Review the following API endpoint for security vulnerabilities.

Type / to see available commands...`;

// Demo slash commands
const DEMO_COMMANDS = [
  { key: "/constraints", label: "/constraints", description: "MUST/SHOULD/MUST NOT requirements", template: `## Constraints
**MUST:**
- [ ] Requirement 1
- [ ] Requirement 2

**SHOULD:**
- [ ] Preference 1

**MUST NOT:**
- [ ] Forbidden behavior 1
` },
  { key: "/security", label: "/security", description: "Security audit checklist", template: `## Security Checklist
- [ ] Input validation on all user data
- [ ] Authentication required for endpoint
- [ ] Rate limiting implemented
- [ ] No sensitive data in logs
- [ ] SQL injection protection
` },
  { key: "/fewshot", label: "/fewshot", description: "Few-shot example template", template: `## Examples

**Input:** [example input 1]
**Output:** [expected output 1]

**Input:** [example input 2]
**Output:** [expected output 2]
` },
  { key: "/system", label: "/system", description: "System role template", template: `## System Role
You are an expert [role]. Your task is to [primary objective].

**Tone:** Professional and precise
**Format:** [output format]
**Constraints:** [specific limitations]
` },
];

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

  // Filter commands based on what's typed after /
  const filteredCommands = DEMO_COMMANDS.filter(cmd => 
    cmd.key.toLowerCase().includes(filterText.toLowerCase())
  );

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
        setActiveIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (filteredCommands[activeIndex]) {
          insertTemplate(filteredCommands[activeIndex].template);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowAutocomplete(false);
        setSlashStartIndex(null);
        setFilterText("");
        break;
    }
  }, [showAutocomplete, activeIndex, filteredCommands, insertTemplate]);

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
          <div className="w-3 h-3 rounded-full bg-red-400"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
          <div className="w-3 h-3 rounded-full bg-green-400"></div>
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
        {showAutocomplete && filteredCommands.length > 0 && (
          <div 
            className="absolute z-50 bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-600 overflow-hidden w-72"
            style={{ top: autocompletePosition.top, left: autocompletePosition.left }}
          >
            <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500 border-b border-neutral-100 dark:border-neutral-700">
              Slash Commands
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredCommands.map((cmd, index) => (
                <button
                  key={cmd.key}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertTemplate(cmd.template);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`w-full text-left px-3 py-2 text-sm transition flex items-center gap-2 ${
                    index === activeIndex 
                      ? "bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100" 
                      : "hover:bg-neutral-50 dark:hover:bg-neutral-700"
                  }`}
                >
                  <span className="font-mono font-medium text-amber-700 dark:text-amber-400">{cmd.label}</span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{cmd.description}</span>
                </button>
              ))}
            </div>
            <div className="px-3 py-1.5 text-[10px] text-neutral-400 dark:text-neutral-500 border-t border-neutral-100 dark:border-neutral-700 flex gap-3">
              <span><kbd className="px-1 bg-neutral-100 dark:bg-neutral-700 rounded">↑↓</kbd> navigate</span>
              <span><kbd className="px-1 bg-neutral-100 dark:bg-neutral-700 rounded">⏎</kbd> insert</span>
              <span><kbd className="px-1 bg-neutral-100 dark:bg-neutral-700 rounded">esc</kbd> close</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Status Bar */}
      <div className="bg-neutral-50 dark:bg-neutral-800 px-4 py-2 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
        <span>{content.split(/\s+/).filter(Boolean).length} words • ~{Math.ceil(content.split(/\s+/).filter(Boolean).length * 1.35)} tokens</span>
        <span className="text-green-600 dark:text-green-400">● Local only</span>
      </div>
    </div>
  );
}
