"use client";

import React, { forwardRef } from "react";
import { FIELD_SURFACE } from "./field-styles";

interface Props extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  name: string;
  label?: string;
  value: string | number | undefined;
  placeholder?: string;
  helperText?: string;
  handleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
  // Classes for the <textarea> itself (`className` styles the wrapper).
  textareaClassName?: string;
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
      textareaClassName = "",
      autoFocus,
      autoComplete = "off",
      ...rest
    },
    ref,
  ) => {
    // The field look (field-styles.ts), grown to fit several lines.
    const baseStyles = `${FIELD_SURFACE} w-full px-3.5 py-2.5 text-ui-subhead rounded-[10px] min-h-[120px] resize-y`;

    return (
      <div className={`flex flex-col gap-1.5 my-2 w-full ${className}`}>
        {label && (
          <label
            htmlFor={name}
            className="text-ui-footnote font-medium text-fg-muted px-0.5"
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
            className={`${baseStyles} select-text ${textareaClassName}`}
            aria-label={label || name}
            autoFocus={autoFocus}
            {...rest}
          />
        </div>

        {helperText && (
          <p className="text-ui-caption text-fg-faint px-0.5">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";

export default Textarea;
