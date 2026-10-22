"use client";

import React from "react";
import { HiCheck } from "react-icons/hi";
import Button from "@/app/components/Button";
import type { ThemePalette } from "@/app/theme-palettes";

interface ThemePickerProps<T extends string> {
  themes: ThemePalette<T>[];
  value: T;
  onChange: (value: T) => void;
}

// A colour faded to `percent` (color-mix, as the app's own tints).
const previewTint = (color: string, percent: number) => `color-mix(in srgb, ${color} ${percent}%, transparent)`;

// One card per palette, each drawn in its own colors as the editor is laid
// out (the sidebar in the chrome colour beside the page, a line of text and
// the accent as a single dot, as the caret) so it previews the palette
// whatever mode the app is in right now. Four palettes (light) wrap two by
// two on a phone and sit in one row from `sm` up; three keep one row.
export default function ThemePicker<T extends string>({ themes, value, onChange }: ThemePickerProps<T>) {
  return (
    <div className={`grid gap-2 ${themes.length > 3 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
      {themes.map((t) => {
        const isActive = value === t.value;
        return (
          <Button
            variant="unstyled"
            key={t.value}
            onClick={() => onChange(t.value)}
            aria-pressed={isActive}
            aria-label={`${t.label} theme`}
            className={`flex flex-col gap-1.5 rounded-xl border p-1.5 text-left transition-colors focus:outline-none ${
              isActive ? "border-sage bg-sage/5 dark:bg-sage/10" : "border-edge hover:border-fg-faint"
            }`}
          >
            {/* The editor in miniature: the sidebar's rows in neutral grey
                on the chrome, a hairline, then the page with its text. */}
            <span
              aria-hidden
              className="flex h-14 w-full overflow-hidden rounded-lg border border-black/5 dark:border-white/10"
              style={{ backgroundColor: t.swatch.surface }}
            >
              <span
                className="flex w-1/4 shrink-0 flex-col gap-1 p-1.5"
                style={{ backgroundColor: t.swatch.chrome, boxShadow: `inset -1px 0 0 ${previewTint(t.swatch.fg, 10)}` }}
              >
                {[0, 1, 2].map((row) => (
                  <span key={row} className="h-1 w-full rounded-full" style={{ backgroundColor: previewTint(t.swatch.fg, 18) }} />
                ))}
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-1.5 px-2">
                <span className="text-ui-footnote font-medium" style={{ color: t.swatch.fg }}>
                  Aa
                </span>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: t.swatch.accent }} />
              </span>
            </span>
            <span className="flex w-full items-center justify-between gap-1 px-1 pb-0.5">
              <span className="min-w-0">
                <span
                  className={`block truncate text-ui-footnote font-medium leading-tight ${
                    isActive ? "text-sage" : "text-fg"
                  }`}
                >
                  {t.label}
                </span>
                <span className="block truncate text-ui-caption text-fg-faint">{t.description}</span>
              </span>
              <HiCheck
                size={14}
                className={`shrink-0 text-sage transition-opacity ${isActive ? "opacity-100" : "opacity-0"}`}
              />
            </span>
          </Button>
        );
      })}
    </div>
  );
}
