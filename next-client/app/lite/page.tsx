"use client";

import React, { useRef, useEffect } from "react";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const handleTextareaReady = () => {};

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-900 text-zinc-800 dark:text-zinc-200 transition-colors">
      <main className="max-w-3xl mx-auto pt-24 pb-32 px-6">
        <div className="fixed top-6 left-6 z-30">
          <Button
            variant="bare"
            onClick={() => router.push("/dashboard/editor")}
          >
            ← back_to_editor
          </Button>
        </div>

        <div className="relative w-full">
          <MarkdownEditor
            value={content}
            onChange={(value) => setContent(value)}
            fontFamily={fontFamily}
            fontSize={fontSize}
            onTextareaReady={handleTextareaReady}
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
