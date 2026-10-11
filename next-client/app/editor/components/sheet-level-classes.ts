import type { SheetLevel } from "@/app/utils/sheet-nav";

// Each worklog sheet level's colour (day clay, week moss, month slate,
// quarter plum, year ochre; the
// `--sheet-*` tokens) as text, dot fill and underline. Static class names, so
// Tailwind keeps them.
export const SHEET_LEVEL_CLASSES: Record<SheetLevel, { text: string; dot: string; underline: string }> = {
  day: { text: "text-sheet-day", dot: "bg-sheet-day", underline: "after:bg-sheet-day" },
  week: { text: "text-sheet-week", dot: "bg-sheet-week", underline: "after:bg-sheet-week" },
  month: { text: "text-sheet-month", dot: "bg-sheet-month", underline: "after:bg-sheet-month" },
  quarter: { text: "text-sheet-quarter", dot: "bg-sheet-quarter", underline: "after:bg-sheet-quarter" },
  year: { text: "text-sheet-year", dot: "bg-sheet-year", underline: "after:bg-sheet-year" },
};
