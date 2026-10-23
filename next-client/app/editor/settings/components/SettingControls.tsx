"use client";

import React from "react";
import { HiChevronDown } from "react-icons/hi";
import Button, { SEGMENT_TRACK_CLASS } from "@/app/components/Button";
import { FIELD_SURFACE } from "@/app/components/Input";

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T; Icon?: React.ComponentType<{ size?: number }> }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className={`inline-flex flex-wrap gap-0.5 ${SEGMENT_TRACK_CLASS}`}>
      {options.map((opt) => (
        <Button variant="segment"
          key={opt.value}
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
          className="h-8"
        >
          {opt.Icon && <opt.Icon size={14} />}
          {opt.label}
        </Button>
      ))}
    </div>
  );
}

export const SelectControl = ({
  value,
  onChange,
  children,
  disabled,
  size = "md",
  fullWidth = true,
  ariaLabel,
}: {
  value: string | number;
  onChange: (v: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
  size?: "sm" | "md";
  fullWidth?: boolean;
  ariaLabel?: string;
}) => (
  <div className={`relative ${fullWidth ? "w-full" : "inline-block"}`}>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`${FIELD_SURFACE} appearance-none font-medium cursor-pointer ${fullWidth ? "w-full" : ""} ${
        size === "sm" ? "h-7 text-ui-footnote rounded-md px-2 pr-6" : "h-8 text-ui-footnote rounded-lg px-2.5 pr-7"
      }`}
    >
      {children}
    </select>
    <HiChevronDown
      size={size === "sm" ? 11 : 13}
      className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-faint pointer-events-none"
    />
  </div>
);

export const SettingItem = ({
  label,
  description,
  control,
  layout = "row",
}: {
  label: string;
  description?: string;
  control: React.ReactNode;
  layout?: "row" | "stack";
}) =>
  layout === "row" ? (
    <div className="flex items-center justify-between gap-4 border-b border-edge-subtle py-3 last:border-0">
      <div className="flex flex-col min-w-0">
        <span className="text-ui-subhead font-medium text-ink-light dark:text-ink-dark leading-none">
          {label}
        </span>
        {description && (
          <span className="mt-1 text-ui-footnote leading-snug text-ink-muted dark:text-stone">
            {description}
          </span>
        )}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  ) : (
    <div className="flex flex-col gap-2.5 border-b border-edge-subtle py-3 last:border-0">
      <div className="flex flex-col">
        <span className="text-ui-subhead font-medium text-ink-light dark:text-ink-dark leading-none">
          {label}
        </span>
        {description && (
          <span className="mt-1 text-ui-footnote leading-snug text-ink-muted dark:text-stone">
            {description}
          </span>
        )}
      </div>
      <div>{control}</div>
    </div>
  );

// A row of plain information inside a group: no control, nothing to change.
export const SettingNote = ({ children }: { children: React.ReactNode }) => (
  <p className="border-b border-edge-subtle py-3 text-ui-footnote leading-snug text-ink-muted last:border-0 dark:text-stone">
    {children}
  </p>
);

// A titled card of settings. A section with one group can leave the title
// out: the section heading already names it.
export const SettingGroup = ({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) => (
  <div className="mb-5 last:mb-0">
    {title && (
      <p className="mb-2 px-1 text-ui-caption font-semibold uppercase tracking-wider text-fg-muted/45">
        {title}
      </p>
    )}
    <div className="rounded-xl border border-edge-subtle bg-chrome/60 px-4 py-0.5 backdrop-blur-xl">
      {children}
    </div>
  </div>
);
