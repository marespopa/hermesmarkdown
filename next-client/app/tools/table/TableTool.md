# TableTool

Description: The Markdown table generator at `/tools/markdown-table-generator`. Columns (1–20) and Rows (1–100) fields with **New table** (an empty table of that size, as one undoable change; sizes are clamped only when it's made), `TableCsvImport`, the grid (`TableGridEditor`, the editor's own table widget), and the aligned Markdown (`tableOutput`, `table-output.ts`) with **Copy Markdown**. Cells starting with `=` are spreadsheet formulas, evaluated in the grid by the editor's formula engine; when the table has any, a **Results / Formulas** switch picks what the output and Copy carry (Results by default, since plain Markdown can't calculate), and a note says formulas keep calculating in the editor. Ends with `TableOpenButton`. With no table left (the menu's Delete table), Copy and Open are disabled and a hint says to start a new table.

## Local State & Storage
- State: `atom_tableToolMarkdown`, local `formulaOutput` (`null` until edited, which shows `DEFAULT_TOOL_TABLE`, an empty 3 × 2 table), local size fields and the replace request.
- Persistence: this tab's sessionStorage (`hermes_tool_table`).

## Dependencies
- Core: `TableGridEditor`, `TableCsvImport`, `TableOpenButton`, `Input`, `Button`, `showCopyToast` / `showErrorToast`, `createEmptyTable`.
- Zero-Cloud: runs in the browser; the clipboard is the only outside API.

## Quick Usage
```tsx
<TableToolLoader /> // loads this client-only, with a skeleton
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) | | | |
