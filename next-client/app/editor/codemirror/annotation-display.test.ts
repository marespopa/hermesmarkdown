import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { describe, expect, it } from "vitest";
import {
  annotationDisplayPlugin,
  collectAnnotationDisplayMatches,
} from "./annotation-display";

describe("collectAnnotationDisplayMatches", () => {
  it("collects dates without nesting plain dates inside wrapped dates", () => {
    const matches = collectAnnotationDisplayMatches(
      "2026-09-25 [[2026-09-26]] @due(2026-09-27) 09/28/2026 29.09.2026",
    );

    expect(matches.map(({ label, kind }) => ({ label, kind }))).toEqual([
      { label: "2026-09-25", kind: "iso" },
      { label: "2026-09-26", kind: "wiki" },
      { label: "Due 2026-09-27", kind: "due" },
      { label: "09/28/2026", kind: "slashed" },
      { label: "29.09.2026", kind: "dotted" },
    ]);
  });

  it("collects supported priorities and leaves invalid annotations plain", () => {
    const matches = collectAnnotationDisplayMatches(
      "@priority(high) @priority(med) @priority(low) @priority(urgent) 2026-02-31",
    );

    expect(matches.map(({ label, kind }) => ({ label, kind }))).toEqual([
      { label: "High", kind: "high" },
      { label: "Medium", kind: "med" },
      { label: "Low", kind: "low" },
    ]);
  });

  it("leaves annotations inside Markdown links to the link display", () => {
    expect(collectAnnotationDisplayMatches(
      "[Release 2026-09-25](https://example.com/2026-09-25)",
    )).toEqual([]);
  });
});

describe("annotationDisplayPlugin", () => {
  it("keeps every annotation as raw text in a chip so moving the caret doesn't swap its DOM", () => {
    const doc = "Ship 2026-09-25 [[2026-09-26]] @due(2026-09-27) @priority(med)";
    const view = new EditorView({
      state: EditorState.create({
        doc,
        selection: EditorSelection.cursor(0),
        extensions: [annotationDisplayPlugin],
      }),
      parent: document.body,
    });

    const chipTexts = () => [...view.dom.querySelectorAll(".cm-annotation-display.cm-chip-editing")].map((node) => node.textContent);
    const expected = ["2026-09-25", "[[2026-09-26]]", "@due(2026-09-27)", "@priority(med)"];
    expect(chipTexts()).toEqual(expected);
    expect(view.dom.querySelector(".cm-priority-display-med")).toHaveTextContent("@priority(med)");

    for (const anchor of ["09-26", "09-27", "@priority"]) {
      view.dispatch({ selection: EditorSelection.cursor(doc.indexOf(anchor)) });
      expect(chipTexts()).toEqual(expected);
    }
    view.dispatch({ selection: EditorSelection.range(0, doc.length) });
    expect(chipTexts()).toEqual(expected);
    view.destroy();
  });
});
