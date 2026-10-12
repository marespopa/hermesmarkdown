import { type EditorSelection, type EditorState, type Range } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from "@codemirror/view";
import { REGEX_ROLLUP_END, REGEX_ROLLUP_START } from "@/app/utils/rollup/render";
import { hasRollupContextEffect, rollupContextField } from "./rollup-context";

// A rollup sheet's `<!-- rollup:start … -->` / `<!-- rollup:end -->` lines,
// which mark the generated region (rebuilt on open and by Refresh rollup).
// Away from the caret (or in an unfocused editor) the comment text is hidden
// and the line shows a hairline rule; the start line adds a faint caption
// with when it was last rebuilt (rollupContextField). With the caret on the
// line, the raw comment shows, faint and small, so it can still be edited.

type MarkerKind = "start" | "end";

export const DEFAULT_CAPTION = "From your daily sheets";
const markerLine = Decoration.line({ class: "cm-rollupMarker" });

export class RollupMarkerWidget extends WidgetType {
  constructor(readonly kind: MarkerKind, readonly caption = DEFAULT_CAPTION) {
    super();
  }

  eq(other: RollupMarkerWidget) {
    return other.kind === this.kind && other.caption === this.caption;
  }

  toDOM() {
    const rule = document.createElement("span");
    rule.className = `cm-rollupRule cm-rollupRule-${this.kind}`;
    rule.setAttribute("aria-hidden", "true");
    if (this.kind === "start") {
      const caption = document.createElement("span");
      caption.className = "cm-rollupCaption";
      caption.textContent = this.caption;
      rule.appendChild(caption);
    }
    return rule;
  }

  ignoreEvent() {
    return false;
  }
}

function markerKind(text: string): MarkerKind | null {
  if (REGEX_ROLLUP_START.test(text)) return "start";
  if (REGEX_ROLLUP_END.test(text)) return "end";
  return null;
}

const touchesLine = (selection: EditorSelection | null, from: number, to: number) =>
  selection?.ranges.some((range) => range.to >= from && range.from <= to) ?? false;

export function buildRollupMarkerDecorations(
  state: EditorState,
  visibleRanges: readonly { from: number; to: number }[],
  focused: boolean,
): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  const selection = focused ? state.selection : null;
  const { doc } = state;
  const caption = state.field(rollupContextField, false)?.caption ?? DEFAULT_CAPTION;
  for (const visible of visibleRanges) {
    for (let pos = visible.from; pos <= visible.to;) {
      const line = doc.lineAt(pos);
      const kind = markerKind(line.text);
      if (kind) {
        ranges.push(markerLine.range(line.from));
        if (!touchesLine(selection, line.from, line.to)) {
          ranges.push(Decoration.replace({ widget: new RollupMarkerWidget(kind, caption) }).range(line.from, line.to));
        }
      }
      if (line.to >= doc.length) break;
      pos = line.to + 1;
    }
  }
  return Decoration.set(ranges, true);
}

const rollupMarkersPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildRollupMarkerDecorations(view.state, view.visibleRanges, view.hasFocus);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged || update.focusChanged || hasRollupContextEffect(update.transactions)) {
        this.decorations = buildRollupMarkerDecorations(update.state, update.view.visibleRanges, update.view.hasFocus);
      }
    }
  },
  { decorations: (value) => value.decorations },
);

const rollupMarkersTheme = EditorView.baseTheme({
  ".cm-rollupMarker": {
    color: "var(--fg-faint)",
    fontSize: "0.8em",
  },
  ".cm-rollupRule": {
    display: "inline-block",
    width: "100%",
    verticalAlign: "middle",
    borderTop: "1px solid var(--border)",
  },
  ".cm-rollupCaption": {
    display: "block",
    paddingTop: "0.15em",
    color: "var(--fg-faint)",
    fontSize: "0.85em",
  },
});

export const rollupMarkers = [rollupContextField, rollupMarkersPlugin, rollupMarkersTheme];
