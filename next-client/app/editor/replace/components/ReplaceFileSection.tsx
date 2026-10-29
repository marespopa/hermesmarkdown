"use client";

import { memo, useEffect, useRef } from "react";
import Button from "@/app/components/Button";
import { formatCount } from "@/app/components/CountBadge";
import { expandReplacement, type ReplaceMatch } from "@/app/workers/replace-search";
import type { ReplaceFileResult } from "@/app/workers/text-grep-protocol";

// Tint of a match's old and new text: the old one struck through on the danger
// colour, the new one on the done colour.
const ADD_ROW = "bg-[color-mix(in_srgb,var(--task-done)_22%,transparent)]";
const DEL_ROW = "bg-[color-mix(in_srgb,var(--danger)_16%,transparent)] text-fg-muted";
const CODE_FONT = "[font-family:var(--font-code)]";

export type FileState = "replacing" | "replaced" | "skipped" | "failed";

interface Props {
  file: ReplaceFileResult;
  template: string;
  regex: boolean;
  /** Ordinals the user unchecked. */
  excluded?: ReadonlySet<number>;
  state?: FileState;
  /** Matches written, for a replaced file. */
  replacedCount?: number;
  onToggleMatch: (path: string, ordinal: number) => void;
  onToggleFile: (path: string, included: boolean) => void;
  onOpen: (path: string, line: number, column: number) => void;
}

const STATE_MESSAGE: Partial<Record<FileState, string>> = {
  skipped: "Changed since the preview — search again",
  failed: "Couldn't write this file",
};

const ROW_HIT = "[@media(pointer:coarse)]:min-h-11";

function MatchRow({ match, path, template, regex, checked, locked, onToggle, onOpen }: {
  match: ReplaceMatch;
  path: string;
  template: string;
  regex: boolean;
  checked: boolean;
  locked: boolean;
  onToggle: (path: string, ordinal: number) => void;
  onOpen: (path: string, line: number, column: number) => void;
}) {
  const replacement = expandReplacement(template, match, regex);
  return (
    <li className={`flex items-center gap-2 px-3 ${ROW_HIT}`}>
      <label className={`flex shrink-0 items-center ${ROW_HIT}`}>
        <input
          type="checkbox"
          checked={checked}
          disabled={locked}
          onChange={() => onToggle(path, match.ordinal)}
          aria-label={`Replace match on line ${match.line}`}
        />
      </label>
      <Button
        variant="unstyled"
        onClick={() => onOpen(path, match.line, match.column)}
        aria-label={`Open ${path} at line ${match.line}`}
        className="w-10 shrink-0 text-right text-ui-caption tabular-nums text-fg-faint hover:text-fg"
      >
        {match.line}
      </Button>
      <span className={`min-w-0 flex-1 whitespace-pre-wrap break-all py-0.5 text-ui-footnote ${CODE_FONT} ${checked ? "" : "opacity-50"}`}>
        <span className="text-fg-muted">{match.before}</span>
        <span className={`${DEL_ROW} line-through`}>{match.text}</span>
        {replacement && <span className={`${ADD_ROW} text-fg`}>{replacement}</span>}
        <span className="text-fg-muted">{match.after}</span>
      </span>
    </li>
  );
}

// One file of the preview: its checkbox, name, folder, match count and Open,
// then each match as before → after with its own checkbox. Memoized: typing in
// Replace with re-renders the rows; checking a match re-renders its file only.
export default memo(function ReplaceFileSection({ file, template, regex, excluded, state, replacedCount, onToggleMatch, onToggleFile, onOpen }: Props) {
  const total = file.matches.length;
  const includedCount = total - (excluded?.size ?? 0);
  const checkbox = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (checkbox.current) checkbox.current.indeterminate = includedCount > 0 && includedCount < total;
  }, [includedCount, total]);

  const slash = file.path.lastIndexOf("/");
  const name = file.path.slice(slash + 1);
  const folder = slash === -1 ? "" : file.path.slice(0, slash);
  const busy = state === "replacing";
  const locked = state !== undefined;
  const first = file.matches[0];

  return (
    <section
      aria-busy={busy || undefined}
      className={`overflow-clip rounded-xl border border-edge-subtle bg-surface [contain-intrinsic-size:auto_120px] [content-visibility:auto] ${busy ? "opacity-60" : ""}`}
    >
      <header className={`flex items-center gap-2 px-3 py-1.5 ${state === "replaced" ? "" : "border-b border-edge-subtle"}`}>
        <label className={`flex shrink-0 items-center ${ROW_HIT}`}>
          <input
            ref={checkbox}
            type="checkbox"
            checked={includedCount > 0}
            disabled={locked}
            onChange={() => onToggleFile(file.path, includedCount === 0)}
            aria-label={`Replace in ${file.path}`}
          />
        </label>
        <span className="min-w-0 flex-1 truncate text-ui-footnote">
          <span className="font-medium">{name}</span>
          {folder && <span className="ml-2 text-fg-faint">{folder}</span>}
        </span>
        {state === "replaced" ? (
          <span className="shrink-0 text-ui-caption text-fg-muted">Replaced {formatCount(replacedCount ?? 0)}</span>
        ) : (
          <span className="shrink-0 text-ui-caption tabular-nums text-fg-muted">{formatCount(total)}</span>
        )}
        <Button variant="small" onClick={() => onOpen(file.path, first.line, first.column)} aria-label={`Open ${file.path}`} className="shrink-0">
          Open
        </Button>
      </header>
      {state && STATE_MESSAGE[state] && <p className="px-3 py-2 text-ui-footnote text-fg-muted">{STATE_MESSAGE[state]}</p>}
      {state !== "replaced" && (
        <ul>
          {file.matches.map((match) => (
            <MatchRow
              key={match.ordinal}
              match={match}
              path={file.path}
              template={template}
              regex={regex}
              checked={!excluded?.has(match.ordinal)}
              locked={locked}
              onToggle={onToggleMatch}
              onOpen={onOpen}
            />
          ))}
        </ul>
      )}
    </section>
  );
});
