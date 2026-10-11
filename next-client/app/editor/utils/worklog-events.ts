// Slash commands in an editor pane reach today's sheet through these
// document events; QuickJot (mounted once per page) handles them, since it
// owns the jot queue and the page-level "open today's sheet".

export const OPEN_TODAY_SHEET_EVENT = "hermes:open-today-sheet";
export const JOT_EVENT = "hermes:jot";

export function requestOpenTodaySheet() {
  document.dispatchEvent(new CustomEvent(OPEN_TODAY_SHEET_EVENT));
}

// `text` is appended to today's sheet; "" opens the Quick jot input instead.
export function requestJot(text: string) {
  document.dispatchEvent(new CustomEvent<{ text: string }>(JOT_EVENT, { detail: { text } }));
}
