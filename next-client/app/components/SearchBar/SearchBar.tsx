"use client";

import React, { forwardRef } from "react";
import { HiOutlineSearch, HiX } from "react-icons/hi";

export type SearchBarVariant = "default" | "floating";
export type SearchBarSize = "sm" | "md" | "lg";

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  variant?: SearchBarVariant;
  size?: SearchBarSize;
  className?: string;
  isLoading?: boolean;
  shortcut?: string;
}

const SIZE = {
  sm: {
    wrapper:      "h-8",
    padLeft:      "pl-8",
    padRight:     "pr-8",
    padX:         "px-2.5",
    inputText:    "text-ui-footnote",
    iconLeft:     "left-2.5",
    iconRight:    "right-2",
    iconSize:     14,
    shortcutText: "text-ui-caption",
  },
  md: {
    wrapper:      "h-10",
    padLeft:      "pl-10",
    padRight:     "pr-10",
    padX:         "px-3",
    inputText:    "text-ui-subhead",
    iconLeft:     "left-3",
    iconRight:    "right-2.5",
    iconSize:     16,
    shortcutText: "text-ui-footnote",
  },
  lg: {
    wrapper:      "h-12",
    padLeft:      "pl-11",
    padRight:     "pr-11",
    padX:         "px-4",
    inputText:    "text-ui-callout",
    iconLeft:     "left-3.5",
    iconRight:    "right-3",
    iconSize:     18,
    shortcutText: "text-ui-footnote",
  },
} as const;

const VARIANT_CLASSES: Record<SearchBarVariant, string> = {
  default:
    "bg-zinc-50 dark:bg-zinc-800/50 " +
    "border border-zinc-200 dark:border-zinc-700 " +
    "rounded-full " +
    "focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/40 " +
    "transition-all duration-200 ease-out",

  floating:
    "bg-white/80 dark:bg-zinc-900/80 " +
    "backdrop-blur-xl " +
    "border border-white/20 dark:border-zinc-800/50 " +
    "shadow-2xl " +
    "rounded-2xl " +
    "focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/40 " +
    "transition-all duration-200 ease-out " +
    "animate-fade-in",
};

const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  (
    {
      value,
      onChange,
      onSearch,
      onClear,
      placeholder = "Search…",
      autoFocus,
      variant = "default",
      size = "md",
      className = "",
      isLoading = false,
      shortcut,
    },
    ref,
  ) => {
    const s = SIZE[size];
    const hasRightSlot = !!(value || shortcut);

    const handleClear = () => {
      onChange("");
      onClear?.();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        onSearch?.(value);
      } else if (e.key === "Escape" && value) {
        e.preventDefault();
        handleClear();
      }
    };

    return (
      <div
        className={`relative flex items-center w-full ${s.wrapper} ${VARIANT_CLASSES[variant]} ${className}`}
      >
        <span
          aria-hidden="true"
          className={`absolute ${s.iconLeft} top-1/2 -translate-y-1/2 pointer-events-none flex items-center text-zinc-400 dark:text-zinc-500`}
        >
          {isLoading ? (
            <span
              className="block rounded-full border-2 border-zinc-300 dark:border-zinc-600 border-t-blue-500 animate-spin"
              style={{ width: s.iconSize, height: s.iconSize }}
            />
          ) : (
            <HiOutlineSearch size={s.iconSize} />
          )}
        </span>

        <input
          ref={ref}
          type="text"
          role="searchbox"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label={placeholder}
          className={[
            "flex-1 h-full bg-transparent outline-none border-none",
            "text-zinc-900 dark:text-zinc-100",
            "placeholder:text-zinc-400 dark:placeholder:text-zinc-500",
            "font-sans",
            s.inputText,
            s.padLeft,
            hasRightSlot ? s.padRight : s.padX,
          ].join(" ")}
        />

        {value ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={handleClear}
            aria-label="Clear search"
            className={`absolute ${s.iconRight} top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 bg-zinc-200/60 hover:bg-zinc-300/70 dark:bg-zinc-700/60 dark:hover:bg-zinc-600/70 transition-all duration-150 active:scale-90`}
          >
            <HiX size={10} />
          </button>
        ) : shortcut ? (
          <span
            aria-hidden="true"
            className={`absolute ${s.iconRight} top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-md ${s.shortcutText} font-medium text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 pointer-events-none select-none`}
          >
            {shortcut}
          </span>
        ) : null}
      </div>
    );
  },
);

SearchBar.displayName = "SearchBar";

export default SearchBar;
