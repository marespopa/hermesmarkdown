import { describe, expect, it } from "vitest";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { bestEmbedCompletion, embedGhost, findEmbedGhost } from "./embed-ghost";

const PATHS = ["Roadmap.md", "specs/Road trip.md", "specs/Spec index.md", "Backlog.md"];

function state(doc: string, caret = doc.length) {
  return EditorState.create({ doc, selection: EditorSelection.cursor(caret) });
}

function createEditor(doc: string) {
  const parent = document.createElement("div");
  document.body.appendChild(parent);
  const view = new EditorView({ parent, state: EditorState.create({ doc, selection: EditorSelection.cursor(doc.length), extensions: embedGhost(() => PATHS) }) });
  return { view, cleanup: () => { view.destroy(); parent.remove(); } };
}

const ghostText = (view: EditorView) => view.dom.querySelector(".cm-embed-ghost")?.textContent ?? null;

describe("bestEmbedCompletion", () => {
  it("completes a path, else a name, shortest path first", () => {
    expect(bestEmbedCompletion(PATHS, "road")).toEqual({ path: "Roadmap.md", suffix: "map.md" });
    expect(bestEmbedCompletion(PATHS, "road t")).toEqual({ path: "specs/Road trip.md", suffix: "rip.md" });
    expect(bestEmbedCompletion(PATHS, "specs/s")).toEqual({ path: "specs/Spec index.md", suffix: "pec index.md" });
    expect(bestEmbedCompletion(PATHS, "BACK")).toEqual({ path: "Backlog.md", suffix: "log.md" });
  });

  it("has nothing for a finished or unknown name", () => {
    expect(bestEmbedCompletion(PATHS, "Roadmap.md")).toBeNull();
    expect(bestEmbedCompletion(PATHS, "zzz")).toBeNull();
  });
});

describe("findEmbedGhost", () => {
  it("needs the caret at the end of a line holding only /name", () => {
    expect(findEmbedGhost(state("/road"), () => PATHS)).toEqual({ from: 0, to: 5, insert: "/Roadmap.md", suffix: "map.md" });
    expect(findEmbedGhost(state("/road", 3), () => PATHS)).toBeNull();
    expect(findEmbedGhost(state("See /road"), () => PATHS)).toBeNull();
    expect(findEmbedGhost(state("/"), () => PATHS)).toBeNull();
  });
});

describe("embedGhost", () => {
  it("shows the faded rest of the name and accepts it with Tab", () => {
    const { view, cleanup } = createEditor("Intro\n/road t");
    expect(ghostText(view)).toBe("rip.md");

    view.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));
    expect(view.state.doc.toString()).toBe("Intro\n/specs/Road trip.md");
    expect(ghostText(view)).toBeNull();
    cleanup();
  });

  it("follows typing and leaves other lines alone", () => {
    const { view, cleanup } = createEditor("/ba");
    expect(ghostText(view)).toBe("cklog.md");
    view.dispatch({ changes: { from: 3, insert: "x" }, selection: EditorSelection.cursor(4) });
    expect(ghostText(view)).toBeNull();
    cleanup();
  });
});
