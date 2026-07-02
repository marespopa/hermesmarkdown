"use client";

import { textareaClass, fieldHelperFadeClass, FIELD_HELP } from "./sharedStyles";

interface ScopeFieldProps {
  value: string;
  onChange: (value: string) => void;
  recommended?: boolean;
  autoFocus?: boolean;
  headerActions?: React.ReactNode;
}

const WORD_LIMIT = 30;

export default function ScopeField({
  value,
  onChange,
  recommended,
  autoFocus,
  headerActions,
}: ScopeFieldProps) {
  const wordCount = value.trim() ? value.trim().split(/\s+/).filter(Boolean).length : 0;
  const cls = textareaClass + (recommended ? " !border-amber-400 dark:!border-amber-500" : "");

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
        {recommended ? (
          <span className="text-ui-caption text-amber-500 dark:text-amber-400">
            Recommended for active files
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
