"use client";

import Button from "@/app/components/Button";
import { capitalize } from "./sharedStyles";

interface EnumFieldProps {
  fieldKey: string;
  values: string[];
  value: string;
  onChange: (value: string) => void;
}

export default function EnumField({ fieldKey, values, value, onChange }: EnumFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-ui-footnote font-medium text-ink-muted dark:text-stone px-0.5">
        {capitalize(fieldKey)}
      </span>
      <div className="inline-flex w-fit flex-wrap gap-0.5 rounded-lg border border-edge-subtle bg-surface/70 p-0.5 dark:bg-paper-dark-surface/60">
        {values.map((opt) => (
          <Button
            key={opt}
            variant="bare"
            type="button"
            onClick={() => onChange(opt)}
            className={`px-2.5 py-1 rounded-md text-ui-caption font-medium transition-all duration-150 ${
              value === opt
              ? "bg-surface-raised text-fg shadow-sm dark:bg-paper-dark"
              : "bg-transparent text-fg-muted hover:bg-surface-raised/70 dark:hover:bg-paper-dark"
            }`}
          >
            {opt}
          </Button>
        ))}
      </div>
    </div>
  );
}
