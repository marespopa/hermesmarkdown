"use client";

import React, { useState, useEffect, useRef } from "react";
import Button from "@/app/components/Button";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import SettingsDialog from "./components/SettingsDialog";
import { useRouter } from "next/navigation";
import { useAtom } from "jotai";
import {
  atom_content,
  atom_fontSize,
  atom_fontFamily,
} from "@/app/atoms/atoms";
import MarkdownEditor from "./components/MarkdownEditor";

export default function LiteEditor() {
  const [content, setContent] = useAtom(atom_content);
  const [fontSize] = useAtom(atom_fontSize); // e.g., "prose-base"
  const [fontFamily] = useAtom(atom_fontFamily);

  const [copied, setCopied] = useState(false);
  const [isMounting, setIsMounting] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<string | null>(null);

  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setIsMounting(false), 200);
    return () => clearTimeout(timer);
  }, []);

  // Map Tailwind Typography classes to actual text sizes for the Textarea
  const fontSizeMap: Record<string, string> = {
    "prose-sm": "text-sm",
    "prose-base": "text-base",
    "prose-lg": "text-lg",
    "prose-xl": "text-xl",
  };

  const handleCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = async () => {
    if (!content.trim()) return;
    if ("showSaveFilePicker" in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName:
            content
              .split("\n")[0]
              .replace(/[^\w\s]/gi, "")
              .slice(0, 20)
              .trim() || "untitled",
          types: [
            { description: "Markdown", accept: { "text/markdown": [".md"] } },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
      } catch (err) {
        console.error(err);
      }
    } else {
      const blob = new Blob([content], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "document.md";
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!content.trim()) setContent(text);
      else setPendingFile(text);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div className="min-h-screen transition-colors duration-300">
      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <DialogModal
        isOpened={pendingFile !== null}
        onClose={() => setPendingFile(null)}
      >
        <div className="flex flex-col gap-6 text-center py-2">
          <p className="text-sm font-medium tracking-tight">
            Overwrite current draft?
          </p>
          <div className="flex gap-2 justify-center">
            <Button
              variant="primary"
              onClick={() => {
                setContent(pendingFile!);
                setPendingFile(null);
              }}
            >
              Overwrite
            </Button>
            <Button variant="outlined" onClick={() => setPendingFile(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogModal>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".md,.txt,.markdown"
        className="hidden"
      />

      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-40 h-16 md:h-20 group">
        <div
          className={`
    flex justify-between items-center p-4 md:p-6 transition-all duration-300
    /* Reveal on hover for desktop, always show or fade-in on mobile */
    opacity-100 md:opacity-0 md:group-hover:opacity-100 
    -translate-y-0 md:-translate-y-2 md:group-hover:translate-y-0
  `}
        >
          {/* Index Button - Hidden on very small screens to save space */}
          <Button
            variant="bare"
            onClick={() => router.push("/")}
            className="text-[10px] uppercase tracking-[0.2em] opacity-50 hover:opacity-100 hidden sm:block"
          >
            ← Home
          </Button>

          {/* Mobile Back Arrow (Only visible on smallest screens) */}
          <Button
            variant="bare"
            onClick={() => router.push("/")}
            className="sm:hidden opacity-50"
          >
            ←
          </Button>

          {/* Grouped & Separated Menu */}
          <div className="flex items-center bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 rounded-full px-1.5 py-1 shadow-lg md:shadow-sm divide-x divide-neutral-200 dark:divide-neutral-800">
            {/* Import */}
            <div className="flex items-center px-0.5 md:px-1">
              <Button
                variant="bare"
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] uppercase tracking-widest opacity-60 px-2 md:px-3"
              >
                <span className="hidden md:inline">Import</span>
                <span className="md:hidden">In</span>{" "}
                {/* Or use a Lucide icon like <Upload size={14} /> */}
              </Button>
            </div>

            {/* Export */}
            <div className="flex items-center px-0.5 md:px-1">
              <Button
                variant="bare"
                onClick={handleExport}
                className="text-[10px] uppercase tracking-widest opacity-60 px-2 md:px-3"
              >
                <span className="hidden md:inline">Export</span>
                <span className="md:hidden">Out</span>
              </Button>
            </div>

            {/* Edit Actions */}
            <div className="flex items-center px-0.5 md:px-1">
              <Button
                variant="bare"
                onClick={handleCopy}
                className={`text-[10px] uppercase tracking-widest transition-colors px-2 md:px-3 ${
                  copied ? "text-blue-500 opacity-100" : "opacity-60"
                }`}
              >
                {copied ? (
                  "Done"
                ) : (
                  <>
                    <span className="hidden md:inline">Copy</span>
                    <span className="md:hidden">Zip</span>
                  </>
                )}
              </Button>
            </div>

            {/* App Actions */}
            <div className="flex items-center px-0.5 md:px-1">
              <Button
                variant="bare"
                onClick={() => setIsSettingsOpen(true)}
                className="text-[10px] uppercase tracking-widest opacity-60 px-2 md:px-3"
              >
                <span className="hidden md:inline">Settings</span>
                <span className="md:hidden">Set</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Editor */}
      <main className="max-w-screen-md mx-auto pt-8 sm:pt-16 pb-40 px-6">
        {isMounting ? (
          <div className="animate-pulse opacity-10 space-y-4">
            <div className="h-4 bg-current w-1/4 mb-10" />
            <div className="h-4 bg-current w-full" />
            <div className="h-4 bg-current w-5/6" />
          </div>
        ) : (
          <div
            key={fontFamily + fontSize}
            className="animate-in fade-in slide-in-from-bottom-2 duration-700"
          >
            <MarkdownEditor
              value={content}
              onChange={setContent}
              onTextareaReady={(ref) => {
                editorRef.current = ref;
                ref.focus();
              }}
            />
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-40 h-12 group">
        <div className="absolute inset-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800 flex items-center px-8 opacity-0 translate-y-full group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          <div className="text-[10px] font-mono tracking-[0.2em] opacity-40 uppercase">
            {wordCount} Words &nbsp;&middot;&nbsp; {content.length} Chars
          </div>
        </div>
      </footer>
    </div>
  );
}
