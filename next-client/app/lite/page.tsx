'use client';

import React, { useRef, useEffect } from 'react';
import Button from '@/app/components/Button';
import Prism from 'prismjs';
import { useRouter } from 'next/navigation';
import { useAtom } from 'jotai';
import { atom_liteContent } from '@/app/atoms/atoms';

// Language Imports
import 'prismjs/components/prism-markdown';

export default function LiteEditor() {
  const [content, setContent] = useAtom(atom_liteContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const router = useRouter();

  // 1. Force Prism to recognize naked URLs
  useEffect(() => {
    if (Prism.languages.markdown) {
      Prism.languages.markdown['url'] = {
        pattern: /https?:\/\/[^\s\)\>\]]+/g,
        lookbehind: true
      };
      // Re-run highlight to catch the new token
      Prism.highlightAll();
    }
  }, []);

  const handleScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handlePointerDown = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (e.metaKey || e.ctrlKey) {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const pos = textarea.selectionStart;
      const text = textarea.value;
      
      const urlRegex = /(https?:\/\/[^\s\)\>\]]+)|\[.*?\]\((https?:\/\/[^\s\)]+)\)/g;
      let match;
      
      while ((match = urlRegex.exec(text)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        
        if (pos >= start && pos <= end) {
          const url = match[2] || match[1];
          window.open(url, '_blank', 'noopener,noreferrer');
          break;
        }
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
    <div className="min-h-screen bg-white dark:bg-[#080808] text-zinc-800 dark:text-zinc-200 selection:bg-amber-100 dark:selection:bg-sky-500/30 transition-colors">
      <main className="max-w-3xl mx-auto pt-24 pb-32 px-6">
        <div className="fixed top-6 left-6 z-30">
          <Button
            variant="bare"
            onClick={() => router.push('/dashboard/editor')} 
            styles="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all"
          >
            ← Back
          </Button>
        </div>

        <div className="relative">
          {/* VISUAL LAYER */}
          <pre
            ref={preRef}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: highlightedHTML }}
            className={`${typography} absolute inset-0 pointer-events-none overflow-hidden 
              /* Reset default Prism colors to ensure our Tailwind overrides work */
              [&_.token]:text-inherit
              
              /* NAKED URLS & MARKDOWN URLS */
              /* We use !important-style logic by being more specific */
              [&_.token.url]:text-blue-500 dark:[&_.token.url]:text-sky-400 
              [&_.token.url]:underline [&_.token.url]:underline-offset-4
              
              [&_.token.string]:text-blue-500 dark:[&_.token.string]:text-sky-400 
              [&_.token.string]:underline [&_.token.string]:underline-offset-4
              
              /* SYNTAX MUTING */
              [&_.token.punctuation]:opacity-20 
              [&_.token.operator]:opacity-20
              
              /* CONTENT STYLES */
              [&_.token.header]:font-bold [&_.token.header]:text-black dark:[&_.token.header]:text-white
              [&_.token.bold]:font-bold
              [&_.token.italic]:italic
              [&_.token.strike]:line-through [&_.token.strike]:opacity-40
              [&_.token.code]:bg-zinc-100 dark:[&_.token.code]:bg-white/5 [&_.token.code]:rounded-md [&_.token.code]:px-1
            `}
          />

          {/* INTERACTION LAYER */}
          <textarea
            id="editor"
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onScroll={handleScroll}
            onPointerDown={handlePointerDown}
            spellCheck={false}
            autoFocus
            placeholder="Write something great..."
            className={`${typography} relative w-full min-h-[75vh] bg-transparent text-transparent 
              caret-amber-500 dark:caret-sky-400 resize-none overflow-y-auto 
              focus:ring-0 focus:outline-none
              selection:text-zinc-900 dark:selection:text-zinc-50`}
          />
        </div>
      </main>

      <footer className="fixed bottom-12 left-0 right-0 flex flex-col items-center gap-3 pointer-events-none select-none">
        <div className="px-3 py-1 rounded-full border border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm shadow-sm">
            <div className="text-[9px] font-bold tracking-[0.4em] text-zinc-400 dark:text-zinc-600 uppercase">
              {content.trim() ? content.trim().split(/\s+/).length : 0} Words
            </div>
        </div>
        <div className="text-[9px] font-medium text-zinc-300 dark:text-zinc-800 uppercase tracking-widest">
          Ctrl + Click to follow links
        </div>
      </footer>
    </div>
  );
}
