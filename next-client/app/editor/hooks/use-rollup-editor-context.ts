"use client";

import { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import type { EditorView } from "@codemirror/view";
import { atom_rollupStatus } from "@/app/atoms/ui-atoms";
import type { Sheet } from "@/app/utils/sheet-nav";
import { setRollupContext } from "../codemirror/rollup-context";

// New lines stay tinted this long after a rebuild (the CSS fade is 2.4s).
const FRESH_MS = 3_000;
const MINUTE = 60_000;

// "From your daily sheets · updated just now / 5 min ago / at 14:05".
export function rollupCaption(at: number | undefined, now: number): string {
  const base = "From your daily sheets";
  if (!at) return base;
  const age = now - at;
  if (age < MINUTE) return `${base} · updated just now`;
  if (age < 60 * MINUTE) return `${base} · updated ${Math.floor(age / MINUTE)} min ago`;
  return `${base} · updated at ${new Date(at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

// Hands a rollup sheet's editor its rollupContextField: path, level, the
// marker caption (re-rendered every minute so "5 min ago" stays true), and
// the item lines the latest rebuild added, for FRESH_MS after it. Clears the
// context for any other note.
export function useRollupEditorContext(view: EditorView | null, filePath: string, sheet: Sheet | null) {
  const status = useAtomValue(atom_rollupStatus)[filePath];
  const kind = sheet?.period?.kind;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!kind) return;
    const timer = setInterval(() => setNow(Date.now()), MINUTE);
    return () => clearInterval(timer);
  }, [kind]);

  // A new rebuild restarts the clock and the tint.
  const at = status?.at;
  useEffect(() => {
    if (!at) return;
    setNow(Date.now());
    const timer = setTimeout(() => setNow(Date.now()), FRESH_MS);
    return () => clearTimeout(timer);
  }, [at]);

  const caption = rollupCaption(at, now);
  const fresh = at && now - at < FRESH_MS ? status?.fresh ?? null : null;
  useEffect(() => {
    if (!view) return;
    view.dispatch({
      effects: setRollupContext.of(kind ? { path: filePath, kind, caption, fresh: new Set(fresh ?? []) } : null),
    });
  }, [view, filePath, kind, caption, fresh]);
}
