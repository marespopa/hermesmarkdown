"use client";

import Button, { SEGMENT_TRACK_CLASS } from "@/app/components/Button";
import { BareInput, FIELD_CLASS } from "@/app/components/Input";
import Toggle from "@/app/components/Toggle";
import type { ReplacePrefs } from "@/app/atoms/replace-atoms";

interface Props {
  find: string;
  replaceWith: string;
  prefs: ReplacePrefs;
  onFind: (value: string) => void;
  onReplaceWith: (value: string) => void;
  onPrefs: (prefs: ReplacePrefs) => void;
  /** The Replace button's label and state. */
  label: string;
  disabled: boolean;
  busy: boolean;
  onReplace: () => void;
}

const OPTIONS = [
  { key: "matchCase", label: "Match case" },
  { key: "wholeWord", label: "Whole word" },
  { key: "regex", label: "Regex" },
] as const;

// The fields of Replace in Files: Find and Replace with, the three match
// options, Include code files, and the Replace button. Stateless.
export default function ReplaceForm({ find, replaceWith, prefs, onFind, onReplaceWith, onPrefs, label, disabled, busy, onReplace }: Props) {
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!disabled) onReplace();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <BareInput
          autoFocus
          value={find}
          onChange={(event) => onFind(event.target.value)}
          placeholder="Find"
          aria-label="Find"
          spellCheck={false}
          className={`${FIELD_CLASS} w-full`}
        />
        <BareInput
          value={replaceWith}
          onChange={(event) => onReplaceWith(event.target.value)}
          placeholder="Replace with"
          aria-label="Replace with"
          spellCheck={false}
          className={`${FIELD_CLASS} w-full`}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className={`inline-flex ${SEGMENT_TRACK_CLASS}`}>
          {OPTIONS.map(({ key, label: optionLabel }) => (
            <Button
              key={key}
              variant="segment"
              aria-pressed={prefs[key]}
              onClick={() => onPrefs({ ...prefs, [key]: !prefs[key] })}
              className="h-8 rounded-lg px-3"
            >
              {optionLabel}
            </Button>
          ))}
        </div>
        <span className="flex items-center gap-2 text-ui-footnote text-fg-muted">
          <Toggle active={prefs.includeCode} onChange={(includeCode) => onPrefs({ ...prefs, includeCode })} label="Include code files" />
          Include code files
        </span>
      </div>
      <Button type="submit" variant="primary" isDisabled={disabled} aria-busy={busy || undefined} className="w-full sm:w-auto">
        {label}
      </Button>
    </form>
  );
}
