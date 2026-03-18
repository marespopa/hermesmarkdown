import { useMemo } from "react";
import MarkdownEditor from "./MarkdownEditor";
import {
  analyzePromptClarity,
  getEstimatedTokens,
} from "@/app/services/prompt-clarity";
import EditorStatusBar from "../molecules/EditorStatusBar";
import useIsMobile from "@/app/hooks/use-is-mobile";
import { useAtom } from "jotai";
import { atom_zenMode} from "@/app/atoms/atoms";

interface Props {
  contentEdited: string;
  setContentEdited: (content: string) => void;
  fontFamily: string;
  fontSize: string;
  searchTerm?: string;
  matchCount?: number;
  currentIndex?: number;
  onTextareaReady?: (element: HTMLTextAreaElement | null) => void;
}

export default function EditorContent({
  contentEdited,
  setContentEdited,
  fontFamily,
  fontSize,
  searchTerm,
  matchCount,
  currentIndex,
  onTextareaReady,
}: Props) {
  const isMobile = useIsMobile();
  const [zenMode] = useAtom(atom_zenMode);
  // Calculate word count, token estimate, and prompt clarity
  const stats = useMemo(() => {
    const words = contentEdited.split(/\s+/).filter(Boolean).length;
    const tokens = getEstimatedTokens(contentEdited);
    const clarity = analyzePromptClarity(contentEdited);
    return { words, tokens, clarity };
  }, [contentEdited]);

  return (
    <div
      className={`${
        zenMode
          ? "fixed h-full overflow-y-auto w-full top-0 left-0 p-4"
          : "flex-1 flex flex-col min-h-0 w-full mb-4"
      } scroll-smooth overscroll-contain `}
    >
      <div
        className={`flex-1 min-h-0 w-full px-2 py-2 flex flex-col h-full bg-white dark:bg-neutral-900 shadow-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden relative ${
          zenMode
            ? "rounded-xl p-4 overflow-y-auto"
            : "max-h-[calc(100vh-300px)] rounded-xl"
        }`}
      >
        <div className="flex-1 overflow-auto">
          <MarkdownEditor
            value={contentEdited}
            onChange={(val) => {
              setContentEdited(val);
            }}
            fontFamily={fontFamily}
            fontSize={fontSize}
            searchTerm={searchTerm}
            matchCount={matchCount}
            currentIndex={currentIndex}
            onTextareaReady={onTextareaReady}
          />
        </div>

        {/* Status Bar */}
        <EditorStatusBar stats={stats} />
      </div>
    </div>
  );
}
