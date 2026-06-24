"use client";

import { textareaClass, fieldHelperFadeClass, FIELD_HELP } from "./sharedStyles";

interface ScopeFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  errorMessage?: string;
  autoFocus?: boolean;
  headerActions?: React.ReactNode;
}

const WORD_LIMIT = 30;

export default function ScopeField({
  value,
  onChange,
  error,
  errorMessage,
  autoFocus,
  headerActions,
}: ScopeFieldProps) {
  const wordCount = value.trim() ? value.trim().split(/\s+/).filter(Boolean).length : 0;
  const cls = textareaClass + (error ? " !border-red-400 dark:!border-red-500" : "");

  return (
    <div className="flex flex-col gap-1.5 relative">
      <div className="flex items-center justify-between px-0.5">
        <label htmlFor="fm-scope" className="text-ui-footnote font-medium text-ink-muted dark:text-stone">
          Scope
        </label>
        {headerActions}
      </div>
      <span className={fieldHelperFadeClass(false)}>{FIELD_HELP.scope}</span>
      <textarea
        id="fm-scope"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="What does this file cover? One paragraph."
        rows={3}
        autoFocus={autoFocus}
        className={cls}
      />
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
