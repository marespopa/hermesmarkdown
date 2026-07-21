import type { Ctx } from "@milkdown/kit/ctx";
import type { EditorView } from "@milkdown/kit/prose/view";
import { Plugin } from "@milkdown/kit/prose/state";
import { $ctx, $prose } from "@milkdown/kit/utils";
import { cellAround, TableMap } from "@milkdown/kit/prose/tables";

export interface MilkdownTableInfo {
  tablePos: number;
  colIdx: number;
  rowIdx: number;
  colCount: number;
  isOnHeader: boolean;
  canRemoveRow: boolean;
  canRemoveCol: boolean;
  cursorDataRowNumber: number;
  currentAlignment: "left" | "center" | "right";
  // Viewport-relative coordinates (from view.coordsAtPos), left to the
  // caller (useMilkdownTable) to translate into container-relative
  // positioning for the floating TableCallout — same split as
  // use-codemirror-table.ts's detectTableAtCaret. Anchored to the caret's
  // own row (not the table header) so the toolbar tracks the cursor as it
  // moves between rows, rather than sitting pinned at the top of the table.
  caretTop: number;
  caretLeft: number;
}

// Passes the live EditorView alongside the info so the React-side hook can
// dispatch table-actions.ts transactions later (on a toolbar click) without
// needing its own separate way to reach into Milkdown's ctx.
type TableCalloutUpdateHandler = (info: MilkdownTableInfo | null, view: EditorView) => void;

export const onTableCalloutUpdateCtx = $ctx<TableCalloutUpdateHandler | undefined, "onTableCalloutUpdate">(
  undefined,
  "onTableCalloutUpdate",
);

export function configureTableCalloutUpdate(ctx: Ctx, onUpdate?: TableCalloutUpdateHandler) {
  ctx.set(onTableCalloutUpdateCtx.key, onUpdate);
}

function computeTableInfo(view: EditorView): MilkdownTableInfo | null {
  const { state } = view;
  if (!state.selection.empty) return null;

  const $from = state.selection.$from;
  const $cell = cellAround($from);
  if (!$cell) return null;

  const table = $cell.node(-1);
  if (!table || table.type.name !== "table") return null;
  const tableContentStart = $cell.start(-1);
  const tablePos = tableContentStart - 1;

  const map = TableMap.get(table);
  let rect: { left: number; top: number };
  try {
    rect = map.findCell($cell.pos - tableContentStart);
  } catch {
    return null;
  }

  const caretCoords = view.coordsAtPos($from.pos);
  const headerCell = table.child(0).maybeChild(rect.left);
  const currentAlignment = (headerCell?.attrs.alignment as "left" | "center" | "right") || "left";

  return {
    tablePos,
    colIdx: rect.left,
    rowIdx: rect.top,
    colCount: map.width,
    isOnHeader: rect.top === 0,
    canRemoveRow: rect.top > 0,
    canRemoveCol: map.width > 1,
    cursorDataRowNumber: rect.top,
    currentAlignment,
    caretTop: caretCoords.top,
    caretLeft: caretCoords.left,
  };
}

// Rendered-mode counterpart to use-codemirror-table.ts's detectTableAtCaret:
// tracks which table/cell the cursor is in so a floating TableCallout can
// follow it. Implemented as a $prose plugin's `view()` lifecycle (rather
// than reading state in React) because it needs `view.coordsAtPos`, which
// only exists on the live EditorView — same ctx-callback bridge pattern as
// wikilink-click.ts and date-picker.ts.
export const tableCalloutPlugin = $prose((ctx) => {
  return new Plugin({
    view: (view: EditorView) => {
      const notify = () => ctx.get(onTableCalloutUpdateCtx.key)?.(computeTableInfo(view), view);
      notify();
      return { update: notify };
    },
  });
});
