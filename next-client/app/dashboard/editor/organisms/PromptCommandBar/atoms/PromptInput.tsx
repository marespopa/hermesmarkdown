"use client";

import { forwardRef } from "react";

type Props = {
  value: string;
  autoFocus?: boolean;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onFocus: () => void;
  onBlur: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  ariaLabel?: string;
};

const PromptInput = forwardRef<HTMLTextAreaElement, Props>(
  (
    {
      value,
      autoFocus = false,
      onChange,
      onFocus,
      onBlur,
      onKeyDown,
      placeholder = "Autocomplete",
      ariaLabel = "Prompt autocomplete",
    },
    ref
  ) => {
    return (
      <textarea
        ref={ref}
        rows={1}
        value={value}
        autoFocus={autoFocus}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full rounded-xl px-4 py-3 pr-12 text-base leading-tight transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:pointer-events-none select-none border bg-white text-black border-black shadow hover:bg-amber-50 focus-visible:ring-black dark:bg-neutral-700 dark:text-white dark:border-neutral-600 dark:hover:bg-neutral-800 dark:focus-visible:ring-white placeholder-neutral-500 dark:placeholder-neutral-600 resize-none"
        aria-label={ariaLabel}
      />
    );
  }
);

PromptInput.displayName = "PromptInput";

export default PromptInput;
