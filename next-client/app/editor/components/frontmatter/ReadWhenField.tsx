"use client";

import { useEffect, useRef, useState } from "react";
import { textareaClass, fieldHelperClass, FIELD_HELP } from "./sharedStyles";
import { normalizeListString } from "@/app/utils/frontmatter-utils";

interface ReadWhenFieldProps {
  value: string;
  onChange: (value: string) => void;
  warning?: boolean;
  autoFocus?: boolean;
}

export default function ReadWhenField({ value, onChange, warning, autoFocus }: ReadWhenFieldProps) {
  // `read_when` round-trips through a comma-list serializer that trims each
  // item — without this buffer, a trailing space typed mid-sentence gets
  // echoed back stripped on the next render and appears to "not work".
  const [draft, setDraft] = useState(value);
  const lastSentRef = useRef(value);

  useEffect(() => {
    if (value !== lastSentRef.current && value !== normalizeListString(draft)) {
      setDraft(value);
      lastSentRef.current = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (v: string) => {
    setDraft(v);
    lastSentRef.current = v;
    onChange(v);
  };

  const rwValue = draft.trim();
  const isAlways = rwValue === "always";
  const isNever = rwValue === "never";
  const isReserved = isAlways || isNever;
  const cls = textareaClass + (warning ? " !border-amber-400 dark:!border-amber-500" : "");

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="fm-read-when" className="text-ui-footnote font-medium text-ink-muted dark:text-stone px-0.5">
        Read when
      </label>
      <span className={fieldHelperClass}>{FIELD_HELP.read_when}</span>
      {!isReserved && (
        <textarea
          id="fm-read-when"
          value={draft}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={`"user is working on debt repayment"\n"task involves financial projections"\n"keywords: budget, creditor, repayment"`}
          rows={2}
          autoFocus={autoFocus}
          className={cls}
        />
      )}
      {warning && !isReserved && (
        <span className="text-ui-caption text-amber-500 dark:text-amber-400 px-0.5">Recommended for active files</span>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-ui-caption text-fg-faint px-0.5">Quick set:</span>
        <button
          type="button"
          onClick={() => handleChange(isAlways ? "" : "always")}
          className={`px-3 py-1 rounded-full text-ui-caption font-medium border transition-all duration-150 ${
            isAlways
              ? "bg-sage text-white border-sage"
              : "bg-transparent border-beige text-ink-muted hover:bg-paper-softgray dark:border-clay dark:text-stone dark:hover:bg-paper-dark-surface"
          }`}
        >
          always
        </button>
        <button
          type="button"
          onClick={() => handleChange(isNever ? "" : "never")}
          className={`px-3 py-1 rounded-full text-ui-caption font-medium border transition-all duration-150 ${
            isNever
              ? "bg-red-400 text-white border-red-400 dark:bg-red-500 dark:border-red-500"
              : "bg-transparent border-beige text-ink-muted hover:bg-paper-softgray dark:border-clay dark:text-stone dark:hover:bg-paper-dark-surface"
          }`}
        >
          never
        </button>
        {isReserved && (
          <span className="text-ui-caption text-fg-faint">
            {isAlways ? "File is always included in agent context" : "File is excluded from all agent context"}
          </span>
        )}
      </div>
    </div>
  );
}
