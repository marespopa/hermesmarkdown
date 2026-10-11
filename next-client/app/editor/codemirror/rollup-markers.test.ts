import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";
import { ROLLUP_END, ROLLUP_START } from "@/app/utils/rollup/render";
import { buildRollupMarkerDecorations, rollupMarkers, RollupMarkerWidget } from "./rollup-markers";

const DOC = `# Week 41\n\n${ROLLUP_START}\n1 done · 0 open · 0 blocked\n${ROLLUP_END}\n\n<!-- my own comment -->\n## Notes\n`;
const START_LINE = DOC.indexOf(ROLLUP_START);
const END_LINE = DOC.indexOf(ROLLUP_END);

// What each decoration does: "line@<n>" for the marker line class,
// "widget:<kind>@<n>" for the hairline replacing the comment text.
function decorations(caret: number | undefined, focused = true): string[] {
  const state = EditorState.create({ doc: DOC, selection: caret === undefined ? undefined : EditorSelection.cursor(caret) });
  const set = buildRollupMarkerDecorations(state, [{ from: 0, to: state.doc.length }], focused);
  const out: string[] = [];
  set.between(0, state.doc.length, (from, _to, deco) => {
    const line = state.doc.lineAt(from).number;
    const widget = deco.spec.widget;
    out.push(widget instanceof RollupMarkerWidget ? `widget:${widget.kind}@${line}` : `${deco.spec.class}@${line}`);
  });
  return out;
}

describe("buildRollupMarkerDecorations", () => {
  it("hides both marker lines behind a hairline when the caret is elsewhere", () => {
    expect(decorations(0)).toEqual(["cm-rollupMarker@3", "widget:start@3", "cm-rollupMarker@5", "widget:end@5"]);
  });

  it("shows the raw comment on the caret's marker line", () => {
    expect(decorations(START_LINE + 5)).toEqual(["cm-rollupMarker@3", "cm-rollupMarker@5", "widget:end@5"]);
    expect(decorations(END_LINE)).toEqual(["cm-rollupMarker@3", "widget:start@3", "cm-rollupMarker@5"]);
  });

  it("hides both in an unfocused editor, wherever the caret is", () => {
    expect(decorations(START_LINE, false)).toEqual(["cm-rollupMarker@3", "widget:start@3", "cm-rollupMarker@5", "widget:end@5"]);
  });

  it("leaves other HTML comments alone", () => {
    expect(decorations(0).some((entry) => entry.endsWith("@7"))).toBe(false);
  });
});

describe("rollupMarkers in an editor", () => {
  let view: EditorView | null = null;
  afterEach(() => {
    view?.destroy();
    view = null;
  });

  it("keeps the comment text out of the DOM and shows the caption", () => {
    view = new EditorView({ state: EditorState.create({ doc: DOC, extensions: [rollupMarkers] }), parent: document.body });
    const text = view.contentDOM.textContent ?? "";
    expect(text).not.toContain("rollup:start");
    expect(text).not.toContain("rollup:end");
    expect(text).toContain("Generated · Refresh rollup rewrites this part");
    expect(text).toContain("my own comment");
    expect(view.contentDOM.querySelectorAll(".cm-rollupMarker")).toHaveLength(2);
  });
});
