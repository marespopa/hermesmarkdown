"use client";

import React from "react";
import { HiChevronDown } from "react-icons/hi";

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex bg-paper-softgray dark:bg-paper-dark-surface p-0.5 rounded-xl gap-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3.5 py-1.5 text-ui-footnote font-semibold rounded-[10px] transition-all duration-150 select-none focus:outline-none ${
            value === opt.value
              ? "bg-paper-light dark:bg-clay text-sage dark:text-sage"
              : "text-ink-muted hover:text-ink-light dark:hover:text-ink-dark hover:bg-black/8"
          }`}
        >
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
}: {
  value: string | number;
  onChange: (v: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) => (
  <div className="relative w-full">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full appearance-none bg-paper-softgray dark:bg-paper-dark-surface text-ui-footnote font-semibold rounded-xl px-3 pr-7 py-1.5 outline-none border border-transparent focus:border-sage/40 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {children}
    </select>
    <HiChevronDown
      size={13}
      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone pointer-events-none"
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
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-neutral-100 dark:border-neutral-800/40 last:border-0">
      <div className="flex flex-col min-w-0">
        <span className="text-ui-subhead font-medium text-ink-light dark:text-ink-dark leading-none">
          {label}
        </span>
        {description && (
          <span className="text-ui-footnote text-neutral-500 dark:text-neutral-400 mt-1.5 leading-snug">
            {description}
          </span>
        )}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  ) : (
    <div className="flex flex-col gap-2.5 py-3.5 border-b border-neutral-100 dark:border-neutral-800/40 last:border-0">
      <div className="flex flex-col">
        <span className="text-ui-subhead font-medium text-ink-light dark:text-ink-dark leading-none">
          {label}
        </span>
        {description && (
          <span className="text-ui-footnote text-neutral-500 dark:text-neutral-400 mt-1.5 leading-snug">
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
    <p className="text-ui-caption font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2 px-1">
      {title}
    </p>
    <div className="rounded-2xl px-4 py-0.5 border border-beige/60 dark:border-neutral-800/60 dark:bg-paper-dark/80">
      {children}
    </div>
  </div>
);
