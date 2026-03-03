"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import MarkdownEditor from "../../../dashboard/editor/organisms/MarkdownEditor";
import { useAtom } from "jotai";
import { atom_fontFamily, atom_fontSize } from "@/app/atoms/atoms";
import EditorStatusBar from "@/app/dashboard/editor/molecules/EditorStatusBar";
import {
  analyzePromptClarity,
  getEstimatedTokens,
} from "@/app/services/prompt-clarity";
import { usePromptMenu } from "@/app/dashboard/editor/hooks/use-prompt-menu";
import PromptCommandBar from "@/app/dashboard/editor/organisms/PromptCommandBar";

const DEMO_CONTENT = `# Task
Review the following API endpoint for security vulnerabilities.

## Constraints
- MUST check for SQL injection, XSS, and auth bypass
- MUST provide severity rating for each issue
- Do not include false positives or non-issues

## Output Format
Return as a markdown list with severity, issue, and fix.
`;

interface DemoEditorProps {
  className?: string;
}

export default function DemoEditor({ className = "" }: DemoEditorProps) {
  const [content, setContent] = useState(DEMO_CONTENT);
  const [fontSize] = useAtom(atom_fontSize);
  const [fontFamily] = useAtom(atom_fontFamily);
  const editorRef = useRef<HTMLDivElement>(null);

  const { menuPosition, handleTextareaReady, closePromptMenu, insertTemplate } =
    usePromptMenu({
      contentEdited: content,
      updateCurrentFileContent: setContent,
    });

  const handleInsertTemplate = useCallback(
    (template: string) => {
      insertTemplate(template);
    },
    [insertTemplate],
  );

  const handleClosePromptCommandBar = useCallback(() => {
    closePromptMenu({ removeSlash: true });
    requestAnimationFrame(() => {
      const textarea = document.getElementById(
        "markdown-editor",
      ) as HTMLTextAreaElement | null;
      textarea?.focus({ preventScroll: true });
    });
  }, [closePromptMenu]);

  // Calculate word count, token estimate, and prompt clarity
  const clarityStats = useMemo(() => {
    const words = content.split(/\s+/).filter(Boolean).length;
    const tokens = getEstimatedTokens(content);
    const clarity = analyzePromptClarity(content);
    return { words, tokens, clarity };
  }, [content]);

  return (
    <div
      ref={editorRef}
      className={`bg-white pb-2 dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden relative ${className}`}
    >
      {/* Editor Header */}
      <div className="bg-neutral-100 dark:bg-neutral-800 px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="ml-2 text-sm text-neutral-500 dark:text-neutral-400 font-mono">
            security-review.md
          </span>
        </div>
        <div className="text-xs text-neutral-400 dark:text-neutral-500">
          Try typing{" "}
          <kbd className="px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded text-[10px]">
            /
          </kbd>{" "}
          below on an empty row
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <MarkdownEditor
          value={content}
          onChange={(value) => setContent(value)}
          fontFamily={fontFamily}
          fontSize={fontSize}
          onTextareaReady={handleTextareaReady}
        />
        {/* Prompt Command Bar */}
        {menuPosition.visible && (
          <div
            style={{
              position: "fixed",
              top: menuPosition.top,
              left: menuPosition.left,
              zIndex: 50,
              pointerEvents: "auto",
              minWidth: 320,
              maxWidth: 420,
            }}
          >
            <PromptCommandBar
              contentEdited={content}
              onInsertTemplate={handleInsertTemplate}
              isCompact
              showInput
              forceOpen
              autoFocus
              initialPrompt="/"
              onRequestClose={handleClosePromptCommandBar}
            />
          </div>
        )}
      </div>
      <EditorStatusBar stats={clarityStats} />
    </div>
  );
}
