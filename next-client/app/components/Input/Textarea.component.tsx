"use client";

import React, { forwardRef } from "react";

interface Props extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  name: string;
  label?: string;
  value: string | number | undefined;
  placeholder?: string;
  helperText?: string;
  handleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
  autoFocus?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, Props>(
  (
    {
      name,
      label,
      value,
      placeholder,
      helperText,
      handleChange,
      className = "",
      autoFocus,
      autoComplete = "off",
      ...rest
    },
    ref,
  ) => {
    const baseStyles =
      "w-full px-4 py-2.5 text-ui-subhead font-sans transition-all duration-150 ease-in-out border rounded-xl outline-none min-h-[120px] resize-y";

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
          <textarea
            id={name}
            name={name}
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            ref={ref}
            autoComplete={autoComplete}
            className={`${baseStyles} ${variantStyles} select-text`}
            aria-label={label || name}
            autoFocus={autoFocus}
            {...rest}
          />
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

Textarea.displayName = "Textarea";

export default Textarea;
