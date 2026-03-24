'use client';

import React, { useRef, useEffect } from 'react';
import Button from '@/app/components/Button';
import Prism from 'prismjs';
import { useRouter } from 'next/navigation';
import { useAtom } from 'jotai';
import { atom_liteContent, atom_fontSize, atom_fontFamily } from '@/app/atoms/atoms';

// Language Imports - Add any others you need (e.g., javascript, python)
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-bash';

export default function LiteEditor() {
  const [content, setContent] = useAtom(atom_liteContent);
  const [fontSize] = useAtom(atom_fontSize);
  const [fontFamily] = useAtom(atom_fontFamily);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (Prism.languages.markdown) {

      Prism.languages.markdown['url'] = {
        pattern: /https?:\/\/[^\s\)\>\]]+/g,
        lookbehind: true
      };

      Prism.languages.insertBefore('markdown', 'title', {
        'h6': { pattern: /^######\s+.+$/m, alias: 'important' },
        'h5': { pattern: /^#####\s+.+$/m, alias: 'important' },
        'h4': { pattern: /^####\s+.+$/m, alias: 'important' },
        'h3': { pattern: /^###\s+.+$/m, alias: 'important' },
        'h2': { pattern: /^##\s+.+$/m, alias: 'important' },
        'h1': { pattern: /^#\s+.+$/m, alias: 'important' },
      });

      Prism.highlightAll();
    }
  }, [content]); 

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
        if (pos >= match.index && pos <= match.index + match[0].length) {
          window.open(match[2] || match[1], '_blank', 'noopener,noreferrer');
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

  // CRITICAL: These must be identical for alignment
  const sharedStyles = `${fontFamily} ${fontSize} text-lg leading-7 tracking-tight whitespace-pre-wrap break-words p-0 m-0 border-none outline-none antialiased`;

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-900 text-zinc-800 dark:text-zinc-200 transition-colors">
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

        <div className="relative w-full">
          {/* VISUAL LAYER */}
          <pre
            ref={preRef}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: highlightedHTML }}
            className={`${sharedStyles} absolute inset-0 pointer-events-none overflow-hidden 
              [&_.token]:text-inherit [&_.token]:font-normal
              
              /* HEADINGS */
              [&_.token.h1]:font-black [&_.token.h1]:text-black dark:[&_.token.h1]:text-white
              [&_.token.h2]:font-extrabold [&_.token.h2]:text-zinc-900 dark:[&_.token.h2]:text-zinc-100
              [&_.token.h3]:font-bold
              [&_.token.h4]:font-semibold
              [&_.token.important_.punctuation]:opacity-30

              /* CODE BLOCKS - Fixed Bold Issue */
              [&_.token.code]:bg-zinc-100 dark:[&_.token.code]:bg-white/5 [&_.token.code]:rounded-sm
              [&_.token.code-snippet]:text-amber-600 dark:[&_.token.code-snippet]:text-sky-400
              /* Ensure code block content isn't forced bold by .important alias */
              [&_.token.code_.token]:font-normal

              /* LINKS & SELECTION */
              [&_.token.url]:text-blue-500 [&_.token.url]:underline [&_.token.url]:underline-offset-4
              [&_.token.string]:text-blue-500
              
              /* PUNCTUATION MUTING */
              [&_.token.punctuation]:opacity-30 
              [&_.token.operator]:opacity-30
              [&_.token.blockquote]:italic [&_.token.blockquote]:opacity-60
            `}
          />

          {/* INTERACTION LAYER */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onScroll={handleScroll}
            onPointerDown={handlePointerDown}
            spellCheck={false}
            autoFocus
            placeholder="Start writing..."
            className={`${sharedStyles} relative w-full min-h-[75vh] bg-transparent text-transparent 
              caret-amber-500 dark:caret-sky-400 resize-none overflow-y-auto 
              focus:ring-0 focus:outline-none
              selection:bg-amber-100/50 dark:selection:bg-sky-500/30 selection:text-transparent`}
          />
        </div>
      </main>

      <footer className="fixed bottom-12 left-0 right-0 flex flex-col items-center gap-3 pointer-events-none select-none">
        <div className="px-3 py-1 rounded-full border border-zinc-100 dark:border-zinc-700 bg-white/50 dark:bg-zinc-700/50 backdrop-blur-sm shadow-sm">
            <div className="text-[9px] font-bold tracking-[0.4em] text-zinc-400 dark:text-zinc-500 uppercase">
              {content.trim() ? content.trim().split(/\s+/).length : 0} Words
            </div>
        </div>
      </footer>
    </div>
  );
}
