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
              ? 'bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500' 
              : 'bg-white border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700 group-hover:border-zinc-400 dark:group-hover:border-zinc-600'}
            peer-focus-visible:ring-4 peer-focus-visible:ring-blue-500/20
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
          <span className="text-[14px] font-medium text-zinc-900 dark:text-zinc-100 leading-tight">
            {label}
          </span>
          {helperText && (
            <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
              {helperText}
            </p>
          )}
        </div>
      </label>
    </div>
  );
};

export default Checkbox;
