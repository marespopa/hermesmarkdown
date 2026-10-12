"use client";

import { useCallback } from "react";
import { useStore } from "jotai";
import toast from "react-hot-toast";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_rollupStatus } from "@/app/atoms/ui-atoms";
import { atom_vaultHandle, resolveFileHandleAtPath } from "@/app/atoms/vault-atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useNoteBuffer } from "@/app/hooks/file-system/use-note-buffer";
import { findExisting } from "@/app/hooks/file-system/use-template-create";
import { findSheetByName } from "@/app/utils/today-note";
import { collectRollup } from "@/app/utils/rollup/collect";
import { parseRollupName, periodOf, type RollupKind, type RollupPeriod } from "@/app/utils/rollup/period";
import { renderGeneratedBody, renderNewSheet } from "@/app/utils/rollup/render";
import { generatedRegion, spliceGenerated } from "@/app/utils/rollup/sections";
import { addedItemLines } from "@/app/utils/rollup/items";
import { useRollupSources, type RollupSources } from "./use-rollup-sources";

export type RollupTarget = { kind: RollupKind; offset: 0 | -1 };

export const MARKERS_MISSING_MESSAGE =
  "Can't refresh: the rollup:start / rollup:end lines are missing. Delete the sheet and run the command again to rebuild it.";

class MarkersMissing extends Error {}

const SHEET_TITLE: Record<RollupKind, string> = {
  week: "Weekly sheet",
  month: "Monthly sheet",
  quarter: "Quarterly sheet",
  year: "Yearly sheet",
};

const unreadable = (count: number) => `${count} daily sheet${count === 1 ? "" : "s"} couldn't be read`;

const bodyFor = (period: RollupPeriod, sources: RollupSources) =>
  renderGeneratedBody(period, collectRollup(sources.sheets), sources.childNotes);

// Weekly, monthly, quarterly and yearly rollup sheets. `openRollup` opens a period's sheet as
// is, or generates, writes and opens it when it doesn't exist yet (in the
// Daily Sheets folder for the week's Thursday / the period's first day).
// `refreshRollup` regenerates only the region between the rollup:start and
// rollup:end lines of an existing sheet, through the open tab's buffer when
// it's open (disk wins, no conflict prompt), keeping every other byte.
// `quiet` (the refresh on open) shows no toasts and leaves a sheet without
// markers alone. An existing sheet opened through `openRollup` is refreshed
// before it shows, so it never flashes stale numbers. Every rebuild records
// its time and the item lines it added in atom_rollupStatus.
export function useRollups() {
  const store = useStore();
  const { openFile, writeNewNote, resolveSheetFolder, indexVaultTags } = useFileSystem();
  const { writeThrough } = useNoteBuffer();
  const { loadSources, preferredFolder } = useRollupSources();

  const markRefreshed = useCallback((path: string, fresh: string[]) => {
    store.set(atom_rollupStatus, (prev) => ({ ...prev, [path]: { at: Date.now(), fresh } }));
  }, [store]);

  const refreshRollup = useCallback(async (path: string, { quiet = false }: { quiet?: boolean } = {}) => {
    const period = parseRollupName(path.split("/").pop() ?? path);
    const vaultHandle = store.get(atom_vaultHandle);
    if (!period || !vaultHandle) return;
    try {
      const handle = await resolveFileHandleAtPath(vaultHandle, path);
      const sources = await loadSources(period);
      const body = bodyFor(period, sources);
      let fresh: string[] = [];
      const { result } = await writeThrough(path, handle, (text) => {
        const next = spliceGenerated(text, body);
        if (next === null) throw new MarkersMissing();
        fresh = addedItemLines(generatedRegion(text), body);
        return next === text ? null : next;
      });
      if (result !== "failed") markRefreshed(path, result === "written" ? fresh : []);
      if (result === "written") void indexVaultTags().catch((err) => console.warn("Rollup: reindex failed", err));
      if (quiet) return;
      const suffix = sources.failed ? ` · ${unreadable(sources.failed)}` : "";
      if (result === "unchanged") {
        toast(`Rollup is up to date${suffix}`, { id: "rollup-refresh" });
      } else if (result === "written") {
        toast.success(sources.failed ? `Refreshed${suffix}` : "Rollup refreshed", { id: "rollup-refresh" });
      }
      // "failed": saveFile has already reported why.
    } catch (err) {
      if (quiet) {
        if (!(err instanceof MarkersMissing)) console.warn("Rollup refresh on open failed:", err);
        return;
      }
      if (err instanceof MarkersMissing) {
        toast.error(MARKERS_MISSING_MESSAGE, { id: "rollup-refresh", duration: 8000 });
        return;
      }
      console.warn("Rollup refresh failed:", err);
      toast.error("Couldn't refresh the rollup", { id: "rollup-refresh" });
    }
  }, [store, writeThrough, loadSources, indexVaultTags, markRefreshed]);

  const openRollup = useCallback(async ({ kind, offset }: RollupTarget, now: Date = new Date()) => {
    const vaultHandle = store.get(atom_vaultHandle);
    if (!vaultHandle) return;
    const period = periodOf(kind, now, offset);
    const paths = Object.keys(store.get(atom_fileMetadata));
    const existingPath = findSheetByName(paths, `${period.name}.md`, preferredFolder(period.anchor));
    if (existingPath) {
      try {
        const handle = await findExisting(vaultHandle, existingPath);
        if (handle) {
          await refreshRollup(existingPath, { quiet: true });
          await openFile(handle, existingPath, true);
          return;
        }
      } catch (err) {
        console.warn("Rollup: couldn't open", existingPath, err);
      }
      // A stale index entry falls through to the create.
    }
    const folder = await resolveSheetFolder(period.anchor, SHEET_TITLE[kind]);
    if (folder === null) return;
    const sources = await loadSources(period);
    const sheet = renderNewSheet(period, bodyFor(period, sources), sources.sensitive);
    const created = await writeNewNote(folder, period.name, sheet, { unique: false, open: true });
    if (created) markRefreshed(created.path, []);
    if (created && sources.failed) toast.error(unreadable(sources.failed));
  }, [store, openFile, writeNewNote, resolveSheetFolder, loadSources, preferredFolder, refreshRollup, markRefreshed]);

  return { openRollup, refreshRollup };
}
