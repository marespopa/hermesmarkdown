// `/daily` in an editor pane opens today's sheet through this document
// event; the editor page (page.tsx) handles it, since it owns the
// page-level "open today's sheet".

export const OPEN_TODAY_SHEET_EVENT = "hermes:open-today-sheet";

export function requestOpenTodaySheet() {
  document.dispatchEvent(new CustomEvent(OPEN_TODAY_SHEET_EVENT));
}
