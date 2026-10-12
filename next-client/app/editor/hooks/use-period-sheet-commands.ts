"use client";

import { useRegisterCommand, type Command } from "@/app/components/CommandPalette/CommandPaletteContext";
import { usePeriodSheets, type PeriodTarget } from "./use-period-sheets";

interface UsePeriodSheetCommandsOptions {
  /** Why the period commands can't run (no vault, vault loading); undefined = enabled. */
  disabledReason?: string;
  /** Runs before a sheet opens: closes the home feed and saves a draft with text. */
  beforeOpen: () => Promise<void>;
}

const WEEK_KEYWORDS = "week weekly review status report worklog";
const MONTH_KEYWORDS = "month monthly review status report worklog";
const QUARTER_KEYWORDS = "quarter quarterly review retrospective strategy worklog";
const YEAR_KEYWORDS = "year yearly annual review retrospective reflection worklog";

// The palette's periodic sheet commands (Navigation): This/Last week's,
// month's, quarter's and year's sheet, opened or created from its template
// (usePeriodSheets). No shortcuts: these run once a period.
export function usePeriodSheetCommands({ disabledReason, beforeOpen }: UsePeriodSheetCommandsOptions) {
  const { openPeriodSheet } = usePeriodSheets();

  const periodCommand = (id: string, label: string, keywords: string, target: PeriodTarget): Command => ({
    id,
    label,
    category: "Navigation",
    keywords,
    disabledReason,
    action: async () => {
      await beforeOpen();
      await openPeriodSheet(target);
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
}
