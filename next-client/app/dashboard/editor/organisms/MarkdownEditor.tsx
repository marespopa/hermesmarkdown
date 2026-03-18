"use client";

import React, { useRef, useCallback } from "react";
import Editor from "react-simple-code-editor";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  fontFamily: string;
  fontSize: string;
  searchTerm?: string;
}

const highlightMarkdownMonochrome = (code: string, searchTerm?: string) => {
  let escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 1. Headings: Ghost symbols, Bold & Solid Text
  escaped = escaped.replace(/^(#{1,6})(\s.+)$/gm, 
    `<span style="opacity: 0.15; font-weight: 400;">$1</span><span style="font-weight: 700; color: var(--text-main);">$2</span>`);
  
  // 2. Bold: Ghost markers, Bold & Solid Text
  escaped = escaped.replace(/(\*\*|__)(.*?)\1/g, 
    `<span style="opacity: 0.15; font-weight: 400;">$1</span><span style="font-weight: 700; color: var(--text-main);">$2</span><span style="opacity: 0.15; font-weight: 400;">$1</span>`);
  
  // 3. Italic: Ghost markers, Italic Text
  escaped = escaped.replace(/(\*|_)(.*?)\1/g, 
    `<span style="opacity: 0.15;">$1</span><span style="font-style: italic; color: var(--text-main);">$2</span><span style="opacity: 0.15;">$1</span>`);

  // 4. Lists: Ghost the bullet
  escaped = escaped.replace(/^(\s*)([-*+]|\d+\.)(\s)/gm, 
    `$1<span style="opacity: 0.2">$2</span>$3`);

  return escaped;
};

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ 
  value, onChange, fontFamily, fontSize, searchTerm 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const highlight = useCallback((code: string) => (
    highlightMarkdownMonochrome(code, searchTerm)
  ), [searchTerm]);

  const handleContainerClick = () => {
    // Selects the textarea inside the library's DOM and forces focus
    const textarea = containerRef.current?.querySelector('textarea');
    textarea?.focus();
  };

  return (
    <div 
      ref={containerRef}
      onClick={handleContainerClick}
      className="relative w-full min-h-screen cursor-text bg-transparent" 
    >
      <style jsx global>{`
        .editor-container {
          --text-main: #171717;
          --text-ghost: #737373;
          border: none !important;
          height: 100%;
        }
        .dark .editor-container {
          --text-main: #ffffff;
          --text-ghost: #737373;
        }

        .editor-container textarea,
        .editor-container pre {
          font-family: ${fontFamily}, "JetBrains Mono", ui-monospace, monospace !important;
          font-size: ${fontSize} !important;
          line-height: 1.8 !important;
          padding: 16px 16px !important; /* Extra top padding for better breathing room */
          
          font-variant-ligatures: none !important;
          letter-spacing: 0px !important;
          tab-size: 4 !important;
          white-space: pre-wrap !important;
          word-break: break-all !important;
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          min-height: 100vh !important;
        }

        .editor-container textarea {
          color: transparent !important;
          caret-color: var(--text-main) !important;
          z-index: 1;
          background: transparent !important;
          font-weight: 400 !important;
        }

        .editor-container pre {
          color: var(--text-ghost) !important;
          z-index: 0;
          background: transparent !important;
        }

        /* Clean up library-injected borders */
        .editor-container div {
           border: none !important;
        }
      `}</style>

      <div className="editor-container w-full h-full">
        <Editor
          value={value}
          onValueChange={onChange}
          highlight={highlight}
          textareaId="markdown-editor"
          className="w-full h-full"
        />
      </div>
    </div>
  );
};

export default MarkdownEditor;
