import Input from "./Input.component";
import Textarea from "./Textarea.component";
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

export { Textarea };
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
      <span className={compact ? "text-ui-footnote font-medium text-zinc-500" : "text-ui-footnote font-medium text-zinc-500 dark:text-zinc-400"}>{label}</span>
      <select
        className={
          compact
            ? fullWidth
              ? "bg-paper-softgray dark:bg-paper-dark-surface/50 text-ink-light dark:text-ink-dark border border-edge rounded-xl font-sans px-3 py-2.5 text-ui-subhead h-11 w-full focus:ring-4 focus:ring-sage/10 outline-none transition-all"
              : "bg-paper-softgray dark:bg-paper-dark-surface/50 text-ink-light dark:text-ink-dark border border-edge rounded-lg font-sans px-2 py-1 text-ui-footnote h-8 focus:ring-4 focus:ring-sage/10 outline-none transition-all"
            : "bg-paper-softgray dark:bg-paper-dark-surface/50 text-ink-light dark:text-ink-dark border border-edge rounded-xl font-sans px-4 py-2.5 text-ui-subhead h-11 focus:ring-4 focus:ring-sage/10 outline-none transition-all"
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
    {helperText && <p className="text-ui-caption text-zinc-400 dark:text-zinc-500 mt-1">{helperText}</p>}
  </div>
);

export default Input;
