"use client";

import { useAtomValue } from "jotai";
import { atom_activeFilePath } from "@/app/atoms/file-atoms";
import { useRegisterCommand, type Command } from "@/app/components/CommandPalette/CommandPaletteContext";
import { parseRollupName } from "@/app/utils/rollup/period";
import { useRollups, type RollupTarget } from "./use-rollups";
import { useRollupLiveRefresh } from "./use-rollup-live-refresh";
import { useRollupItemActions } from "./use-rollup-item-actions";

interface UseRollupCommandsOptions {
  /** Why the period commands can't run (no vault, vault loading); undefined = enabled. */
  disabledReason?: string;
  /** Runs before a sheet opens: closes the home feed and saves a draft with text. */
  beforeOpen: () => Promise<void>;
}

const WEEK_KEYWORDS = "week weekly rollup review status report worklog summary";
const MONTH_KEYWORDS = "month monthly rollup review status report worklog summary";
const QUARTER_KEYWORDS = "quarter quarterly rollup review retrospective strategy worklog summary";
const YEAR_KEYWORDS = "year yearly annual rollup review retrospective reflection worklog summary";

// The palette's rollup commands: This/Last week's, month's, quarter's and
// year's sheet (Navigation), and Refresh rollup (Document), which is
// registered only while the active tab is a rollup sheet (`2026-W41.md`,
// `2026-10.md`, `2026-Q4.md`, `2026-year.md`). No shortcuts: these run once a
// period. Also mounts what keeps rollup sheets current (useRollupLiveRefresh)
// and what their items do in the editor (useRollupItemActions).
export function useRollupCommands({ disabledReason, beforeOpen }: UseRollupCommandsOptions) {
  const { openRollup, refreshRollup } = useRollups();
  const activePath = useAtomValue(atom_activeFilePath);
  useRollupLiveRefresh(!disabledReason);
  useRollupItemActions();

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
  useRegisterCommand(periodCommand("open-this-quarter-sheet", "This quarter's sheet", QUARTER_KEYWORDS, { kind: "quarter", offset: 0 }));
  useRegisterCommand(periodCommand("open-last-quarter-sheet", "Last quarter's sheet", QUARTER_KEYWORDS, { kind: "quarter", offset: -1 }));
  useRegisterCommand(periodCommand("open-this-year-sheet", "This year's sheet", YEAR_KEYWORDS, { kind: "year", offset: 0 }));
  useRegisterCommand(periodCommand("open-last-year-sheet", "Last year's sheet", YEAR_KEYWORDS, { kind: "year", offset: -1 }));

  const isRollupSheet = !!activePath && parseRollupName(activePath.split("/").pop() ?? "") !== null;
  useRegisterCommand(isRollupSheet && activePath ? {
    id: "refresh-rollup",
    label: "Refresh rollup",
    category: "Document",
    keywords: "rollup refresh regenerate weekly monthly quarterly yearly summary",
    action: () => refreshRollup(activePath),
  } : null);
}
