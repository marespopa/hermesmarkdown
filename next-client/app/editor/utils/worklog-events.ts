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

// A rollup item's action from the editor (its checkbox, its day link):
// "toggle" checks the task off in its daily sheet, "open" opens that day
// with the caret on the task. useRollupItemActions handles it.
export const ROLLUP_ITEM_EVENT = "hermes:rollup-item";

export interface RollupItemRequest {
  path: string; // the rollup sheet
  line: string; // the item line's text
  action: "toggle" | "open";
}

export function requestRollupItem(detail: RollupItemRequest) {
  document.dispatchEvent(new CustomEvent<RollupItemRequest>(ROLLUP_ITEM_EVENT, { detail }));
}
