import { afterEach, describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { restoreViewState } from "./use-codemirror-view-state";

const views: EditorView[] = [];
afterEach(() => views.splice(0).forEach((view) => view.destroy()));

function makeView(doc: string) {
  const view = new EditorView({ state: EditorState.create({ doc }), parent: document.body });
  views.push(view);
  return view;
}

describe("restoreViewState", () => {
  it("puts the selection back", () => {
    const view = makeView("one\ntwo\nthree");
    restoreViewState(view, { anchor: 4, head: 7, scrollPos: 4, scrollOffset: 0 });
    expect(view.state.selection.main).toMatchObject({ anchor: 4, head: 7 });
  });

  it("clamps a place past the end of a note that got shorter", () => {
    const view = makeView("short");
    restoreViewState(view, { anchor: 400, head: 400, scrollPos: 900, scrollOffset: -20 });
    expect(view.state.selection.main.head).toBe(5);
  });
});
