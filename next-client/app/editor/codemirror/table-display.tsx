import type { ComponentPropsWithoutRef, MouseEvent } from "react";
import { createRoot, type Root } from "react-dom/client";
import ReactMarkdown, { type Components, type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import { EditorSelection, EditorState, Range, StateField } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import { Decoration, DecorationSet, EditorView, WidgetType } from "@codemirror/view";
import { parseTable } from "../utils/tableParser";
import {
  getTableCellOffsetsFromSource,
  type CellOffset,
} from "../utils/table-cell-offsets";

export interface TableDisplayMatch {
  from: number;
  to: number;
  source: string;
  cells: CellOffset[];
}

const TABLE_ELEMENTS = [
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "a",
  "em",
  "strong",
  "code",
  "del",
  "br",
  "img",
];

export function collectTableDisplayMatches(state: EditorState): TableDisplayMatch[] {
  const matches: TableDisplayMatch[] = [];

  syntaxTree(state).iterate({
    enter(node) {
      if (node.name !== "Table") return;
      const source = state.doc.sliceString(node.from, node.to);
      if (!parseTable(source)) return;
      matches.push({
        from: node.from,
        to: node.to,
        source,
        cells: getTableCellOffsetsFromSource(source, node.from),
      });
    },
  });

  return matches;
}

export function selectionTouchesTable(
  selection: EditorSelection,
  from: number,
  to: number,
) {
  return selection.ranges.some((range) => range.to >= from && range.from <= to);
}

type TableCellProps = ComponentPropsWithoutRef<"td"> & ExtraProps;
type TableHeaderProps = ComponentPropsWithoutRef<"th"> & ExtraProps;

class TableDisplayWidget extends WidgetType {
  private readonly roots = new WeakMap<HTMLElement, Root>();

  constructor(private readonly match: TableDisplayMatch) {
    super();
  }

  eq(other: TableDisplayWidget) {
    return other.match.from === this.match.from
      && other.match.to === this.match.to
      && other.match.source === this.match.source;
  }

  toDOM(view: EditorView) {
    const wrapper = document.createElement("div");
    wrapper.className = "cm-table-preview";
    wrapper.setAttribute("aria-label", "Rendered Markdown table. Click a cell to edit.");

    const scroll = document.createElement("div");
    scroll.className = "cm-table-preview-scroll";
    wrapper.appendChild(scroll);

    const cellsBySegmentStart = new Map(
      this.match.cells.map((cell) => [cell.fullStart, cell]),
    );

    const editCell = (event: MouseEvent, cell: CellOffset | undefined) => {
      if (!cell) return;
      event.preventDefault();
      event.stopPropagation();
      view.dispatch({
        selection: EditorSelection.cursor(cell.start),
        effects: EditorView.scrollIntoView(cell.start, { y: "nearest" }),
      });
      view.focus();
    };

    const cellForNode = (node: ExtraProps["node"]) => {
      const relativeStart = node?.position?.start.offset;
      if (relativeStart == null) return undefined;
      const absoluteStart = this.match.from + relativeStart;
      return cellsBySegmentStart.get(absoluteStart)
        ?? cellsBySegmentStart.get(absoluteStart + 1);
    };

    const components: Components = {
      th: ({ node, ...props }: TableHeaderProps) => {
        const cell = cellForNode(node);
        return (
          <th
            {...props}
            data-source-cell={cell ? `${cell.row}:${cell.col}` : undefined}
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => editCell(event, cell)}
          />
        );
      },
      td: ({ node, ...props }: TableCellProps) => {
        const cell = cellForNode(node);
        return (
          <td
            {...props}
            data-source-cell={cell ? `${cell.row}:${cell.col}` : undefined}
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => editCell(event, cell)}
          />
        );
      },
    };

    const root = createRoot(scroll);
    this.roots.set(wrapper, root);
    root.render(
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
        allowedElements={TABLE_ELEMENTS}
        skipHtml
      >
        {this.match.source}
      </ReactMarkdown>,
    );

    return wrapper;
  }

  destroy(dom: HTMLElement) {
    this.roots.get(dom)?.unmount();
    this.roots.delete(dom);
  }

  ignoreEvent() {
    return true;
  }
}

export function buildTableDisplayDecorations(state: EditorState): DecorationSet {
  const ranges: Range<Decoration>[] = [];

  for (const match of collectTableDisplayMatches(state)) {
    if (selectionTouchesTable(state.selection, match.from, match.to)) continue;
    ranges.push(
      Decoration.replace({
        widget: new TableDisplayWidget(match),
        block: true,
        inclusive: true,
      }).range(match.from, match.to),
    );
  }

  return Decoration.set(ranges, true);
}

export const tableDisplayExtension = StateField.define<DecorationSet>({
  create: buildTableDisplayDecorations,
  update(value, transaction) {
    if (!transaction.docChanged && !transaction.selection) return value;
    return buildTableDisplayDecorations(transaction.state);
  },
  provide: (field) => EditorView.decorations.from(field),
});
