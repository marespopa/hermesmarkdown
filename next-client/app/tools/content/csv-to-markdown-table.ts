import type { ToolEntry } from "./tools";

export const CSV_TO_MARKDOWN_TABLE: ToolEntry = {
  slug: "csv-to-markdown-table",
  name: "CSV to Markdown Table",
  title: "CSV to Markdown Table Converter | HermesMarkdown",
  description:
    "Turn CSV, TSV or cells copied from Excel, Numbers or Google Sheets into an aligned Markdown table, then edit it in a grid. Free, instant and private.",
  lead: "Paste a CSV export or spreadsheet cells and get a Markdown table you can still edit.",
  keywords: [
    "csv to markdown table",
    "csv to markdown",
    "excel to markdown table",
    "spreadsheet to markdown",
    "tsv to markdown",
    "google sheets to markdown table",
    "convert csv to md table",
  ],
  steps: [
    "Paste your CSV into the box, or copy a range of cells from a spreadsheet. The first row becomes the header.",
    "Press Convert. The table appears in the grid below, where you can fix cells, add columns and sort rows.",
    "Copy the aligned Markdown table, or open it in HermesMarkdown.",
  ],
  faq: [
    {
      q: "Which separators does it understand?",
      a: "Commas and tabs. Cells copied from Excel, Numbers or Google Sheets are tab-separated, so pasting a range works the same as pasting a CSV file's text. Quoted cells that contain commas are kept in one piece.",
    },
    {
      q: "Does the first row have to be a header?",
      a: "Markdown tables always have a header row, so the first row of your data is used for it. If your data has no header, add a row of column names on top before converting.",
    },
    {
      q: "Can I fix the table after converting?",
      a: "Yes. The result opens in the same spreadsheet-style grid as the Markdown Table Generator: click a cell to type, add or move rows and columns, sort, and set column alignment.",
    },
    {
      q: "What about commas and quotes inside a cell?",
      a: "Wrap the cell in double quotes, as spreadsheets do when they export CSV, and a comma inside it stays part of the cell. Two double quotes in a row stand for one quote character.",
    },
    {
      q: "Is there a size limit?",
      a: "The grid is meant for tables you will read and edit, of a size you will read and edit. A very large export is better kept as a CSV file; Markdown tables get hard to read long before they get hard to render.",
    },
    {
      q: "Is my data uploaded?",
      a: "No. Parsing and the grid run in your browser. The table is kept in this tab's session storage and is gone when you close the tab.",
    },
  ],
  related: [
    { slug: "markdown-table-generator", anchor: "Edit the table in a spreadsheet-style grid" },
    { slug: "markdown-cleaner", anchor: "Clean up pasted spreadsheet text first" },
  ],
  pitchLink: { anchor: "Edit tables with spreadsheet formulas inside our Markdown editor", href: "/documentation/tables" },
  features: [
    "CSV, TSV and spreadsheet cells to Markdown tables",
    "Quoted fields handled",
    "Editable spreadsheet-style grid",
    "Aligned Markdown output",
    "Runs entirely in the browser",
  ],
};
