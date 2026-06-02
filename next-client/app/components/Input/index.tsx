import Input from "./Input.component";
import React from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  name: string;
  label: string;
  value: string;
  options: SelectOption[];
  handleChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  helperText?: string;
  compact?: boolean;
  fullWidth?: boolean;
}

export const Select = ({
  name,
  label,
  value,
  options,
  handleChange,
  helperText,
  compact = false,
  fullWidth = false,
}: SelectProps) => (
  <div className={compact ? "my-0" : "my-4"}>
    <label className="flex flex-col gap-1.5">
      <span className={compact ? "text-[13px] font-medium text-zinc-500" : "text-[13px] font-medium text-zinc-500 dark:text-zinc-400"}>{label}</span>
      <select
        className={
          compact
            ? fullWidth
              ? "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-xl font-sans px-3 py-2.5 text-[15px] h-11 w-full focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
              : "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-lg font-sans px-2 py-1 text-[13px] h-8 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
            : "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-xl font-sans px-4 py-2.5 text-[15px] h-11 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
        }
        id={name}
        name={name}
        value={value}
        onChange={handleChange}
        aria-label={label}
        style={compact && !fullWidth ? { minWidth: 120 } : {}}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-white dark:bg-zinc-900">
            {opt.label}
          </option>
        ))}
      </select>
    </label>
    {helperText && <p className="text-[12px] text-zinc-400 dark:text-zinc-500 mt-1">{helperText}</p>}
  </div>
);

export default Input;
