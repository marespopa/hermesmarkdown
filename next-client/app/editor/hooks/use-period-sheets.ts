"use client";

import { useCallback } from "react";
import { useStore } from "jotai";
import toast from "react-hot-toast";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_newNoteFolder, atom_todayFolder } from "@/app/atoms/ui-atoms";
import { atom_templates } from "@/app/atoms/template-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useTemplateNotes } from "@/app/hooks/file-system/use-template-notes";
import { findExisting } from "@/app/hooks/file-system/use-template-create";
import { normalizeFolderPath } from "@/app/hooks/file-system/unique-file";
import { matchPeriodTemplate } from "@/app/utils/templates/template-registry";
import type { ExpandedTemplate } from "@/app/utils/templates/template-tokens";
import { findSheetByName, preferredSheetFolder } from "@/app/utils/today-note";
import { periodOf, type Period, type PeriodKind } from "@/app/utils/periods/period";

export type PeriodTarget = { kind: PeriodKind; offset: 0 | -1 };

const SHEET_TITLE: Record<PeriodKind, string> = {
  week: "Weekly sheet",
  month: "Monthly sheet",
  quarter: "Quarterly sheet",
  year: "Yearly sheet",
};

// A new sheet without a template: its heading, the caret on the line below.
function headingOnly(period: Period): ExpandedTemplate {
  const text = `# ${period.heading}\n\n`;
  return { text, cursor: text.length };
}

// Weekly, monthly, quarterly and yearly sheets: plain notes named by their
// period (`2026-W42.md`, `2026-10.md`, `2026-Q4.md`, `2026-year.md`).
// `openPeriodSheet` opens one as is, found by name anywhere (the Daily Sheets
// folder first), else creates it there (for the week's Thursday / the
// period's first day) from the Weekly / Monthly / Quarterly / Yearly
// template, dated by the period, or as a heading alone. The app never writes
// into a sheet after that: what goes in it is up to the user.
export function usePeriodSheets() {
  const store = useStore();
  const { openFile, writeNewNote, resolveSheetFolder } = useFileSystem();
  const { readTemplate, instantiate } = useTemplateNotes();

  // A new sheet's text; null when the template's questions were cancelled.
  const newSheetText = useCallback(async (period: Period): Promise<ExpandedTemplate | null> => {
    const entry = matchPeriodTemplate(period.kind, store.get(atom_templates));
    if (!entry) return headingOnly(period);
    let raw: string;
    try {
      raw = await readTemplate(entry);
    } catch (err) {
      console.warn("Periodic sheet: couldn't read template", entry.path, err);
      toast.error(`Couldn't read template ${entry.name}`);
      return headingOnly(period);
    }
    const result = await instantiate(raw, period.heading, "Create", "", { now: period.start, period });
    return result ? result.expanded : null;
  }, [store, readTemplate, instantiate]);

  const openPeriodSheet = useCallback(async ({ kind, offset }: PeriodTarget, now: Date = new Date()) => {
    const vaultHandle = store.get(atom_vaultHandle);
    if (!vaultHandle) return;
    const period = periodOf(kind, now, offset);
    const preferred = normalizeFolderPath(preferredSheetFolder(store.get(atom_todayFolder), store.get(atom_newNoteFolder), period.anchor));
    const existingPath = findSheetByName(Object.keys(store.get(atom_fileMetadata)), `${period.name}.md`, preferred);
    if (existingPath) {
      try {
        const handle = await findExisting(vaultHandle, existingPath);
        if (handle) {
          await openFile(handle, existingPath, true);
          return;
        }
      } catch (err) {
        console.warn("Periodic sheet: couldn't open", existingPath, err);
      }
      // A stale index entry falls through to the create.
    }
    const folder = await resolveSheetFolder(period.anchor, SHEET_TITLE[kind]);
    if (folder === null) return;
    const text = await newSheetText(period);
    if (text === null) return;
    await writeNewNote(folder, period.name, text, { unique: false, open: true });
  }, [store, openFile, writeNewNote, resolveSheetFolder, newSheetText]);

  return { openPeriodSheet };
}
