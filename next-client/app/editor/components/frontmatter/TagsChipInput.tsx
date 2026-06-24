"use client";

import { useState, KeyboardEvent } from "react";
import { fieldLabelClass } from "./sharedStyles";

interface TagsChipInputProps {
  /** Comma-separated tag string, matching the schema's list serialization. */
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

function parseChips(value: string): string[] {
  return value.split(",").map((t) => t.trim()).filter(Boolean);
}

export default function TagsChipInput({ value, onChange, autoFocus }: TagsChipInputProps) {
  const [draft, setDraft] = useState("");
  const chips = parseChips(value);

  const commitDraft = () => {
    const next = draft.trim().toLowerCase();
    if (!next) return;
    if (!chips.includes(next)) onChange([...chips, next].join(", "));
    setDraft("");
  };

  const removeChip = (chip: string) => {
    onChange(chips.filter((c) => c !== chip).join(", "));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "," || e.key === " " || e.key === "Enter") {
      e.preventDefault();
      commitDraft();
    } else if (e.key === "Backspace" && draft === "" && chips.length > 0) {
      e.preventDefault();
      onChange(chips.slice(0, -1).join(", "));
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="fm-tags" className={fieldLabelClass}>
        Tags
      </label>
      <div
        className="flex flex-wrap items-center gap-1.5 w-full px-3 py-2 border rounded-xl bg-paper-softgray border-beige dark:bg-paper-dark-surface/50 dark:border-clay focus-within:ring-2 focus-within:ring-sage/15 dark:focus-within:ring-sage/20"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            (e.currentTarget.querySelector("input") as HTMLInputElement | null)?.focus();
          }
        }}
      >
        {chips.map((chip) => (
          <span
            key={chip}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-sage/10 dark:bg-sage/10 text-sage dark:text-sage text-ui-caption font-medium border border-sage/20 dark:border-sage/20"
          >
            {chip}
            <button
              type="button"
              onClick={() => removeChip(chip)}
              aria-label={`Remove tag ${chip}`}
              className="hover:text-red-500"
            >
              ×
            </button>
          </span>
        ))}
        <input
          id="fm-tags"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitDraft}
          autoFocus={autoFocus}
          placeholder={chips.length === 0 ? "e.g. auth, onboarding, api" : ""}
          className="flex-1 min-w-[6ch] bg-transparent outline-none text-ui-subhead text-ink-light dark:text-ink-dark placeholder:text-stone"
        />
      </div>
    </div>
  );
}
