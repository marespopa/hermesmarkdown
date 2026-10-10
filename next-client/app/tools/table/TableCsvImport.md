# TableCsvImport

Description: The table generator's **From CSV or spreadsheet** panel. Closed, it's a button; open, a monospace textarea with **Convert** and **Cancel**. Text with consistent comma or tab columns (`detectDelimitedTable`; spreadsheet copies are tab-separated) becomes a Markdown table (`delimitedTextToMarkdownTable`, first row as header) passed to `onConvert`, and the panel closes. Other text shows "Couldn't find comma- or tab-separated columns." and leaves the grid alone.

## Local State & Storage
- State: open, text, error (useState). Persistence: none.

## Quick Usage
```tsx
<TableCsvImport onConvert={(table) => replace(table)} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| onConvert | `(table: string) => void` | | Receives the Markdown table |
