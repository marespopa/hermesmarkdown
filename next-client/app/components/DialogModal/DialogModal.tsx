"use client";

import React, { useEffect } from "react";
import { IoClose } from "react-icons/io5";
import Portal from "../Portal";

type Props = {
  isOpened: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  children: React.ReactNode;
  styles?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  hideCloseButton?: boolean;
};

const DialogModal = ({
  isOpened,
  onClose,
  onConfirm,
  children,
  styles = "",
  ariaLabelledBy,
  ariaDescribedBy,
  hideCloseButton = false,
}: Props) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Enter" && onConfirm) {
        const activeElement = document.activeElement;
        // Don't trigger onConfirm if focusing on a textarea or a button (browser handles button Enter)
        if (
          activeElement?.tagName === "TEXTAREA" ||
          activeElement?.tagName === "BUTTON"
        )
          return;

        onConfirm();
      }
    };

    if (isOpened) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpened, onClose, onConfirm]);

  if (!isOpened) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
        onClick={(e) => e.target === e.currentTarget && onClose()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/5 dark:bg-black/20 backdrop-blur-md animate-in fade-in duration-300" />

        {/* Modal Container */}
        <div
          className={`
            relative z-10 w-full max-w-sm
            my-auto
            bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl
            border border-white/20 dark:border-neutral-800/50
            rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.1)]
            overflow-hidden
            flex flex-col
            /* Premium "Spring" Animation */
            animate-in fade-in zoom-in-95 slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-500 ease-out
            ${styles}
          `}
        >
          {/* Close Button */}
          {!hideCloseButton && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 p-1.5 rounded-full
                        bg-neutral-200/50 dark:bg-neutral-800/50
                        hover:bg-neutral-300/80 dark:hover:bg-neutral-700/80
                        transition-all active:scale-90"
              aria-label="Close modal"
            >
              <IoClose
                size={20}
                className="text-neutral-600 dark:text-neutral-300"
              />
            </button>
          )}

          <div className="p-6 sm:p-8 text-neutral-900 dark:text-neutral-100 flex flex-col min-h-0">
            {children}
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default DialogModal;
