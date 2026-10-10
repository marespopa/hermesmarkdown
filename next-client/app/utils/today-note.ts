// Today's worklog sheet: one note per day, named by the local date
// (`2026-10-09.md`), created in the Daily Sheets folder. That folder may hold
// `{{year}}` and `{{month}}`, for a folder per year or month.

const pad = (value: number) => String(value).padStart(2, "0");

// Offered the first time a sheet is started.
export const DEFAULT_TODAY_FOLDER = "journal/{{year}}";

// The Daily Sheets folder for `now`: `journal/{{year}}/{{month}}` →
// `journal/2026/10`. Not normalized.
export function resolveTodayFolder(pattern: string, now: Date): string {
  return pattern
    .replace(/\{\{\s*year\s*\}\}/gi, String(now.getFullYear()))
    .replace(/\{\{\s*month\s*\}\}/gi, pad(now.getMonth() + 1));
}

// The local date as `YYYY-MM-DD`, the sheet's file name without `.md`.
export function todayNoteName(now: Date): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// The heading of a new sheet made without a template: "Friday, October 9, 2026".
export function todayNoteHeading(now: Date): string {
  return now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

// The vault path of today's sheet, or null when there is none yet:
// `<folder>/<date>.md` when it exists, else any other note with that file
// name (sheets made before the folder changed), the shallowest path first.
export function findTodayNote(paths: Iterable<string>, now: Date, folder = ""): string | null {
  const fileName = `${todayNoteName(now)}.md`;
  const preferred = folder ? `${folder}/${fileName}` : fileName;
  let best: string | null = null;
  for (const path of paths) {
    if (path === preferred) return path;
    if (path.split("/").pop() !== fileName) continue;
    if (!best || path.split("/").length < best.split("/").length || (path.split("/").length === best.split("/").length && path < best)) {
      best = path;
    }
  }
  return best;
}
