// Tint and sign classes of the Changes page's diff rows. They mirror the
// theme of codemirror/git-changes.ts (the editor's inline diff): added lines
// on 22% of --task-done with a + in --task-done, removed lines on 16% of
// --danger with a − in --danger and their text in --fg-muted.
export const ADD_ROW = "bg-[color-mix(in_srgb,var(--task-done)_22%,transparent)]";
export const DEL_ROW = "bg-[color-mix(in_srgb,var(--danger)_16%,transparent)] text-fg-muted";
export const ADD_SIGN = "text-task-done";
export const DEL_SIGN = "text-danger";
export const CODE_FONT = "[font-family:var(--font-code)]";
