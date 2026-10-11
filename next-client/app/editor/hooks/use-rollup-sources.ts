"use client";

import { useCallback } from "react";
import { useStore } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_newNoteFolder, atom_todayFolder } from "@/app/atoms/ui-atoms";
import { atom_templatesFolder } from "@/app/atoms/template-atoms";
import { useNoteBuffer } from "@/app/hooks/file-system/use-note-buffer";
import { normalizeFolderPath } from "@/app/hooks/file-system/unique-file";
import { isSensitiveContent, isSensitiveFrontmatter } from "@/app/utils/note-privacy";
import { isTemplatePath } from "@/app/utils/templates/template-registry";
import { findSheetByName, resolveTodayFolder } from "@/app/utils/today-note";
import { pickDailySheets } from "@/app/utils/rollup/daily-sheets";
import { weeksOwnedByMonth, type RollupPeriod } from "@/app/utils/rollup/period";
import type { WeekNotes } from "@/app/utils/rollup/render";
import { extractNotes } from "@/app/utils/rollup/sections";

export interface RollupSources {
  sheets: { date: string; text: string }[];
  weekNotes: WeekNotes[];
  // Daily sheets that couldn't be read (skipped).
  failed: number;
  // Any source sheet is sensitive.
  sensitive: boolean;
}

// What a rollup is built from. Daily sheets are found by file name anywhere
// in the vault and read with a fresh handle; a sheet open in a tab is read as
// that tab shows it after reconciling with disk (the tab isn't changed). A
// month also reads the Notes of the weekly sheets whose Thursday is in it.
export function useRollupSources() {
  const store = useStore();
  const { readCurrentText } = useNoteBuffer();

  // The Daily Sheets folder for a date, where a sheet is looked for first
  // (the New Notes folder before the pattern has been set, like Today's sheet).
  const preferredFolder = useCallback((date: Date) => {
    const pattern = store.get(atom_todayFolder);
    return normalizeFolderPath(pattern === null ? store.get(atom_newNoteFolder) : resolveTodayFolder(pattern, date));
  }, [store]);

  const loadSources = useCallback(async (period: RollupPeriod): Promise<RollupSources> => {
    const meta = store.get(atom_fileMetadata);
    const paths = Object.keys(meta);
    const templatesFolder = store.get(atom_templatesFolder).folder;
    const skip = (path: string) => path.startsWith(".hermes/") || isTemplatePath(path, templatesFolder);
    const isSensitive = (path: string, text: string) => isSensitiveFrontmatter(meta[path]?.frontmatter) || isSensitiveContent(text);
    const sources: RollupSources = { sheets: [], weekNotes: [], failed: 0, sensitive: false };

    for (const { date, path } of pickDailySheets(paths, period, preferredFolder, skip)) {
      try {
        const text = await readCurrentText(path);
        sources.sheets.push({ date, text });
        if (isSensitive(path, text)) sources.sensitive = true;
      } catch (err) {
        console.warn(`Rollup: couldn't read ${path}`, err);
        sources.failed++;
      }
    }

    if (period.kind === "month") {
      for (const week of weeksOwnedByMonth(period)) {
        const path = findSheetByName(paths, `${week.name}.md`, preferredFolder(week.anchor));
        if (!path || skip(path)) continue;
        try {
          const text = await readCurrentText(path);
          const notes = extractNotes(text);
          if (!notes.trim()) continue;
          sources.weekNotes.push({ name: week.name, week: Number(week.name.slice(-2)), notes });
          if (isSensitive(path, text)) sources.sensitive = true;
        } catch (err) {
          console.warn(`Rollup: couldn't read ${path}`, err);
        }
      }
    }
    return sources;
  }, [store, readCurrentText, preferredFolder]);

  return { loadSources, preferredFolder };
}
