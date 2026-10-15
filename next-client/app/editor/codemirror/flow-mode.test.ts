import { EditorSelection, EditorState, Text } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { describe, expect, it } from "vitest";
import { flowMode, paragraphLinesAt, sentenceRangeAt, shouldTypewriterScroll, type FlowLevel } from "./flow-mode";

const DOC = ["# Title", "", "First line", "second line", "", "Last"].join("\n");

function createEditor(doc = DOC, cursor = 0, level: FlowLevel = "paragraph") {
  const parent = document.createElement("div");
  document.body.appendChild(parent);
  const view = new EditorView({
    parent,
    state: EditorState.create({ doc, selection: EditorSelection.cursor(cursor), extensions: flowMode(level) }),
  });
  return { parent, view };
}

function activeLineTexts(view: EditorView) {
  return Array.from(view.contentDOM.querySelectorAll(".cm-flowActive")).map((line) => line.textContent);
}

describe("paragraphLinesAt", () => {
  const doc = Text.of(DOC.split("\n"));

  it("spans the run of non-blank lines around the position", () => {
    expect(paragraphLinesAt(doc, doc.line(4).from)).toEqual({ first: 3, last: 4 });
  });

  it("treats a blank line as its own paragraph", () => {
    expect(paragraphLinesAt(doc, doc.line(2).from)).toEqual({ first: 2, last: 2 });
  });

  it("stops at the document edges", () => {
    expect(paragraphLinesAt(doc, 0)).toEqual({ first: 1, last: 1 });
    expect(paragraphLinesAt(doc, doc.length)).toEqual({ first: 6, last: 6 });
  });
});

describe("shouldTypewriterScroll", () => {
  const events = (...names: string[]) => (event: string) =>
    names.some((name) => name === event || name.startsWith(`${event}.`));

  it("centers on typing, deleting, undo and keyboard selection", () => {
    expect(shouldTypewriterScroll(events("input.type"))).toBe(true);
    expect(shouldTypewriterScroll(events("delete.backward"))).toBe(true);
    expect(shouldTypewriterScroll(events("undo"))).toBe(true);
    expect(shouldTypewriterScroll(events("select"))).toBe(true);
  });

  it("leaves pointer selections, external reloads and untagged changes alone", () => {
    expect(shouldTypewriterScroll(events("select.pointer"))).toBe(false);
    expect(shouldTypewriterScroll(events("input.external"))).toBe(false);
    expect(shouldTypewriterScroll(events())).toBe(false);
  });
});

describe("flowMode", () => {
  it("marks the editor and highlights only the caret's paragraph", () => {
    const { parent, view } = createEditor(DOC, DOC.indexOf("second"));

    expect(view.dom).toHaveClass("cm-flowMode");
    expect(activeLineTexts(view)).toEqual(["First line", "second line"]);

    view.destroy();
    parent.remove();
  });

  it("moves the highlight with the caret", () => {
    const { parent, view } = createEditor(DOC, DOC.indexOf("second"));

    view.dispatch({ selection: EditorSelection.cursor(DOC.indexOf("Last")), userEvent: "select" });
    expect(activeLineTexts(view)).toEqual(["Last"]);

    view.destroy();
    parent.remove();
  });

  it("leaves the document text unchanged", () => {
    const { parent, view } = createEditor();

    expect(view.state.doc.toString()).toBe(DOC);

    view.destroy();
    parent.remove();
  });
});

