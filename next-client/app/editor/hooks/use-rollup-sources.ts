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
import { childPeriods, datesInPeriod, parseRollupName, type RollupPeriod } from "@/app/utils/rollup/period";
import type { DoneElsewhere } from "@/app/utils/rollup/collect";
import type { ChildNotes } from "@/app/utils/rollup/render";
import { extractNotes } from "@/app/utils/rollup/sections";

export interface RollupSources {
  // `sensitive`: the sheet is private (AI Chat's weekly review leaves it out).
  sheets: { date: string; text: string; sensitive?: boolean }[];
  // Notes of the sheets one level down (a month's weeks, a quarter's months, a year's quarters).
  childNotes: ChildNotes[];
  // Daily sheets that couldn't be read (skipped).
  failed: number;
  // Any source sheet is sensitive.
  sensitive: boolean;
  // The period's first and last day, and tasks done in it in other notes
  // (by their @done stamp; private notes left out), for collectRollup.
  range: { first: string; last: string };
  doneElsewhere: DoneElsewhere[];
}

// What a rollup is built from. Daily sheets are found by file name anywhere
// in the vault and read with a fresh handle; a sheet open in a tab is read as
// that tab shows it after reconciling with disk (the tab isn't changed). A
// month also reads the Notes of the weekly sheets whose Thursday is in it, a
// quarter its monthly sheets' and a year its quarterly sheets'.
// "Week 41", "October", "Q4": a child sheet's subsection title.
function childLabel(child: RollupPeriod): string {
  if (child.kind === "week") return `Week ${Number(child.name.slice(-2))}`;
  if (child.kind === "month") return child.start.toLocaleDateString(undefined, { month: "long" });
  return child.name.slice(-2);
}

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
    const days = datesInPeriod(period);
    const range = { first: days[0], last: days[days.length - 1] };
    const sources: RollupSources = { sheets: [], childNotes: [], failed: 0, sensitive: false, range, doneElsewhere: [] };
    const picked = pickDailySheets(paths, period, preferredFolder, skip);
    const pickedPaths = new Set(picked.map((sheet) => sheet.path));

    // Done in the period elsewhere: from the index, no reads. Rollup sheets
    // hold no task lines; private notes stay out of the (shareable) rollup.
    for (const file of Object.values(meta)) {
      if (pickedPaths.has(file.path) || skip(file.path) || isSensitiveFrontmatter(file.frontmatter)) continue;
      if (parseRollupName(file.path.split("/").pop() ?? "")) continue;
      for (const task of file.tasks || []) {
        if (task.status !== "done" || !task.doneDate || task.doneDate < range.first || task.doneDate > range.last) continue;
        sources.doneElsewhere.push({ note: file.name.replace(/\.md$/i, ""), doneDate: task.doneDate, line: task.line, text: task.text, tags: task.tags });
      }
    }

    for (const { date, path } of picked) {
      try {
        const text = await readCurrentText(path);
        const sensitive = isSensitive(path, text);
        sources.sheets.push({ date, text, sensitive });
        if (sensitive) sources.sensitive = true;
      } catch (err) {
        console.warn(`Rollup: couldn't read ${path}`, err);
        sources.failed++;
      }
    }

    for (const child of childPeriods(period)) {
      const path = findSheetByName(paths, `${child.name}.md`, preferredFolder(child.anchor));
      if (!path || skip(path)) continue;
      try {
        const text = await readCurrentText(path);
        const notes = extractNotes(text);
        if (!notes.trim()) continue;
        sources.childNotes.push({ name: child.name, label: childLabel(child), notes });
        if (isSensitive(path, text)) sources.sensitive = true;
      } catch (err) {
        console.warn(`Rollup: couldn't read ${path}`, err);
      }
    }
    return sources;
  }, [store, readCurrentText, preferredFolder]);

  return { loadSources, preferredFolder };
}
