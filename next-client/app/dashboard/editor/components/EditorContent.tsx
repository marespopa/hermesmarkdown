import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SetStateAction, useAtom } from "jotai";

import Loading from "@/app/components/Loading/Loading";
import MarkdownPreview from "../../components/MarkdownPreview";
import ExportService from "@/app/services/export-service";
import { useCommand } from "@/app/hooks/use-command";
import { FileMetadata } from "@/app/types/markdown";
import { SetAtom } from "../EditorTypes";

import EditorTextarea from "./EditorTextarea";
import { FaColumns, FaEye, FaPen } from "react-icons/fa";
import clsx from "clsx";
import { atom_panelState } from "@/app/atoms/atoms";

interface Props {
  contentEdited: string;
  frontMatter: FileMetadata;
  setContentEdited: SetAtom<[SetStateAction<string>], void>;
  setHasChanges: (hasChanges: boolean) => void;
}


export default function EditorContent({
  contentEdited,
  setContentEdited,
  frontMatter,
  setHasChanges,
}: Props) {
  // For draggable divider
  const [editorWidth, setEditorWidth] = useState(50); // percent
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [panelState, setPanelState] = useAtom(atom_panelState);
  const markdownRef = useRef<HTMLDivElement>(null);
  const editorPaneRef = useRef<HTMLDivElement>(null);
  const previewPaneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useCommand("save", () =>
    ExportService.exportMarkdown(contentEdited, frontMatter)
  );

  useCommand("home", () => {
    setIsMounted(false);
    router.push("/dashboard");
  });

  if (!isMounted) {
    return <Loading />;
  }

  // --- Scroll sync logic ---
  function handleEditorScroll() {
    if (!editorPaneRef.current || !previewPaneRef.current) return;
    const editor = editorPaneRef.current;
    const preview = previewPaneRef.current;
    const percent = editor.scrollTop / (editor.scrollHeight - editor.clientHeight);
    preview.scrollTop = percent * (preview.scrollHeight - preview.clientHeight);
  }

  return (
    <div className="flex flex-col gap-4 editor-area max-height-[1000px] h-full min-h-screen flex-1">
      {/* Panels */}
      {panelState === "both" ? (
        <div
          className="w-full relative flex flex-row transition ease-in-out h-full min-h-[400px] flex-1"
          ref={containerRef}
        >
          <div
            className={editorPaneClass}
            style={{ flexBasis: `${editorWidth}%`, flexShrink: 0 }}
            ref={editorPaneRef}
            onScroll={handleEditorScroll}
          >
            {renderEditor()}
          </div>
          {/* Minimalist Draggable Divider */}
          <div
            className={dividerClass}
            style={{ zIndex: 10 }}
            onMouseDown={startResizing}
            onTouchStart={startResizingTouch}
          />
          <div
            className={previewPaneClass}
            style={{ flexBasis: `${100 - editorWidth}%`, flexShrink: 0 }}
            ref={previewPaneRef}
          >
            {renderPreview()}
          </div>
        </div>
      ) : (
        <div className="w-full relative h-full min-h-[400px] flex-1">
          {(() => {
            switch (panelState) {
              case "editor":
                return renderEditor();
              case "preview":
                return renderPreview();
              default:
                return null;
            }
          })()}
        </div>
      )}
    </div>
  );

  function renderPreview() {
    return (
      <div className={previewPaneClass} id="pdfExport">
        <div ref={markdownRef} id="previewId" className="p-4">
          <MarkdownPreview content={contentEdited} />
        </div>
      </div>
    );
  }

  function renderEditor() {
    return (
      <EditorTextarea
        contentEdited={contentEdited}
        setContentEdited={(newContent) => {
          setContentEdited(newContent); // Update content
          setHasChanges(true); // Mark changes as true
        }}
        onCursorChange={handleCursorLineChange}
      />
    );
  }

  function handleCursorLineChange(lineText: string) {
    if (!previewPaneRef.current) return;
    // Find the first element with data-line attribute containing the lineText
    const preview = previewPaneRef.current;
    const el = Array.from(preview.querySelectorAll('[data-line]')).find((el) => {
      return el.textContent?.includes(lineText.trim());
    });
    if (el && typeof (el as HTMLElement).scrollIntoView === 'function') {
      (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // --- Resizing logic ---
  function startResizing(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", handleResizing);
    document.addEventListener("mouseup", stopResizing);
  }

  function handleResizing(e: MouseEvent) {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let percent = (x / rect.width) * 100;
    percent = Math.max(15, Math.min(85, percent));
    setEditorWidth(percent);
  }

  function stopResizing() {
    setIsResizing(false);
    document.body.style.userSelect = "";
    document.removeEventListener("mousemove", handleResizing);
    document.removeEventListener("mouseup", stopResizing);
  }

  // Touch support
  function startResizingTouch(e: React.TouchEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.userSelect = "none";
    document.addEventListener("touchmove", handleResizingTouch, { passive: false });
    document.addEventListener("touchend", stopResizingTouch);
  }

  function handleResizingTouch(e: TouchEvent) {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let x = e.touches[0].clientX - rect.left;
    let percent = (x / rect.width) * 100;
    percent = Math.max(15, Math.min(85, percent));
    setEditorWidth(percent);
  }

  function stopResizingTouch() {
    setIsResizing(false);
    document.body.style.userSelect = "";
    document.removeEventListener("touchmove", handleResizingTouch);
    document.removeEventListener("touchend", stopResizingTouch);
  }
}

const editorPaneClass =
  "h-full min-w-0 min-w-[100px] overflow-auto flex-1 bg-white py-4 font-mono text-base dark:bg-gray-900 dark:text-white";
const previewPaneClass =
  "h-full min-w-0 min-w-[100px] overflow-auto flex-1 bg-gray-50 px-6 py-4 font-sans prose dark:bg-gray-900 dark:prose-invert";
const dividerClass =
  "w-[2px] bg-gray-200 hover:bg-gray-400 rounded transition-colors duration-150 cursor-col-resize relative z-20 dark:bg-gray-700";
