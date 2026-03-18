"use client";

import React, { forwardRef, useRef } from "react";
import { FaTimes } from "react-icons/fa";

interface Props {
  name: string;
  label?: string;
  value: string | number | undefined;
  placeholder?: string;
  helperText?: string;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: "number" | "text";
  validation?: {
    min: number;
    max: number;
  };
  onClear?: () => void;
  debounceMs?: number;
  onDebouncedChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string; // Added to allow style overrides from forms
}

const Input = forwardRef<HTMLInputElement, Props>(
  (
    {
      name,
      label,
      value,
      placeholder,
      helperText,
      handleChange,
      type = "text",
      validation,
      onClear,
      debounceMs,
      onDebouncedChange,
      className = "",
    },
    ref,
  ) => {
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      handleChange(e);
      if (!debounceMs || !onDebouncedChange) return;
      
      if (debounceRef.current) clearTimeout(debounceRef.current);
      
      const eventCopy = { ...e }; // Shallow copy for debounce
      debounceRef.current = setTimeout(() => {
        onDebouncedChange(eventCopy);
      }, debounceMs);
    };

    const baseStyles =
      "w-full px-4 py-2 text-sm font-mono lowercase tracking-tight transition-all duration-150 ease-in-out border rounded-md outline-none select-none";

    const variantStyles =
      "bg-neutral-50 border-neutral-200 text-neutral-800 placeholder:text-neutral-400 " +
      "dark:bg-sky-50/10 dark:border-sky-500/50 dark:text-sky-200 dark:placeholder:text-sky-600 " +
      "focus:ring-2 focus:ring-amber-100 dark:focus:ring-sky-500";

    return (
      <div className={`flex flex-col gap-1.5 my-2 w-full ${className}`}>
        {label && (
          <label 
            htmlFor={name}
            className="text-[12px] font-mono text-zinc-500 dark:text-zinc-500 lowercase tracking-tight px-0.5"
          >
            {label}
          </label>
        )}
        
        <div className="relative group">
          <input
            id={name}
            name={name}
            type={type}
            value={value}
            onChange={handleInputChange}
            placeholder={placeholder}
            min={validation?.min}
            max={validation?.max}
            ref={ref}
            className={`${baseStyles} ${variantStyles}`}
            aria-label={label || name}
          />

          {onClear && value && String(value).length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 p-1 transition-colors"
              tabIndex={-1}
            >
              <FaTimes size={10} />
            </button>
          )}
        </div>

        {helperText && (
          <p className="text-[11px] font-mono text-zinc-400 dark:text-zinc-600 px-0.5 italic">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;
