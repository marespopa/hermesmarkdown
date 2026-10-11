"use client";

import { useAtomValue } from "jotai";
import { atom_activeFilePath } from "@/app/atoms/file-atoms";
import { useRegisterCommand, type Command } from "@/app/components/CommandPalette/CommandPaletteContext";
import { parseRollupName } from "@/app/utils/rollup/period";
import { useRollups, type RollupTarget } from "./use-rollups";

interface UseRollupCommandsOptions {
  /** Why the period commands can't run (no vault, vault loading); undefined = enabled. */
  disabledReason?: string;
  /** Runs before a sheet opens: closes the home feed and saves a draft with text. */
  beforeOpen: () => Promise<void>;
}

const WEEK_KEYWORDS = "week weekly rollup review status report worklog summary";
const MONTH_KEYWORDS = "month monthly rollup review status report worklog summary";

// The palette's rollup commands: This/Last week's sheet, This/Last month's
// sheet (Navigation), and Refresh rollup (Document), which is registered only
// while the active tab is a weekly (`2026-W41.md`) or monthly (`2026-10.md`)
// sheet. No shortcuts: these run once a week or month.
export function useRollupCommands({ disabledReason, beforeOpen }: UseRollupCommandsOptions) {
  const { openRollup, refreshRollup } = useRollups();
  const activePath = useAtomValue(atom_activeFilePath);

  const periodCommand = (id: string, label: string, keywords: string, target: RollupTarget): Command => ({
    id,
    label,
    category: "Navigation",
    keywords,
    disabledReason,
    action: async () => {
      await beforeOpen();
      await openRollup(target);
    },
  });

  useRegisterCommand(periodCommand("open-this-week-sheet", "This week's sheet", WEEK_KEYWORDS, { kind: "week", offset: 0 }));
  useRegisterCommand(periodCommand("open-last-week-sheet", "Last week's sheet", WEEK_KEYWORDS, { kind: "week", offset: -1 }));
  useRegisterCommand(periodCommand("open-this-month-sheet", "This month's sheet", MONTH_KEYWORDS, { kind: "month", offset: 0 }));
  useRegisterCommand(periodCommand("open-last-month-sheet", "Last month's sheet", MONTH_KEYWORDS, { kind: "month", offset: -1 }));

  const isRollupSheet = !!activePath && parseRollupName(activePath.split("/").pop() ?? "") !== null;
  useRegisterCommand(isRollupSheet && activePath ? {
    id: "refresh-rollup",
    label: "Refresh rollup",
    category: "Document",
    keywords: "rollup refresh regenerate weekly monthly summary",
    action: () => refreshRollup(activePath),
  } : null);
}
