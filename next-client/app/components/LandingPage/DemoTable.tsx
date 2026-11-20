"use client";

import DemoFrame, { DemoCaret } from "./DemoFrame";
import { appliedSteps, useScriptLoop, type LoopState, type ScriptStep } from "./useScriptLoop";

// Keyboard table editing, drawn as the editor draws a table being edited
// (editor.scss `.cm-table-preview`, `.cm-table-editor`): the pipe syntax never
// shows, the cell being edited wears the clay ring, and the column letters and
// row numbers mark where the caret is. Tab at the last cell adds a row. The
// caret starts in the last cell.
export const TABLE_SCRIPT: readonly ScriptStep[] = [
  { pause: 700 },
  { key: "Tab" },
  { type: "Dark theme" },
  { key: "Tab" },
  { type: "In progress" },
  { key: "Tab" },
  { type: "Release notes" },
  { key: "Tab" },
  { type: "To do" },
  { pause: 2600 },
];

const LETTERS = ["A", "B"];

function play(state: LoopState) {
  const rows = [["Task", "Status"], ["Export to PDF", "Done"]];
  let row = 1;
  let col = 1;
  for (const step of appliedSteps(TABLE_SCRIPT, state)) {
    if ("type" in step) rows[row][col] += step.type;
    else if ("key" in step && step.key === "Tab") {
      if (col === 0) col = 1;
      else {
        rows.push(["", ""]);
        row += 1;
        col = 0;
      }
    }
  }
  return { rows, row, col };
}

export default function DemoTable() {
  const { ref, state } = useScriptLoop(TABLE_SCRIPT);
  const { rows, row, col } = play(state);
  const [header, ...body] = rows;
  // A cell: its ruler (a column letter above a header cell, a row number in
  // the margin beside a row's first cell) and, while edited, the ring and caret.
  const cell = (text: string, r: number, c: number) => {
    const editing = r === row && c === col;
    const Tag = r === 0 ? "th" : "td";
    return (
      <Tag key={c} data-source-cell className={`relative ${editing ? "cm-table-cell-editing" : ""}`}>
        {r === 0 && (
          <span className={`cm-table-ruler cm-table-ruler-col ${c === col ? "is-active" : ""}`} style={{ left: 0, right: 0, top: "-1.2rem" }}>
            {LETTERS[c]}
          </span>
        )}
        {c === 0 && (
          <span className={`cm-table-ruler cm-table-ruler-row ${r === row ? "is-active" : ""}`} style={{ left: "-1.6rem", top: 0, bottom: 0 }}>
            {r + 1}
          </span>
        )}
        {text}
        {editing && <DemoCaret />}
      </Tag>
    );
  };
  return (
    <DemoFrame frameRef={ref} label="A table being edited: Tab moves between cells, adds a row at the end, and the columns stay aligned.">
      <div className="cm-table-preview cm-table-editor">
        <div className="relative pt-[1.2rem]">
          <table>
            <thead>
              <tr>{header.map((text, c) => cell(text, 0, c))}</tr>
            </thead>
            <tbody>
              {body.map((cells, i) => (
                <tr key={i}>{cells.map((text, c) => cell(text, i + 1, c))}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DemoFrame>
  );
}
