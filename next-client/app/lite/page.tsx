'use client';

import React, { useState, useRef } from 'react';
import Button from '@/app/components/Button';
import Prism from 'prismjs';
import { useRouter } from 'next/navigation';
import { useAtom } from 'jotai';
import { atom_liteContent } from '@/app/atoms/atoms';

// Language Imports
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-json';

export default function LiteEditor() {
  const [content, setContent] = useAtom(atom_liteContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const router = useRouter();
  
  // Sync scroll between the visual layer and the input layer
  const handleScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Logic to handle clicking links through the transparent textarea
  const handlePointerDown = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (e.metaKey || e.ctrlKey) {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const pos = textarea.selectionStart;
      const text = textarea.value;
      
      // Find the boundaries of the word clicked
      const start = text.lastIndexOf(' ', pos) + 1;
      let end = text.indexOf(' ', pos);
      if (end === -1) end = text.length;
      
      const word = text.slice(start, end).replace(/[()\[\]]/g, ''); // Clean markdown syntax
      const urlPattern = /^(https?:\/\/[^\s]+)/;

      if (urlPattern.test(word)) {
        window.open(word, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const highlightedHTML = Prism.highlight(
    content + (content.endsWith('\n') ? ' ' : ''),
    Prism.languages.markdown,
    'markdown'
  );

  const typography = "font-mono text-lg leading-relaxed tracking-tight whitespace-pre-wrap break-words px-0 m-0 border-none outline-none";

  return (
    <div className="min-h-screen bg-white dark:bg-[#121212] text-gray-800 dark:text-gray-200 transition-colors duration-300">
      <main className="max-w-3xl mx-auto pt-24 pb-32 px-6">
        <div className="fixed top-4 left-4">
          <Button
            variant="bare"
            onClick={() => router.push('/dashboard/editor')} 
            aria-label="Go back to editor page"
          >
            ← Back
          </Button>
        </div>
        <div className="relative">
          
          {/* VISUAL LAYER (Underneath) */}
          <pre
            ref={preRef}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: highlightedHTML }}
            className={`${typography} absolute inset-0 pointer-events-none overflow-hidden 
              /* Reset all underlines forced by Prism defaults */
              [&_*]:no-underline
              
              /* Headers & Titles */
              [&_.token.header]:font-bold [&_.token.header]:text-black dark:[&_.token.header]:text-white
              [&_.token.title]:font-bold [&_.token.title]:text-black dark:[&_.token.title]:text-white
              
              /* Faded Markdown Symbols */
              [&_.token.punctuation]:text-gray-200 dark:[&_.token.punctuation]:text-gray-800
              [&_.token.operator]:text-gray-200 dark:[&_.token.operator]:text-gray-800
              
              /* Strikethrough */
              [&_.token.strike]:line-through [&_.token.strike]:opacity-40
              
              /* Code Blocks */
              [&_.token.code]:bg-gray-50 dark:[&_.token.code]:bg-white/5 [&_.token.code]:rounded-sm
              
              /* JS/JSON Syntax Highlighting */
              [&_.token.keyword]:text-purple-600 dark:[&_.token.keyword]:text-purple-400
              [&_.token.string]:text-green-600 dark:[&_.token.string]:text-green-400
              [&_.token.number]:text-orange-600 dark:[&_.token.number]:text-orange-400
              [&_.token.function]:text-blue-600 dark:[&_.token.function]:text-blue-400
              
              /* Actual Link Support */
              [&_.token.url]:underline [&_.token.url]:text-blue-500
              [&_.token.url-reference]:underline [&_.token.url-reference]:text-blue-500`}
          />

          {/* INTERACTION LAYER (On Top) */}
          <textarea
            id="editor"
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onScroll={handleScroll}
            onPointerDown={handlePointerDown}
            spellCheck={false}
            autoFocus
            placeholder="Start typing..."
            className={`${typography} relative w-full min-h-[75vh] bg-transparent text-transparent 
              caret-amber-500 resize-none overflow-y-auto no-underline
              /* Selection logic: words appear black/white against amber highlight */
              selection:bg-amber-100 dark:selection:bg-amber-900/40 selection:text-black dark:selection:text-white`}
          />
        </div>
      </main>

      {/* Minimalist Word Count Footer */}
      <footer className="fixed bottom-12 left-0 right-0 flex justify-center pointer-events-none">
        <div className="text-[10px] font-mono tracking-[0.3em] text-gray-300 dark:text-gray-700 uppercase select-none">
          {content.trim() ? content.trim().split(/\s+/).length : 0} Words
        </div>
      </footer>
    </div>
  );
}
