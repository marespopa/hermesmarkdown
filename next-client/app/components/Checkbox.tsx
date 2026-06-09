"use client";

import React from "react";

interface CheckboxProps {
  name: string;
  label: string;
  checked: boolean;
  helperText?: string;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Checkbox = ({
  name,
  label,
  checked,
  helperText,
  handleChange,
}: CheckboxProps) => {
  return (
    <div className="my-4 group">
      <label className="flex items-start gap-3 cursor-pointer select-none">
        <div className="relative flex items-center mt-0.5">
          <input
            type="checkbox"
            id={name}
            name={name}
            checked={checked}
            onChange={handleChange}
            className="peer sr-only"
            aria-label={label}
          />
          {/* Custom Checkbox UI */}
          <div className={`
            w-5 h-5 rounded-[6px] border-2 transition-all duration-200
            flex items-center justify-center
            ${checked 
              ? 'bg-sage border-sage dark:bg-sage dark:border-sage' 
              : 'bg-paper-light border-beige dark:bg-paper-dark-surface dark:border-clay group-hover:border-stone dark:group-hover:border-fg-faint'}
            peer-focus-visible:ring-4 peer-focus-visible:ring-sage/20
          `}>
            {checked && (
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="white" 
                strokeWidth="3.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="w-3.5 h-3.5"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        </div>
        
        <div className="flex flex-col">
          <span className="text-ui-subhead font-medium text-ink-light dark:text-ink-dark leading-tight">
            {label}
          </span>
          {helperText && (
            <p className="text-ui-caption text-ink-muted dark:text-stone mt-1 leading-snug">
              {helperText}
            </p>
          )}
        </div>
      </label>
    </div>
  );
};

export default Checkbox;
