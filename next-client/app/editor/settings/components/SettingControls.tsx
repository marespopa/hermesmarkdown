"use client";

import React from "react";
import { HiChevronDown } from "react-icons/hi";

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
    <div className="inline-flex flex-wrap gap-0.5 rounded-lg bg-paper-softgray/75 p-0.5 dark:bg-paper-dark-surface/80">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-md px-3 py-1.5 text-ui-footnote font-medium transition-colors duration-150 select-none focus:outline-none ${
            value === opt.value
              ? "bg-paper-light text-ink-light shadow-sm dark:bg-white/10 dark:text-ink-dark"
              : "text-ink-muted hover:bg-paper-light/70 hover:text-ink-light dark:text-stone dark:hover:bg-paper-dark-surface dark:hover:text-ink-dark"
          }`}
        >
          {opt.Icon && <opt.Icon size={14} />}
          {opt.label}
        </button>
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
      className={`appearance-none bg-paper-softgray dark:bg-paper-dark-surface text-ink-light dark:text-ink-dark font-semibold outline-none border border-transparent focus:border-sage/40 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
        fullWidth ? "w-full" : ""
      } ${
        size === "sm" ? "text-ui-footnote rounded-md px-2 pr-6 py-1" : "text-ui-footnote rounded-xl px-3 pr-7 py-1.5"
      }`}
    >
      {children}
    </select>
    <HiChevronDown
      size={size === "sm" ? 11 : 13}
      className="absolute right-2 top-1/2 -translate-y-1/2 text-stone pointer-events-none"
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

export const SettingGroup = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="mb-5 last:mb-0">
    <p className="mb-2 px-1 text-ui-caption font-semibold uppercase tracking-wider text-fg-muted/45">
      {title}
    </p>
    <div className="rounded-xl border border-edge-subtle bg-chrome/60 px-4 py-0.5 backdrop-blur-xl">
      {children}
    </div>
  </div>
);
