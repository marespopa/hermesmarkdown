import Input from "./Input.component";
import Textarea from "./Textarea.component";
import React from "react";
import { FIELD_CLASS, FIELD_COMPACT_CLASS } from "./field-styles";

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
export { default as BareInput } from "./BareInput";
export { FIELD_CLASS, FIELD_COMPACT_CLASS, FIELD_SURFACE } from "./field-styles";
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
      <span className="text-ui-footnote font-medium text-fg-muted">{label}</span>
      <select
        className={compact && !fullWidth ? FIELD_COMPACT_CLASS : `${FIELD_CLASS}${fullWidth ? " w-full" : ""}`}
        id={name}
        name={name}
        value={value}
        onChange={handleChange}
        aria-label={label}
        style={compact && !fullWidth ? { minWidth: 120 } : {}}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-input-bg">
            {opt.label}
          </option>
        ))}
      </select>
    </label>
    {helperText && <p className="text-ui-caption text-fg-faint mt-1">{helperText}</p>}
  </div>
);

export default Input;