describe("sentenceRangeAt", () => {
  // The sentence around the first occurrence of `at` in a one-paragraph doc.
  function sentence(text: string, at: string) {
    const doc = Text.of(text.split("\n"));
    const { first, last } = paragraphLinesAt(doc, 0);
    const { from, to } = sentenceRangeAt(doc, text.indexOf(at), first, last);
    return text.slice(from, to);
  }

  it("finds the sentence around the caret, trailing space included", () => {
    const text = "Ship the build. Review the plan! Is it done? Yes.";
    expect(sentence(text, "Ship")).toBe("Ship the build. ");
    expect(sentence(text, "plan")).toBe("Review the plan! ");
    expect(sentence(text, "done")).toBe("Is it done? ");
    expect(sentence(text, "Yes")).toBe("Yes.");
  });

  it("keeps abbreviations followed by a lowercase word in one sentence", () => {
    expect(sentence("Use a tool, e.g. the linter. Then ship.", "linter")).toBe("Use a tool, e.g. the linter. ");
  });

  it("includes closing quotes and brackets", () => {
    expect(sentence('He wrote "done." Then left.', "wrote")).toBe('He wrote "done." ');
  });

  it("starts a sentence at a line that follows a finished one or starts a block", () => {
    expect(sentence("First task done.\nsecond line", "second")).toBe("second line");
    expect(sentence("- Draft the spec\n- Review it", "Review")).toBe("- Review it");
    expect(sentence("A soft\nwrapped line", "wrapped")).toBe("A soft\nwrapped line");
  });
});

describe("flowMode at the sentence level", () => {
  const TEXT = "Ship the build. Review the plan.\n\nLast";

  function dimmedTexts(view: EditorView) {
    return Array.from(view.contentDOM.querySelectorAll(".cm-flowDim")).map((el) => el.textContent);
  }

  it("dims the rest of the caret's paragraph", () => {
    const { parent, view } = createEditor(TEXT, TEXT.indexOf("Review"), "sentence");

    expect(activeLineTexts(view)).toEqual(["Ship the build. Review the plan."]);
    expect(dimmedTexts(view)).toEqual(["Ship the build. "]);

    view.dispatch({ selection: EditorSelection.cursor(TEXT.indexOf("build")), userEvent: "select" });
    expect(dimmedTexts(view)).toEqual(["Review the plan."]);

    view.destroy();
    parent.remove();
  });

  it("dims nothing extra in the paragraph level", () => {
    const { parent, view } = createEditor(TEXT, TEXT.indexOf("Review"));

    expect(dimmedTexts(view)).toEqual([]);

    view.destroy();
    parent.remove();
  });
});

describe("sentence fades", () => {
  const TEXT = "Ship the build. Review the plan. Close the sprint.";
  const classTexts = (view: EditorView, cls: string) =>
    Array.from(view.contentDOM.querySelectorAll(`.${cls}`)).map((el) => el.textContent);

  it("fades the sentence left out and the one entered in when the caret moves", () => {
    const { parent, view } = createEditor(TEXT, TEXT.indexOf("Review"), "sentence");
    expect(classTexts(view, "cm-flowDimEnter")).toEqual([]);

    view.dispatch({ selection: EditorSelection.cursor(TEXT.indexOf("Close")), userEvent: "select" });
    expect(classTexts(view, "cm-flowDimEnter")).toEqual(["Review the plan. "]);
    expect(classTexts(view, "cm-flowEnter")).toEqual(["Close the sprint."]);
    expect(classTexts(view, "cm-flowDim")).toEqual(["Ship the build. ", "Review the plan. "]);

    view.destroy();
    parent.remove();
  });

  it("doesn't fade while typing or when moving within the sentence", () => {
    const { parent, view } = createEditor(TEXT, TEXT.indexOf("plan"), "sentence");

    view.dispatch({ changes: { from: TEXT.indexOf("plan"), insert: "x" }, userEvent: "input.type" });
    expect(classTexts(view, "cm-flowDimEnter")).toEqual([]);
    expect(classTexts(view, "cm-flowEnter")).toEqual([]);

    view.dispatch({ selection: EditorSelection.cursor(TEXT.indexOf("Review") + 1), userEvent: "select" });
    expect(classTexts(view, "cm-flowEnter")).toEqual([]);

    view.destroy();
    parent.remove();
  });

  it("doesn't fade sentences when the caret enters another paragraph", () => {
    const doc = `${TEXT}\n\nNext paragraph here.`;
    const { parent, view } = createEditor(doc, doc.indexOf("Review"), "sentence");

    view.dispatch({ selection: EditorSelection.cursor(doc.indexOf("Next")), userEvent: "select" });
    expect(classTexts(view, "cm-flowEnter")).toEqual([]);
    expect(classTexts(view, "cm-flowDimEnter")).toEqual([]);

    view.destroy();
    parent.remove();
  });
});
