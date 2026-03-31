"use client";

import React, { useState } from "react";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { useAtom } from "jotai";
import {
  atom_liteContent,
  atom_fontSize,
  atom_fontFamily,
} from "@/app/atoms/atoms";
import MarkdownEditor from "@/app/dashboard/editor/organisms/MarkdownEditor";

export default function LiteEditor() {
  const [content, setContent] = useAtom(atom_liteContent);
  const [fontSize] = useAtom(atom_fontSize);
  const [fontFamily] = useAtom(atom_fontFamily);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy!", err);
    }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] text-zinc-800 dark:text-zinc-200 transition-colors selection:bg-zinc-900/10 dark:selection:bg-zinc-100/20">
      {/* Top Navigation */}
      <header className="fixed top-0 left-0 right-0 z-30 flex justify-between items-center p-6 pointer-events-none">
        <div className="pointer-events-auto bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl px-2 py-1 shadow-sm">
          <Button
            variant="bare"
            onClick={() => router.push("/dashboard/editor")}
            className="text-xs font-medium opacity-60 hover:opacity-100 transition-opacity"
          >
            ← back
          </Button>
        </div>

        <div className="flex gap-2 pointer-events-auto bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl px-2 py-1 shadow-sm">
          <Button
            variant="bare"
            onClick={handleCopy}
            className="text-xs font-medium opacity-60 hover:opacity-100 transition-opacity"
          >
            {copied ? "copied!" : "copy_text"}
          </Button>
        </div>
      </header>

      {/* Editor Surface */}
      <main className="max-w-2xl mx-auto pt-32 pb-40 px-6">
        <div className="relative w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
          <MarkdownEditor
            value={content}
            onChange={(value) => setContent(value)}
            fontFamily={fontFamily}
            fontSize={fontSize}
            onTextareaReady={() => {}}
          />
        </div>
      </main>

      {/* Subtle Status Bar */}
      <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30">
        <div className="px-4 py-1.5 rounded-full border border-zinc-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md shadow-sm">
          <div className="text-[10px] font-medium tracking-widest text-zinc-400 dark:text-zinc-500 uppercase flex items-center gap-4">
            <span>{wordCount} words</span>
            <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <span>{content.length} characters</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
