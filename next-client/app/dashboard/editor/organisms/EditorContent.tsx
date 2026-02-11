import { useMemo } from "react";
import MarkdownEditor from "./MarkdownEditor";
import {
  analyzePromptClarity,
} from "@/app/services/prompt-clarity";
import ClarityStatusBar from "../molecules/ClarityStatusBar";
import { StatusBarTimer } from "@/app/components/Timer/StatusBarTimer";
import { useAtom } from "jotai";
import { atom_showTimer } from "@/app/atoms/atoms";
import useIsMobile from "@/app/hooks/use-is-mobile";

interface Props {
  contentEdited: string;
  setContentEdited: (content: string) => void;
  setHasChanges: (hasChanges: boolean) => void;
  fontFamily: string;
  fontSize: string;
  searchTerm?: string;
  matchCount?: number;
  currentIndex?: number;
  zenMode?: boolean;
  onTextareaReady?: (element: HTMLTextAreaElement | null) => void;
}

export default function EditorContent({
  contentEdited,
  setContentEdited,
  setHasChanges,
  fontFamily,
  fontSize,
  searchTerm,
  matchCount,
  currentIndex,
  zenMode = false,
  onTextareaReady,
}: Props) {
  const isMobile = useIsMobile();
  const [isTimerVisible]  = useAtom(atom_showTimer);

  // Calculate word count, token estimate, and prompt clarity
  const stats = useMemo(() => {
    const words = contentEdited.split(/\s+/).filter(Boolean).length;
    const tokens = Math.ceil(words * 1.35);
    const clarity = analyzePromptClarity(contentEdited);
    return { words, tokens, clarity };
  }, [contentEdited]);

  return (
    <div
      className={`${
        zenMode
          ? "h-full overflow-y-auto w-full"
          : "flex-1 flex flex-col min-h-0 w-full mb-4"
      }`}
    >
      <div
        className={`flex-1 min-h-0 w-full px-2 py-2 flex flex-col ${
          zenMode
            ? "h-full overflow-y-auto rounded-2xl bg-white dark:bg-neutral-900 p-4"
            : "h-full max-h-[calc(100vh-240px)] overflow-hidden bg-white dark:bg-neutral-800 rounded-2xl shadow-lg border border-strongblack dark:border-white/20"
        }`}
      >
        {/* Timer docked here */}
        {!isMobile && isTimerVisible && <StatusBarTimer />}

        <div className="flex-1 overflow-auto">
          <MarkdownEditor
            value={contentEdited}
            onChange={(val) => {
              setContentEdited(val);
              setHasChanges(true);
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
        <ClarityStatusBar stats={stats} />
      </div>
    </div>
  );
}
