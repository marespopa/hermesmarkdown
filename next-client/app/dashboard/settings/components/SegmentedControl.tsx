import React from "react";

interface SegmentedControlProps {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}

export default function SegmentedControl({
  options,
  value,
  onChange,
}: SegmentedControlProps) {
  return (
    <div className="inline-flex rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`px-4 py-2 text-sm font-mono transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
            value === opt.value
              ? "bg-amber-100 dark:bg-neutral-800 text-black dark:text-white font-semibold"
              : "bg-transparent text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          }`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
