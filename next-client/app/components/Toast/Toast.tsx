"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Button from "@/app/components/Button/Button.component";
import { FiX } from "react-icons/fi";

type Props = {
  isVisible: boolean;
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
};

export default function Toast({
  isVisible,
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: Props) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const dismiss = () => {
    setIsClosing(true);
    setTimeout(() => setIsDismissed(true), 200);
  };

  if (!isVisible || isDismissed) return null;

  return (
    <div
      role="status"
      className={`fixed top-4 left-1/2 z-[200] w-[calc(100%-3rem)] max-w-md ${
        isClosing ? "animate-toast-out" : "animate-toast-in"
      }`}
    >
      <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-xl shadow-black/10 dark:shadow-black/30 rounded-2xl p-4 flex items-center gap-3">
        <div className="shrink-0 w-9 h-9 rounded-full bg-sage/15 text-sage flex items-center justify-center">
          {icon}
        </div>
        <div className="space-y-0.5 text-left flex-1 min-w-0">
          <p className="text-ui-footnote font-bold uppercase tracking-wider text-sage dark:text-sage">
            {title}
          </p>
          <p className="text-xs opacity-60">{description}</p>
        </div>
        <Button
          variant="primary"
          onClick={onAction}
          className="h-9 px-4 !text-ui-footnote shrink-0"
        >
          {actionLabel}
        </Button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10 hover:scale-110 active:scale-90 transition-all duration-150"
        >
          <FiX size={14} />
        </button>
      </div>
    </div>
  );
}
