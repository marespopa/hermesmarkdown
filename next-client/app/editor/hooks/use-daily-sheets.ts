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
import { preferredSheetFolder } from "@/app/utils/today-note";
import { pickDailySheets } from "@/app/utils/periods/daily-sheets";
import type { Period } from "@/app/utils/periods/period";

export interface DailySheetText {
  date: string; // "YYYY-MM-DD"
  text: string;
  sensitive: boolean; // private: AI Chat leaves it out
}

// A period's daily sheets, for AI Chat's weekly review: found by file name
// anywhere in the vault (skipping `.hermes/` and templates) and read as their
// open tab shows them after reconciling with disk (the tab isn't changed).
// Sheets that can't be read are skipped. Oldest first.
export function useDailySheets() {
  const store = useStore();
  const { readCurrentText } = useNoteBuffer();

  const loadDailySheets = useCallback(async (period: Period): Promise<DailySheetText[]> => {
    const meta = store.get(atom_fileMetadata);
    const templatesFolder = store.get(atom_templatesFolder).folder;
    const skip = (path: string) => path.startsWith(".hermes/") || isTemplatePath(path, templatesFolder);
    const preferred = (date: Date) =>
      normalizeFolderPath(preferredSheetFolder(store.get(atom_todayFolder), store.get(atom_newNoteFolder), date));
    const sheets: DailySheetText[] = [];
    for (const { date, path } of pickDailySheets(Object.keys(meta), period, preferred, skip)) {
      try {
        const text = await readCurrentText(path);
        sheets.push({ date, text, sensitive: isSensitiveFrontmatter(meta[path]?.frontmatter) || isSensitiveContent(text) });
      } catch (err) {
        console.warn(`Weekly review: couldn't read ${path}`, err);
      }
    }
    return sheets;
  }, [store, readCurrentText]);

  return { loadDailySheets };
}
