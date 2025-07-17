"use client";

import React, { useEffect, useRef } from "react";
import { FaWindowClose } from "react-icons/fa";
import Button from "../Button/Button.component";

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
      ref.current?.showModal();
      document.body.classList.add("modal-open"); // prevent bg scroll
    } else {
      ref.current?.close();
      document.body.classList.remove("modal-open");
    }
  }, [isOpened]);

  return (
    <div
      className={`${
        isOpened ? "visible" : "hidden"
      } fixed top-0 left-0 w-full h-full z-50 overflow-y-auto bg-white/90 dark:bg-neutral-800/95 flex items-center justify-center`}
    >
      <dialog
        ref={ref}
        className={`my-auto sm:h-[90vh] sm:w-[1000px] p-8 text-base bg-white border-none rounded-xl shadow-lg dark:bg-neutral-800 dark:text-white ${styles}`}
        onCancel={onClose}
      >
        <div className="relative p-4">
          <Button
            variant="icon"
            onClick={onClose}
            aria-label="Close modal"
            title="Close modal"
            className="absolute top-4 right-4 z-50"
          >
            <FaWindowClose className="w-6 h-6" />
          </Button>
          {children}
        </div>
      </dialog>
    </div>
  );
};

export default DialogModal;
