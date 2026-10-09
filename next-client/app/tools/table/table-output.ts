import { evaluateTable, isFormulaCell } from "@/app/editor/utils/formula-engine";
import { parseTable } from "@/app/editor/utils/tableParser";
import { serializeTable } from "@/app/editor/utils/tableSerializer";

// The table generator's Markdown output. Cells may hold spreadsheet
// formulas (`=SUM(B2:B4)`), which the grid evaluates as you type; plain
// Markdown can't, so the copied table can carry the results instead.
// Kept in the table folder so other tool pages don't load the formula
// engine.

export type FormulaOutput = "results" | "formulas";

// Table-only blocks of the text (every line a `|` row), as parsed tables;
// other blocks are left alone. parseTable skips lines without a pipe, which
// would drop a paragraph beside a table, hence the check.
function mapTables(markdown: string, transform: (block: string) => string): string {
  return markdown
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.trim().split("\n");
      return lines.every((line) => line.trim().startsWith("|")) ? transform(block.trim()) : block;
    })
    .join("\n\n")
    .trim();
}

export function hasFormulas(markdown: string): boolean {
  return markdown.split("\n").some((line) => line.split("|").some((cell) => isFormulaCell(cell)));
}

// Aligns every table's columns; with "results", each formula cell becomes
// its computed value (an error shows as #REF!, #VALUE! …, as in the grid).
export function tableOutput(markdown: string, formulas: FormulaOutput = "formulas"): string {
  return mapTables(markdown, (block) => {
    const data = parseTable(block);
    if (!data) return block;
    if (formulas === "formulas") return serializeTable(data);
    const results = evaluateTable(data);
    const rows = data.rows.map((row, r) =>
      row.map((cell, c) => results.get(`${r + 2}_${c}`)?.display ?? cell),
    );
    return serializeTable({ ...data, rows });
  });
}
