"use client";

import { useCallback, useMemo, useState } from "react";
import type { ReplaceFileResult } from "@/app/workers/text-grep-protocol";

type Excluded = ReadonlyMap<string, ReadonlySet<number>>;
const NONE: Excluded = new Map();

export interface ReplaceSelection {
  /** Unchecked match ordinals per file. */
  excluded: Excluded;
  toggleMatch: (path: string, ordinal: number) => void;
  toggleFile: (path: string, included: boolean) => void;
  /** Matches, and files with at least one match, still checked. */
  includedMatches: number;
  includedFiles: number;
}

// Which previewed matches the user unchecked. Everything starts included;
// the choices belong to one search (`scanKey`) and reset when it changes.
export function useReplaceSelection(files: ReplaceFileResult[], scanKey: string): ReplaceSelection {
  const [state, setState] = useState<{ key: string; excluded: Excluded }>({ key: scanKey, excluded: NONE });
  const excluded = state.key === scanKey ? state.excluded : NONE;
  const byPath = useMemo(() => new Map(files.map((file) => [file.path, file])), [files]);

  const update = useCallback((path: string, change: (current: ReadonlySet<number>) => ReadonlySet<number>) => {
    setState((previous) => {
      const base = previous.key === scanKey ? previous.excluded : NONE;
      const next = new Map(base);
      const set = change(base.get(path) ?? new Set());
      if (set.size === 0) next.delete(path);
      else next.set(path, set);
      return { key: scanKey, excluded: next };
    });
  }, [scanKey]);

  const toggleMatch = useCallback((path: string, ordinal: number) => update(path, (current) => {
    const next = new Set(current);
    if (!next.delete(ordinal)) next.add(ordinal);
    return next;
  }), [update]);

  const toggleFile = useCallback((path: string, included: boolean) => update(path, () => (
    included ? new Set<number>() : new Set(byPath.get(path)?.matches.map((match) => match.ordinal))
  )), [update, byPath]);

  let includedMatches = 0;
  let includedFiles = 0;
  for (const file of files) {
    const count = file.matches.length - (excluded.get(file.path)?.size ?? 0);
    includedMatches += count;
    if (count > 0) includedFiles++;
  }
  return { excluded, toggleMatch, toggleFile, includedMatches, includedFiles };
}
