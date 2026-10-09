"use client";

import { useState } from "react";
import { useAtom } from "jotai";
import { atom_tableToolMarkdown } from "@/app/atoms/tool-atoms";
import Button from "@/app/components/Button";
import Input from "@/app/components/Input";
import { showCopyToast, showErrorToast } from "@/app/components/Toastr";
import { createEmptyTable } from "@/app/editor/utils/table-manipulation";
import { hasFormulas, tableOutput, type FormulaOutput } from "./table-output";
import { DEFAULT_TOOL_TABLE } from "./default-table";
import TableCsvImport from "./TableCsvImport";
import TableGridEditor, { type ReplaceRequest } from "./TableGridEditor";
import TableOpenButton from "./TableOpenButton";

const MAX_COLS = 20;
const MAX_ROWS = 100;
// Sizes are typed freely and clamped only when a table is made.
const clamp = (value: string, max: number) => Math.min(max, Math.max(1, Math.round(Number(value)) || 1));

// The Markdown table generator: the editor's own table grid (with its
// spreadsheet formulas), a size picker for a fresh table, CSV / spreadsheet
// import, and the aligned Markdown, formulas as results or as written, with
// Copy and Open in HermesMarkdown. The document persists in this tab
// (atom_tableToolMarkdown).
export default function TableTool() {
  const [stored, setStored] = useAtom(atom_tableToolMarkdown);
  const doc = stored ?? DEFAULT_TOOL_TABLE;
  const [cols, setCols] = useState("3");
  const [rows, setRows] = useState("2");
  const [replaceRequest, setReplaceRequest] = useState<ReplaceRequest | null>(null);
  // Plain Markdown can't calculate, so copies carry results by default.
  const [formulaOutput, setFormulaOutput] = useState<FormulaOutput>("results");
  const withFormulas = hasFormulas(doc);
  const output = tableOutput(doc, withFormulas ? formulaOutput : "formulas");

  const replace = (next: string) => setReplaceRequest({ doc: next, id: (replaceRequest?.id ?? 0) + 1 });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      showCopyToast("Markdown copied");
    } catch {
      showErrorToast("Couldn't copy. Select the Markdown and copy it instead.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <Input
          name="table-cols"
          label="Columns"
          type="number"
          value={cols}
          validation={{ min: 1, max: MAX_COLS }}
          handleChange={(event) => setCols(event.target.value)}
          className="!w-28 !my-0"
        />
        <Input
          name="table-rows"
          label="Rows"
          type="number"
          value={rows}
          validation={{ min: 1, max: MAX_ROWS }}
          handleChange={(event) => setRows(event.target.value)}
          className="!w-28 !my-0"
        />
        <Button variant="secondary" onClick={() => replace(createEmptyTable(clamp(cols, MAX_COLS), clamp(rows, MAX_ROWS)))}>
          New table
        </Button>
        <TableCsvImport onConvert={replace} />
      </div>

      <div className="rounded-2xl overflow-hidden">
        <TableGridEditor value={doc} onChange={setStored} replaceRequest={replaceRequest} />
      </div>
      <p className="text-ui-footnote text-fg-muted">
        Click a cell to type. Tab and Enter move between cells; right-click a cell, or use the
        handles on the table&apos;s edges, to add, move, sort or align rows and columns. Start a
        cell with <code className="font-mono">=</code> to calculate, like{" "}
        <code className="font-mono">=SUM(B2:B4)</code> or <code className="font-mono">=AVERAGE(C)</code>.
      </p>

      <div className="rounded-2xl border border-edge-subtle bg-surface-raised p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-ui-subhead font-semibold">Markdown</h2>
          <div className="flex flex-wrap items-center gap-2">
            {withFormulas && (
              <div className="flex gap-1 p-1 rounded-full bg-black/[0.05] dark:bg-white/[0.07]" role="group" aria-label="Formula cells">
                {(["results", "formulas"] as const).map((mode) => (
                  <Button
                    key={mode}
                    variant="unstyled"
                    aria-pressed={formulaOutput === mode}
                    onClick={() => setFormulaOutput(mode)}
                    className={`h-7 px-3 rounded-full text-ui-footnote font-semibold transition-colors ${
                      formulaOutput === mode ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg"
                    }`}
                  >
                    {mode === "results" ? "Results" : "Formulas"}
                  </Button>
                ))}
              </div>
            )}
            <Button variant="outlined" className="h-8 px-3 rounded-full" onClick={copy} isDisabled={!output}>
              Copy Markdown
            </Button>
          </div>
        </div>
        {output ? (
          <pre className="font-mono text-ui-footnote text-fg overflow-x-auto whitespace-pre" aria-label="Markdown output">
            {output}
          </pre>
        ) : (
          <p className="text-ui-subhead text-fg-muted">No table yet. Start a new table above.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <TableOpenButton />
        {withFormulas && (
          <p className="text-ui-footnote text-fg-muted">Formulas keep calculating in the editor.</p>
        )}
      </div>
    </div>
  );
}
