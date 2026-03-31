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
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpened) {
      // Capture the element that had focus before opening
      previousFocus.current = document.activeElement as HTMLElement;
      ref.current?.showModal();
      document.body.style.overflow = "hidden";
    } else {
      ref.current?.close();
      document.body.style.overflow = "unset";
      // Manually return focus to the previous element (like a button or link)
      previousFocus.current?.focus();
    }
  }, [isOpened]);

  // Handle the native HTML5 dialog "cancel" (ESC key)
  const handleCancel = (e: React.SyntheticEvent) => {
    e.preventDefault();
    onClose();
  };

  if (!isOpened) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-neutral-900/90 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <dialog
        ref={ref}
        onCancel={handleCancel}
        className={`
          relative m-0 p-0 w-[calc(100%-2rem)] max-w-sm
          bg-[#fcfcfc] dark:bg-[#1a1a1a] 
          border border-neutral-200 dark:border-neutral-800
          rounded-xl shadow-xl outline-none
          animate-in fade-in zoom-in-95 duration-150
          ${styles}
        `}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[10px] font-mono tracking-widest opacity-40 hover:opacity-100 dark:text-white"
        >
          ESC
        </button>

        <div className="p-8 text-neutral-900 dark:text-neutral-100">
          {children}
        </div>
      </dialog>
    </div>
  );
};

export default DialogModal;
