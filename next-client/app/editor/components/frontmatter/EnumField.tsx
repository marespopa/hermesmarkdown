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
      <div className="flex flex-wrap gap-2">
        {values.map((opt) => (
          <Button
            key={opt}
            variant="bare"
            type="button"
            onClick={() => onChange(opt)}
            className={`px-3 py-1.5 rounded-full text-ui-footnote font-medium border transition-all duration-150 ${
              value === opt
                ? "bg-sage text-white border-sage dark:bg-sage dark:border-sage"
                : "bg-transparent border-beige text-ink-muted hover:bg-paper-softgray dark:border-clay dark:text-stone dark:hover:bg-paper-dark-surface"
            }`}
          >
            {opt}
          </Button>
        ))}
      </div>
    </div>
  );
}
