"use client";

import React, { useState, useEffect, useRef } from "react";
import Button from "@/app/components/Button";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import SettingsDialog from "./components/SettingsDialog";
import { useRouter } from "next/navigation";
import { useAtom } from "jotai";
import {
  atom_fileName,
  atom_content,
  atom_fontSize,
  atom_fontFamily,
} from "@/app/atoms/atoms";
import MarkdownEditor from "./components/MarkdownEditor";

import {
  HiOutlineFolderOpen,
  HiOutlineSaveAs,
  HiOutlineClipboardCopy,
  HiOutlineCheck,
  HiOutlineCog,
  HiOutlineArrowLeft,
  HiOutlineDocumentAdd,
} from "react-icons/hi";

export default function LiteEditor() {
  const [content, setContent] = useAtom(atom_content);
  const [fileName, setFileName] = useAtom(atom_fileName);
  const [fontSize] = useAtom(atom_fontSize);
  const [fontFamily] = useAtom(atom_fontFamily);

  const [copied, setCopied] = useState(false);
  const [isMounting, setIsMounting] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewConfirmOpen, setIsNewConfirmOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<{
    text: string;
    name: string;
  } | null>(null);

  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setIsMounting(false), 200);
    return () => clearTimeout(timer);
  }, []);

  const handleNewFile = () => {
    if (content.trim()) {
      setIsNewConfirmOpen(true);
    } else {
      resetEditor();
    }
  };

  const resetEditor = () => {
    setContent("");
    setFileName("");
    setIsNewConfirmOpen(false);
    editorRef.current?.focus();
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

    const baseName =
      fileName.trim() ||
      content
        .split("\n")[0]
        .replace(/[^\w\s]/gi, "")
        .slice(0, 20)
        .trim() ||
      "untitled";

    const finalName = baseName.endsWith(".md") ? baseName : `${baseName}.md`;

    // 1. Try Desktop File System Access API
    if ("showSaveFilePicker" in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: finalName,
          types: [
            { description: "Markdown", accept: { "text/markdown": [".md"] } },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        return; // Success!
      } catch (err) {
        // User likely cancelled the picker, don't fallback to download
        if (err instanceof Error && err.name === "AbortError") return;
        console.error("Picker failed, trying fallback:", err);
      }
    }

    // 2. Try Web Share API (Better for Android/iOS)
    if (navigator.share && navigator.canShare) {
      const file = new File([content], finalName, { type: "text/markdown" });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: finalName,
          });
          return; // Success!
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") return;
          console.error("Share failed:", err);
        }
      }
    }

    // 3. Fallback: Blob Download (Triggers "file (1).md" unless Android settings are changed)
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = finalName;
    link.click();
    URL.revokeObjectURL(url);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const nameOnly = file.name.replace(/\.[^/.]+$/, "");

      if (!content.trim()) {
        setContent(text);
        setFileName(nameOnly);
      } else {
        setPendingFile({ text, name: nameOnly });
      }
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

      {/* Confirmation Modal for Overwriting via Import */}
      <DialogModal
        isOpened={pendingFile !== null}
        onClose={() => setPendingFile(null)}
      >
        <div className="flex flex-col gap-6 text-center py-2">
          <p className="text-sm font-medium tracking-tight">
            Overwrite current draft with{" "}
            <span className="italic text-blue-500">"{pendingFile?.name}"</span>?
          </p>
          <div className="flex gap-2 justify-center">
            <Button
              variant="primary"
              onClick={() => {
                if (pendingFile) {
                  setContent(pendingFile.text);
                  setFileName(pendingFile.name);
                }
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

      {/* Confirmation Modal for New File */}
      <DialogModal
        isOpened={isNewConfirmOpen}
        onClose={() => setIsNewConfirmOpen(false)}
      >
        <div className="flex flex-col gap-6 text-center py-2">
          <p className="text-sm font-medium tracking-tight">
            Are you sure you want to start a{" "}
            <span className="text-red-500">new file</span>? Any unsaved changes
            will be lost.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="primary" onClick={resetEditor}>
              Confirm New
            </Button>
            <Button
              variant="outlined"
              onClick={() => setIsNewConfirmOpen(false)}
            >
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

      <header className="fixed top-0 left-0 right-0 z-40 h-16 md:h-20 group">
        <div className="flex justify-between items-center p-4 md:p-6 transition-all duration-300 opacity-100 md:opacity-0 md:group-hover:opacity-100 -translate-y-0 md:-translate-y-2 md:group-hover:translate-y-0">
          <Button
            variant="bare"
            onClick={() => router.push("/")}
            className="text-[10px] uppercase tracking-[0.2em] opacity-50 hover:opacity-100 flex items-center gap-2"
          >
            <HiOutlineArrowLeft size={16} />
            <span className="hidden sm:inline">Home</span>
          </Button>

          <div className="flex items-center bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 rounded-full px-2 py-1.5 shadow-lg md:shadow-sm divide-x divide-neutral-200 dark:divide-neutral-800">
            {/* New File */}
            <Button
              variant="bare"
              onClick={handleNewFile}
              className="px-4 flex items-center gap-2"
              title="New File"
            >
              <HiOutlineDocumentAdd size={18} className="opacity-70" />
              <span className="text-[10px] uppercase tracking-widest hidden md:inline">
                New
              </span>
            </Button>

            {/* Import */}
            <Button
              variant="bare"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 flex items-center gap-2"
              title="Import"
            >
              <HiOutlineFolderOpen size={18} className="opacity-70" />
              <span className="text-[10px] uppercase tracking-widest hidden md:inline">
                Import
              </span>
            </Button>

            {/* Export */}
            <Button
              variant="bare"
              onClick={handleExport}
              className="px-4 flex items-center gap-2"
              title="Export"
            >
              <HiOutlineSaveAs size={18} className="opacity-70" />
              <span className="text-[10px] uppercase tracking-widest hidden md:inline">
                Export
              </span>
            </Button>

            {/* Copy */}
            <Button
              variant="bare"
              onClick={handleCopy}
              className="px-4 flex items-center gap-2"
              title="Copy to Clipboard"
            >
              {copied ? (
                <HiOutlineCheck size={18} className="text-green-500" />
              ) : (
                <HiOutlineClipboardCopy size={18} className="opacity-70" />
              )}
              <span className="text-[10px] uppercase tracking-widest hidden md:inline">
                {copied ? "Done" : "Copy"}
              </span>
            </Button>

            {/* Settings */}
            <Button
              variant="bare"
              onClick={() => setIsSettingsOpen(true)}
              className="px-4 flex items-center gap-2"
              title="Settings"
            >
              <HiOutlineCog size={18} className="opacity-70" />
              <span className="text-[10px] uppercase tracking-widest hidden md:inline">
                Settings
              </span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-md mx-auto pt-16 sm:pt-20 pb-40 px-6">
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
                // Only auto-focus if we aren't waiting for a dialog
                if (!isNewConfirmOpen && !pendingFile) ref.focus();
              }}
            />
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none group pb-6 md:pb-10">
        <div className="flex justify-center md:justify-end md:px-12 transition-all duration-500 opacity-100 md:opacity-0 md:group-hover:opacity-100 translate-y-0 md:translate-y-4 md:group-hover:translate-y-0">
          <div className="pointer-events-auto flex items-center gap-6 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 rounded-full px-6 py-2.5 shadow-lg shadow-neutral-200/20 dark:shadow-black/20">
            {/* Word/Char Count */}
            <div className="text-[9px] md:text-[10px] font-mono tracking-[0.2em] opacity-50 uppercase whitespace-nowrap">
              <span className="text-blue-500 font-bold">{wordCount}</span> Words
              <span className="mx-2 opacity-20">&middot;</span>
              <span className="text-blue-500 font-bold">
                {content.length}
              </span>{" "}
              Chars
            </div>

            {/* File Name Divider */}
            <div className="w-[1px] h-3 bg-neutral-200 dark:bg-neutral-800 hidden sm:block" />

            {/* File Name */}
            <div className="text-[9px] md:text-[10px] font-mono tracking-[0.2em] opacity-50 uppercase truncate max-w-[120px] md:max-w-[200px] hidden sm:block">
              {fileName || "untitled"}.md
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
