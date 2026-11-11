import type { ToolEntry } from "./tools";

export const MARKDOWN_TABLE_GENERATOR: ToolEntry = {
  slug: "markdown-table-generator",
  name: "Markdown Table Generator",
  title: "Markdown Table Generator: Free, Visual, Private | HermesMarkdown",
  description:
    "Build Markdown tables in a spreadsheet-style grid: add rows and columns, align, sort, paste from Excel or CSV, and copy clean GitHub-flavored Markdown. Free and private.",
  lead: "Edit a table like a spreadsheet and copy clean Markdown. No syntax to remember.",
  keywords: [
    "markdown table generator",
    "markdown table editor",
    "csv to markdown table",
    "excel to markdown table",
    "github markdown table",
    "markdown table online",
    "markdown table calculator",
  ],
  steps: [
    "Pick a size and press New table, or paste CSV or spreadsheet cells.",
    "Type in the cells, or start one with = to calculate. The edge handles add, move, sort and align.",
    "Copy the aligned Markdown, or open it in HermesMarkdown to keep writing.",
  ],
  faq: [
    {
      q: "What Markdown does it produce?",
      a: "GitHub-flavored Markdown tables: a header row, a separator row with the column alignment (:--, :-: or --:), and one line per row, padded so the columns line up in plain text too. It works on GitHub, GitLab, Obsidian, Notion imports and most Markdown editors.",
    },
    {
      q: "Can I paste from Excel or Google Sheets?",
      a: "Yes. Copy a range of cells and paste it into From CSV or spreadsheet: copied cells are tab-separated, and comma-separated CSV works too. The first row becomes the header. You can also paste a range straight into a cell of the grid.",
    },
    {
      q: "How do I add, move or align columns?",
      a: "Use the handles on the table's edges, or right-click a cell, for a menu to insert, delete, move, sort and align rows and columns. Alt+↑ and Alt+↓ move the current row; Ctrl or Cmd+Z undoes any change.",
    },
    {
      q: "Can the table calculate?",
      a: "Yes. Start a cell with = for a spreadsheet formula, such as =SUM(B2:B4), =AVERAGE(C) or =IF(B2>100, \"over\", \"ok\"). Columns are lettered from A and rows numbered from 1 at the header. SUM, AVERAGE, MIN, MAX, COUNT, ROUND, IF and more are supported, and currency amounts like $1,200 add up as money. When you copy, choose Results for plain Markdown anywhere, or Formulas to keep them.",
    },
    {
      q: "Is my data uploaded?",
      a: "No. The table generator runs entirely in your browser and your table is never sent to a server. It's kept only in this browser tab, so a refresh doesn't lose it.",
    },
    {
      q: "Can I keep editing it later?",
      a: "Yes. Open in HermesMarkdown carries the table into the editor as a draft, formulas included: the same grid keeps working and calculating there, and you can save it as a Markdown note on your device.",
    },
  ],
  features: [
    "Spreadsheet-style grid with keyboard navigation",
    "Spreadsheet formulas (SUM, AVERAGE, IF …) with results or formulas in the output",
    "Insert, delete, move, sort and align rows and columns",
    "CSV and spreadsheet paste",
    "Aligned GitHub-flavored Markdown output",
    "Runs entirely in the browser",
  ],
};
