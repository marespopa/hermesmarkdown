// Picks a period's daily sheets from the vault index: every `YYYY-MM-DD.md`
// anywhere in the vault whose date is in the period, one file per date.

import { findSheetByName } from "../today-note";
import { datesInPeriod, type Period } from "./period";

const REGEX_DAILY_NAME = /^(\d{4})-(\d{2})-(\d{2})\.md$/;

export interface DailySheet {
  date: string; // "YYYY-MM-DD"
  path: string;
}

// `preferredFolder(date)` is the Daily Sheets folder for that date; when
// several files share a date, the one there wins, else the shallowest path,
// then by path (findSheetByName, the same sheet Today's sheet would open).
// `skip` leaves out paths that aren't notes (`.hermes/`, templates). Oldest first.
export function pickDailySheets(
  paths: Iterable<string>,
  period: Period,
  preferredFolder: (date: Date) => string,
  skip: (path: string) => boolean = () => false,
): DailySheet[] {
  const wanted = new Set(datesInPeriod(period));
  const byDate = new Map<string, string[]>();
  for (const path of paths) {
    const match = REGEX_DAILY_NAME.exec(path.split("/").pop() ?? "");
    if (!match || skip(path)) continue;
    const date = `${match[1]}-${match[2]}-${match[3]}`;
    if (!wanted.has(date)) continue;
    byDate.set(date, [...(byDate.get(date) ?? []), path]);
  }
  const out: DailySheet[] = [];
  for (const [date, candidates] of byDate) {
    const [year, month, day] = date.split("-").map(Number);
    const path = findSheetByName(candidates, `${date}.md`, preferredFolder(new Date(year, month - 1, day)));
    if (path) out.push({ date, path });
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
