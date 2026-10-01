import { FUNCTIONS } from "./formula-engine";

// What the AI features need to know about table formulas (see
// formula-engine.ts). The function list is read from the engine itself so
// the prompts can never advertise a function that doesn't exist.

export const FORMULA_FUNCTION_NAMES = Object.keys(FUNCTIONS);

// For every AI action that rewrites existing text.
export const FORMULA_PRESERVATION_RULE =
  "IMPORTANT: Table cells that start with \"=\" are live HermesMarkdown formulas (e.g. =SUM(B2:B5), =AVERAGE(C), =Income!B3). The app computes and displays their results. NEVER evaluate a formula or replace it with a number. Keep every formula exactly as written, including its cell references. The same goes for inline calculator lines (e.g. \"rent = 1200\", \"rent + utilities\", \"total + 15%\"): keep them as written and never append \"= result\" to them.";

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

// Worked example for NOTE_CALC_GUIDE; formula-ai-guide.test.ts checks the
// results against the real scanner, so the prompt can't drift from it.
export const NOTE_CALC_EXAMPLE = {
  lines: ["rent = 1200", "utilities = 180", "rent + utilities", "rent + utilities + 15%"],
  results: [null, null, "= 1380", "= 1587"],
};

// For AI features that write new note content (chat, continue writing, new
// note). Rules mirror utils/note-calc-scan.ts and utils/math-eval.ts.
export const NOTE_CALC_GUIDE = `HermesMarkdown also has an inline calculator for plain lines outside tables.
- A line holding a math expression shows its result at the end of the line, e.g. "120 * 12" is displayed with "= 1440". The result is shown by the app, not stored in the file.
- Variables: "name = expression" on its own line defines a variable for the lines below it. Names are one or more words, case-insensitive ("monthly rent = 1200"); "of" can't be part of a name. A name can be reassigned and may use its old value ("rent = rent + 100").
- Operators: + - * /, parentheses, "1,234" thousands separators, "450 + 15%" (adds 15% of the left side), "15% of 200", and any other "%" as a fraction (50% = 0.5).
- One leading list marker is allowed ("- rent + utilities"). Calculator lines are ignored inside code fences, $$ math blocks, frontmatter and headings.
- Example (the app shows the results on the right):
${NOTE_CALC_EXAMPLE.lines.map((line, i) => `  ${line}${NOTE_CALC_EXAMPLE.results[i] ? `   → shows ${NOTE_CALC_EXAMPLE.results[i]}` : ""}`).join("\n")}
- When the user wants quick sums, budgets or estimates in a note (not a table), write variables and expressions like this so the numbers stay live.
- NEVER write the result yourself: "rent + utilities = 1380" breaks the calculator and goes stale when a value changes. Write "rent + utilities" and let the app show the result.
- Don't put currency symbols or units inside calculator lines; name the variable instead ("rent ron = 1200" is fine, "rent = 1200 RON" is not).`;
