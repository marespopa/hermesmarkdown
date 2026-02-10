"use client";

import { forwardRef } from "react";
import CloseButton from "../atoms/CloseButton";
import PromptInput from "../atoms/PromptInput";

type Props = {
  value: string;
  autoFocus?: boolean;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onFocus: () => void;
  onBlur: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onClose: () => void;
  placeholder?: string;
  inputAriaLabel?: string;
  closeAriaLabel?: string;
  children?: React.ReactNode;
};

const PromptInputContainer = forwardRef<HTMLTextAreaElement, Props>(
  (
    {
      value,
      autoFocus,
      onChange,
      onFocus,
      onBlur,
      onKeyDown,
      onClose,
      placeholder,
      inputAriaLabel,
      closeAriaLabel,
      children,
    },
    ref
  ) => {
    return (
      <div className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg p-2">
        <div className="relative">
          <PromptInput
            ref={ref}
            value={value}
            autoFocus={autoFocus}
            onChange={onChange}
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            ariaLabel={inputAriaLabel}
          />
          <CloseButton onClick={onClose} ariaLabel={closeAriaLabel} />
        </div>
        {children && <div className="mt-2 border-t border-neutral-200 dark:border-neutral-700 pt-2">{children}</div>}
      </div>
    );
  }
);

PromptInputContainer.displayName = "PromptInputContainer";

export default PromptInputContainer;
