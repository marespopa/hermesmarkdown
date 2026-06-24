"use client";

import Input from "@/app/components/Input";
import { textareaClass, fieldLabelClass, capitalize } from "./sharedStyles";

interface GenericFieldProps {
  fieldKey: string;
  value: string;
  onChange: (value: string) => void;
  /** "list" renders a single-line comma-separated input; anything else a multiline textarea. */
  type?: "string" | "list";
  description?: string;
  autoFocus?: boolean;
}

export default function GenericField({
  fieldKey,
  value,
  onChange,
  type = "string",
  description,
  autoFocus = true,
}: GenericFieldProps) {
  const label = capitalize(fieldKey.replace(/_/g, " "));

  if (type === "list") {
    return (
      <Input
        name={`fm-${fieldKey}`}
        label={label}
        value={value}
        handleChange={(e) => onChange(e.target.value)}
        placeholder="Comma-separated values"
        autoFocus={autoFocus}
        className="my-0"
      />
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className={fieldLabelClass}>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={description ?? `Enter ${fieldKey}`}
        rows={3}
        autoFocus={autoFocus}
        className={textareaClass}
      />
    </div>
  );
}
