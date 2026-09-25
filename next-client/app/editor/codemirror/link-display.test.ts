import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { describe, expect, it } from "vitest";
import {
  buildLinkDisplayDecorations,
  collectLinkDisplayMatches,
  linkDisplayPlugin,
  selectionTouchesLink,
} from "./link-display";

describe("collectLinkDisplayMatches", () => {
  it("collects Markdown links and WikiLinks with readable labels", () => {
    const matches = collectLinkDisplayMatches(
      "Read [the guide](https://example.com/guide) and [[Notes/Project|Project notes]].",
    );

    expect(matches).toEqual([
      expect.objectContaining({ label: "the guide", target: "https://example.com/guide", type: "url" }),
      expect.objectContaining({ label: "Project notes", target: "Notes/Project|Project notes", type: "wiki" }),
    ]);
  });

  it("leaves images and date WikiLinks unchanged", () => {
    const matches = collectLinkDisplayMatches(
      "![cover](cover.png) [[2026-09-25]] [local note](notes/today.md)",
    );

    expect(matches).toEqual([
      expect.objectContaining({ label: "local note", target: "notes/today.md", type: "url" }),
    ]);
  });
});

describe("linkDisplayPlugin", () => {
  it("shows a label-only display until the cursor enters the link", () => {
    const doc = "Open [the guide](https://example.com) or [[Project Notes]].";
    const view = new EditorView({
      state: EditorState.create({
        doc,
        selection: EditorSelection.cursor(0),
        extensions: [linkDisplayPlugin],
      }),
      parent: document.body,
    });

    expect(view.dom.querySelectorAll(".cm-link-display")).toHaveLength(2);
    expect(view.dom.querySelector(".cm-link-display-url")).toHaveTextContent("the guide");
    expect(view.dom.querySelector(".cm-link-display-wiki")).toHaveTextContent("Project Notes");

    view.dispatch({ selection: EditorSelection.cursor(doc.indexOf("the guide")) });

    expect(buildLinkDisplayDecorations(view).size).toBe(1);
    expect(view.dom.querySelectorAll(".cm-link-display")).toHaveLength(1);
    view.destroy();
  });

  it("reveals every link when the whole document is selected", () => {
    const doc = "Open [the guide](https://example.com) and [[Project Notes]].";
    const view = new EditorView({
      state: EditorState.create({
        doc,
        selection: EditorSelection.cursor(0),
        extensions: [linkDisplayPlugin],
      }),
      parent: document.body,
    });

    expect(view.dom.querySelectorAll(".cm-link-display")).toHaveLength(2);
    view.dispatch({ selection: EditorSelection.range(0, doc.length) });

    expect(buildLinkDisplayDecorations(view).size).toBe(0);
    expect(view.dom.querySelectorAll(".cm-link-display")).toHaveLength(0);
    view.destroy();
  });

  it("reveals links touched by any selection range", () => {
    const text = "[guide](https://example.com)";
    const selection = EditorSelection.create([
      EditorSelection.cursor(text.length + 1),
      EditorSelection.range(1, 4),
    ]);

    expect(selectionTouchesLink(selection, 0, text.length)).toBe(true);
  });
});
