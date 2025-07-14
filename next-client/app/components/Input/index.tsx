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
    <label className="flex flex-col">
      <span className={compact ? "text-xs font-mono font-semibold mb-1" : "text-black dark:text-white font-mono font-bold text-sm"}>{label}</span>
      <select
        className={
          compact
            ? fullWidth
              ? "bg-white dark:bg-gray-900 text-black dark:text-white border border-gray-400 dark:border-gray-600 rounded-none font-mono px-3 py-2 mb-0 text-base h-12 w-full"
              : "bg-white dark:bg-gray-900 text-black dark:text-white border border-gray-400 dark:border-gray-600 rounded-none font-mono px-1 py-1 mb-0 text-sm h-9"
            : "bg-white dark:bg-gray-900 text-black dark:text-white border border-gray-400 dark:border-gray-600 rounded-none font-mono px-2 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-emerald-600"
        }
        id={name}
        name={name}
        value={value}
        onChange={handleChange}
        aria-label={label}
        style={compact && !fullWidth ? { minWidth: 120, maxHeight: 36 } : {}}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
    {helperText && <p className="text-gray-500 dark:text-gray-400 text-xs">{helperText}</p>}
  </div>
);

export default Input;
