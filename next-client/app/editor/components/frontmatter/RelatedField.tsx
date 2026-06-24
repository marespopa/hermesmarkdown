"use client";

import { useState, KeyboardEvent } from "react";
import { fieldLabelClass, fieldHelperFadeClass, FIELD_HELP } from "./sharedStyles";

interface RelatedFieldProps {
  /** Comma-separated `[[WikiLink]]` entries. */
  value: string;
  onChange: (value: string) => void;
  headerActions?: React.ReactNode;
  /** AI / heuristic suggestions surfaced as add-chips. */
  suggestions?: string[];
  onAddSuggestion?: (title: string) => void;
  /** Note titles in the vault, queried for the searchable picker dropdown. */
  notePaths?: string[];
}

function parseLinks(value: string): string[] {
  return value.split(",").map((v) => v.trim()).filter(Boolean);
}

function toLink(title: string): string {
  return title.startsWith("[[") ? title : `[[${title}]]`;
}

export default function RelatedField({
  value,
  onChange,
  headerActions,
  suggestions = [],
  onAddSuggestion,
  notePaths = [],
}: RelatedFieldProps) {
  const [draft, setDraft] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const links = parseLinks(value);

  const matches = draft.trim()
    ? notePaths.filter((p) => p.toLowerCase().includes(draft.trim().toLowerCase())).slice(0, 8)
    : [];

  const addLink = (title: string) => {
    const link = toLink(title.replace(/\.md$/, ""));
    if (!links.includes(link)) onChange([...links, link].join(", "));
    setDraft("");
    setShowPicker(false);
  };

  const removeLink = (link: string) => {
    onChange(links.filter((l) => l !== link).join(", "));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && draft.trim()) {
      e.preventDefault();
      addLink(draft.trim());
    } else if (e.key === "Backspace" && draft === "" && links.length > 0) {
      e.preventDefault();
      removeLink(links[links.length - 1]);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 relative">
      <div className="flex items-center justify-between px-0.5">
        <label htmlFor="fm-related" className={fieldLabelClass}>
          Related
        </label>
        {headerActions}
      </div>
      <span className={fieldHelperFadeClass(showPicker)}>{FIELD_HELP.related}</span>
      <div
        className="flex flex-wrap items-center gap-1.5 w-full px-3 py-2 border rounded-xl bg-paper-softgray border-beige dark:bg-paper-dark-surface/50 dark:border-clay focus-within:ring-2 focus-within:ring-sage/15 dark:focus-within:ring-sage/20"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            (e.currentTarget.querySelector("input") as HTMLInputElement | null)?.focus();
          }
        }}
      >
        {links.map((link) => (
          <span
            key={link}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-sage/10 dark:bg-sage/10 text-sage dark:text-sage text-ui-caption font-medium border border-sage/20 dark:border-sage/20"
          >
            {link}
            <button
              type="button"
              onClick={() => removeLink(link)}
              aria-label={`Remove ${link}`}
              className="hover:text-red-500"
            >
              ×
            </button>
          </span>
        ))}
        <input
          id="fm-related"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowPicker(true)}
          onBlur={() => setTimeout(() => setShowPicker(false), 100)}
          placeholder={links.length === 0 ? "Search or type a note title…" : ""}
          className="flex-1 min-w-[10ch] bg-transparent outline-none text-ui-subhead text-ink-light dark:text-ink-dark placeholder:text-stone"
        />
      </div>
      {showPicker && matches.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white dark:bg-paper-dark-surface border border-beige dark:border-clay rounded-xl overflow-hidden shadow-lg max-h-40 overflow-y-auto">
          {matches.map((title) => (
            <button
              key={title}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                addLink(title);
              }}
              className="block w-full text-left px-3 py-2 text-ui-footnote text-ink-light dark:text-ink-dark hover:bg-paper-softgray dark:hover:bg-paper-dark-surface truncate"
            >
              {title}
            </button>
          ))}
        </div>
      )}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-1">
          {suggestions.map((title) => (
            <button
              key={title}
              type="button"
              onClick={() => onAddSuggestion?.(title) ?? addLink(title)}
              className="px-2.5 py-1 rounded-lg bg-sage/10 dark:bg-sage/10 text-sage dark:text-sage text-ui-caption font-medium border border-sage/20 dark:border-sage/20 hover:bg-sage/20 dark:hover:bg-sage/20 transition-colors"
            >
              + {title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
