import { FUNCTIONS } from "./formula-engine";

// What the AI features need to know about table formulas (see
// formula-engine.ts). The function list is read from the engine itself so
// the prompts can never advertise a function that doesn't exist.

export const FORMULA_FUNCTION_NAMES = Object.keys(FUNCTIONS);

// For every AI action that rewrites existing text.
export const FORMULA_PRESERVATION_RULE =
  "IMPORTANT: Table cells that start with \"=\" are live HermesMarkdown formulas (e.g. =SUM(B2:B5), =AVERAGE(C), =Income!B3). The app computes and displays their results. NEVER evaluate a formula or replace it with a number. Keep every formula exactly as written, including its cell references.";

// For AI features that may create or restructure tables (chat, builder).
export const TABLE_FORMULA_GUIDE = `HermesMarkdown tables are Markdown pipe tables with spreadsheet formulas.
Table structure (a table that breaks these rules renders as plain text):
- Leave a blank line before and after every table. A table directly under a line of text is not a table.
- First line is the header row, second is the delimiter row (|---|---|), and every row has the same number of cells.
- Titles and section names above tables must be real Markdown headings (## Kanban Board), each followed by a blank line. Plain text lines are not headings and don't name a table.
Formulas:
- A cell whose text starts with "=" is a formula. The file stores the formula; the editor shows its computed result.
- Addressing: columns are letters A, B, C… from the left. The header row is row 1, so the first data row is row 2 (A1 = first header cell, B2 = second column of the first data row).
- References:
  - one cell: =B2
  - a range, only as a function argument: =SUM(B2:B5), =AVERAGE(B2:D2)
  - a whole column: =SUM(B). This skips the formula's own row, so it works for a total at the bottom of that column.
  - another table in the same note, named by the Markdown heading directly above it: =Income!B3, =SUM(Income!B). If the heading contains spaces or punctuation, quote it: ="Kanban Board"!B2, =COUNTA("Kanban Board"!A)
  - a table in another note: =[[Budget]]!B5, or =[[Budget#Income]]!B5 when that note has several tables
- Functions (use only these exact names): ${FORMULA_FUNCTION_NAMES.join(", ")}. For example, use AVERAGE, not AVG. IF takes (condition, then, else).
- Operators: + - * / and comparisons = <> < > <= >=. Parentheses group.
- Values like $2,000 or 1000 RON count as numbers, and totals keep their currency.
- Totals: put them in a final row labelled in its first cell, e.g. | Total | =SUM(B2:B4) |. Ranges should cover exactly the data rows above. When you add or remove rows, update ranges to match.
- Never replace a formula with its computed value. Never make a formula reference its own cell.
- Errors the user may ask about: #REF! (a reference outside the table or an unknown table), #DIV/0!, #CIRCULAR! (formulas that depend on each other in a loop), #NAME? (unknown function), #VALUE! (invalid formula or value).
- Escape a literal "|" inside a cell as \\|.`;
