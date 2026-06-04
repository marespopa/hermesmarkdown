"use client";
import React from "react";
import { useAtom } from "jotai";
import { atom_fontFamily } from "@/app/atoms/atoms";

interface Props {
  isVisible: boolean;
  text?: string;
}

const LoadingOverlay = ({ isVisible, text = "Loading..." }: Props) => {
  const [fontFamily] = useAtom(atom_fontFamily);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#fcfcfc] dark:bg-[#111111] transition-opacity duration-500 antialiased"
      style={{ fontFamily }}
      role="alert"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-6">
        {/* Minimalist Progress Bar instead of a Spinner */}
        <div className="w-48 h-[2px] bg-zinc-200 dark:bg-zinc-800 overflow-hidden relative">
          <div className="absolute inset-0 bg-blue-500 animate-[loading_1.5s_infinite_ease-in-out]" />
        </div>

        {/* Monospaced, tracked-out text */}
        <span className="text-ui-footnote uppercase tracking-[0.4em] text-zinc-400 dark:text-zinc-500 animate-pulse">
          {text}
        </span>
      </div>

      {/* Tailwind animation extension in a style tag or your global CSS */}
      <style jsx global>{`
        @keyframes loading {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
};

export default LoadingOverlay;
