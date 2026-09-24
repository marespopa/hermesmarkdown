"use client";

import Button from "@/app/components/Button";
import { HiMicrophone, HiOutlineMicrophone } from "react-icons/hi";

interface EditorWindowHeaderProps {
  title: string;
  isVoiceSupported?: boolean;
  isVoiceListening?: boolean;
  onToggleVoice?: () => void;
}

export default function EditorWindowHeader({
  title,
  isVoiceSupported = false,
  isVoiceListening = false,
  onToggleVoice,
}: EditorWindowHeaderProps) {
  return (
    <div className="h-10 shrink-0 bg-paper-light dark:bg-paper-dark border-b border-black/5 dark:border-white/10 flex items-center px-4 gap-2">
      <div className="flex gap-1.5" aria-hidden="true">
        <div className="w-3 h-3 rounded-full bg-red-400/20 border border-red-400/30" />
        <div className="w-3 h-3 rounded-full bg-amber-400/20 border border-amber-400/30" />
        <div className="w-3 h-3 rounded-full bg-green-400/20 border border-green-400/30" />
      </div>
      <div className="flex-1 text-ui-footnote font-mono opacity-30 text-center pr-10 overflow-hidden text-ellipsis whitespace-nowrap">
        {title}
      </div>
      {isVoiceSupported && onToggleVoice && (
        <Button
          variant="icon"
          onClick={onToggleVoice}
          aria-label={isVoiceListening ? "Stop voice input" : "Start voice input"}
          aria-pressed={isVoiceListening}
          title="Voice input"
          className={`shrink-0 w-7 h-7 rounded-lg ${
            isVoiceListening
              ? "text-sage bg-sage/10"
              : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          }`}
        >
          {isVoiceListening ? <HiMicrophone size={14} /> : <HiOutlineMicrophone size={14} />}
        </Button>
      )}
    </div>
  );
}
