"use client";

import { useCallback, useRef } from "react";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useNoteBuffer } from "@/app/hooks/file-system/use-note-buffer";
import { appendTodayLine, formatTodayLine } from "@/app/utils/today-append";

export type AppendResult = "added" | "cancelled" | "failed";
export interface AppendOutcome {
  result: AppendResult;
  // Today's sheet base name (`2026-10-10`) on success.
  sheetName?: string;
}

// Appends one line to the end of today's sheet, creating the sheet (without
// opening it) when needed: AI Chat's add_to_today, after the user approves.
// A sheet open in a tab is reconciled with disk first (disk wins), then gets
// the line in its buffer and is saved with any unsaved edits, so a visible
// editor updates live with no conflict. A sheet that isn't open is written
// straight to disk (useNoteBuffer#writeThrough). Appends run one at a time.
export function useTodayAppend() {
  const { ensureTodayNote, indexVaultTags } = useFileSystem();
  const { writeThrough } = useNoteBuffer();
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const run = useCallback(async (text: string, now: Date): Promise<AppendOutcome> => {
    const line = formatTodayLine(text);
    if (line === null) return { result: "cancelled" };
    try {
      const sheet = await ensureTodayNote(now);
      if (!sheet) return { result: "cancelled" };
      const { path, handle } = sheet;
      const { result } = await writeThrough(path, handle, (current) => appendTodayLine(current, line));
      void indexVaultTags().catch((err) => console.warn("Add to today: reindex failed", err));
      if (result !== "written") return { result: "failed" };
      const sheetName = (path.split("/").pop() ?? path).replace(/\.md$/i, "");
      return { result: "added", sheetName };
    } catch (err) {
      console.warn("Add to today failed:", err);
      return { result: "failed" };
    }
  }, [ensureTodayNote, indexVaultTags, writeThrough]);

  const appendToToday = useCallback((text: string, now: Date = new Date()): Promise<AppendOutcome> => {
    const result = queue.current.then(() => run(text, now));
    queue.current = result.catch(() => undefined);
    return result;
  }, [run]);

  return { appendToToday };
}
