"use client";

import React, { useEffect, useRef } from "react";

type Props = {
  isOpened: boolean;
  onClose: () => void;
  children: React.ReactNode;
  styles?: string;
};

const DialogModal = ({ isOpened, onClose, children, styles = "" }: Props) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (isOpened) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpened]);

  if (!isOpened) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/5 dark:bg-black/20 backdrop-blur-md animate-in fade-in duration-300" />

      <div
        className={`
          relative z-10 w-full max-w-[320px] sm:max-w-sm
          bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl
          border border-white/20 dark:border-neutral-800/50
          rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.1)]
          overflow-hidden
          flex flex-col
          /* Apple "Spring" Animation */
          animate-in fade-in zoom-in-95 slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-300 ease-out
          ${styles}
        `}
      >
        <div className="p-6 sm:p-8 text-neutral-900 dark:text-neutral-100">
          {children}
        </div>
      </div>
    </div>
  );
};

export default DialogModal;
