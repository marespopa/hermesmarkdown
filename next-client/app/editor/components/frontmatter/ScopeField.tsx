"use client";

import { useState } from "react";
import { textareaClass, fieldHelperFadeClass, FIELD_HELP } from "./sharedStyles";

interface ScopeFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  errorMessage?: string;
  autoFocus?: boolean;
  headerActions?: React.ReactNode;
  /** Vault-aware autocomplete — unique scope values seen elsewhere in the vault. */
  suggestions?: string[];
}

const WORD_LIMIT = 30;

export default function ScopeField({
  value,
  onChange,
  error,
  errorMessage,
  autoFocus,
  headerActions,
  suggestions = [],
}: ScopeFieldProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wordCount = value.trim() ? value.trim().split(/\s+/).filter(Boolean).length : 0;
  const cls = textareaClass + (error ? " !border-red-400 dark:!border-red-500" : "");

  const filtered = value.trim()
    ? suggestions.filter((s) => s.toLowerCase().includes(value.trim().toLowerCase()) && s !== value.trim())
    : suggestions;

  return (
    <div className="flex flex-col gap-1.5 relative">
      <div className="flex items-center justify-between px-0.5">
        <label htmlFor="fm-scope" className="text-ui-footnote font-medium text-ink-muted dark:text-stone">
          Scope
        </label>
        {headerActions}
      </div>
      <span className={fieldHelperFadeClass(showSuggestions)}>{FIELD_HELP.scope}</span>
      <textarea
        id="fm-scope"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
        placeholder="What does this file cover? One paragraph."
        rows={3}
        autoFocus={autoFocus}
        className={cls}
      />
      {showSuggestions && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white dark:bg-paper-dark-surface border border-beige dark:border-clay rounded-xl overflow-hidden shadow-lg max-h-40 overflow-y-auto">
          {filtered.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(s);
                setShowSuggestions(false);
              }}
              className="block w-full text-left px-3 py-2 text-ui-footnote text-ink-light dark:text-ink-dark hover:bg-paper-softgray dark:hover:bg-paper-dark-surface truncate"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between px-0.5">
        {error ? (
          <span className="text-ui-caption text-red-500 dark:text-red-400">
            {errorMessage ?? "Required"}
          </span>
        ) : (
          <span />
        )}
        <span className={`text-ui-caption tabular-nums ${wordCount > WORD_LIMIT ? "text-amber-500" : "text-fg-faint"}`}>
          {wordCount} / {WORD_LIMIT} words
        </span>
      </div>
    </div>
  );
}
