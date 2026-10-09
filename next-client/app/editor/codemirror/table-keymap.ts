import type { KeyBinding } from "@codemirror/view";
import {
  tableArrowVerticalCommand,
  tableDeleteRowCommand,
  tableEnterCommand,
  tableInsertRowCommand,
  tableMoveColumnCommand,
  tableMoveRowCommand,
  tablePipeEscapeCommand,
  tableShiftTabCommand,
  tableTabCommand,
} from "./table-commands";

// The table grid's keyboard model, shared by the editor (extensions.ts) and
// the table generator tool (app/tools/table). Each command returns false,
// falling through to the next binding, when the caret isn't in a table.
export const tableKeyBindings: KeyBinding[] = [
  { key: "Tab", run: tableTabCommand },
  { key: "Shift-Tab", run: tableShiftTabCommand },
  { key: "|", run: tablePipeEscapeCommand },
  { key: "Enter", run: tableEnterCommand },
  { key: "ArrowDown", run: (view) => tableArrowVerticalCommand(view, 1) },
  { key: "ArrowUp", run: (view) => tableArrowVerticalCommand(view, -1) },
  { key: "Alt-ArrowUp", run: (view) => tableMoveRowCommand(view, -1) },
  { key: "Alt-ArrowDown", run: (view) => tableMoveRowCommand(view, 1) },
  { key: "Mod-Alt-ArrowLeft", run: (view) => tableMoveColumnCommand(view, -1) },
  { key: "Mod-Alt-ArrowRight", run: (view) => tableMoveColumnCommand(view, 1) },
  { key: "Mod-Enter", run: tableInsertRowCommand },
  { key: "Mod-Shift-Backspace", run: tableDeleteRowCommand },
];
