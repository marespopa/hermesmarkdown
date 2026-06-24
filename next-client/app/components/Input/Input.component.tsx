"use client";

import React, { forwardRef, useRef } from "react";
import { FaTimes } from "react-icons/fa";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string;
  label?: string;
  value: string | number | undefined;
  placeholder?: string;
  helperText?: string;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: "number" | "text" | "password";
  validation?: {
    min: number;
    max: number;
  };
  onClear?: () => void;
  debounceMs?: number;
  onDebouncedChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string; // Added to allow style overrides from forms
  autoFocus?: boolean;
  selectOnFocus?: boolean;
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
      autoFocus,
      selectOnFocus,
      autoComplete = "off",
      ...rest
    },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Merge forwarded ref with internal ref
    React.useImperativeHandle(ref, () => inputRef.current!);

    React.useEffect(() => {
      if (autoFocus && selectOnFocus && inputRef.current) {
        // Small delay to ensure the browser has finished rendering/focusing
        const timer = setTimeout(() => {
          inputRef.current?.select();
        }, 50);
        return () => clearTimeout(timer);
      }
    }, [autoFocus, selectOnFocus]);

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
      "w-full px-4 py-2.5 text-ui-subhead font-sans transition-all duration-150 ease-in-out border rounded-xl outline-none focus-visible:outline-none";

    const variantStyles =
      "bg-paper-softgray border-beige text-ink-light placeholder:text-stone " +
      "dark:bg-paper-dark-surface/50 dark:border-clay dark:text-ink-dark dark:placeholder:text-stone " +
      "focus:ring-2 focus:ring-sage/15 dark:focus:ring-sage/20";

    return (
      <div className={`flex flex-col gap-1.5 my-2 w-full ${className}`}>
        {label && (
          <label
            htmlFor={name}
            className="text-ui-footnote font-medium text-ink-muted dark:text-stone px-0.5"
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
            onPaste={(e) => {
              e.stopPropagation();
              const target = e.currentTarget;
              setTimeout(() => {
                handleInputChange({ target, currentTarget: target } as React.ChangeEvent<HTMLInputElement>);
              }, 0);
            }}
            placeholder={placeholder}
            min={validation?.min}
            max={validation?.max}
            ref={ref}
            autoComplete={autoComplete}
            className={`${baseStyles} ${variantStyles} select-text`}
            aria-label={label || name}
            autoFocus={autoFocus}
            {...rest}
          />

          {onClear && value && String(value).length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone hover:text-ink-light dark:hover:text-ink-dark p-1.5 transition-colors rounded-full hover:bg-beige/50 dark:hover:bg-clay/50"
              tabIndex={-1}
            >
              <FaTimes size={12} />
            </button>
          )}
        </div>

        {helperText && (
          <p className="text-ui-caption text-stone px-0.5">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;
