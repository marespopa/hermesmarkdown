import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { codeFolding, ensureSyntaxTree, foldEffect, foldedRanges } from "@codemirror/language";
import { Compartment, EditorState } from "@codemirror/state";
import { Decoration, EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildPreviewDecorations, caretOutsideFolds, isPreviewMode, previewExtension } from "./preview-mode";
import { findFrontmatterFoldRange, frontmatterCollapse, toggleFrontmatterFold } from "./frontmatter-fold";

vi.mock("../utils/open-helper-dialogs", () => ({ openRenderedBlockSource: vi.fn() }));

const DOC = [
  "# Title",
  "",
  "Some **bold** and *em* with `code` and ~~gone~~.",
  "",
  "> quoted",
  "",
  "- item",
  "- [ ] task",
  "",
  "```js",
  "let x = 1;",
  "```",
].join("\n");

const views: EditorView[] = [];

function createEditor(doc = DOC, preview = true) {
  const parent = document.createElement("div");
  document.body.appendChild(parent);
  const compartment = new Compartment();
  const state = EditorState.create({
    doc,
    extensions: [markdown({ base: markdownLanguage }), compartment.of(previewExtension(preview))],
  });
  ensureSyntaxTree(state, state.doc.length, 5000);
  const view = new EditorView({ parent, state });
  views.push(view);
  return { view, compartment };
}

// Text under every replace decoration that hides source (no widget).
function hiddenTexts(state: EditorState): string[] {
  const texts: string[] = [];
  buildPreviewDecorations(state).between(0, state.doc.length, (from, to, deco: Decoration) => {
    if (deco.spec.widget === undefined && to > from) {
      texts.push(state.doc.sliceString(from, to));
    }
  });
  return texts;
}

describe("preview mode", () => {
  afterEach(() => {
    for (const view of views.splice(0)) {
      view.dom.parentElement?.remove();
      view.destroy();
    }
  });

  it("hides heading, emphasis, code, strikethrough and quote markers", () => {
    const { view } = createEditor();
    const hidden = hiddenTexts(view.state);

    expect(hidden).toContain("# ");
    expect(hidden.filter((text) => text === "**")).toHaveLength(2);
    expect(hidden.filter((text) => text === "*")).toHaveLength(2);
    expect(hidden.filter((text) => text === "`")).toHaveLength(2);
    expect(hidden.filter((text) => text === "~~")).toHaveLength(2);
    expect(hidden).toContain("> ");
  });

  it("collapses code fences and keeps the code lines", () => {
    const { view } = createEditor();
    const hidden = hiddenTexts(view.state);

    expect(hidden).toContain("```js");
    expect(hidden).toContain("```");
    expect(view.contentDOM.querySelector(".cm-previewCode")?.textContent).toBe("let x = 1;");
  });

  it("draws bullets and task checkboxes", () => {
    const { view } = createEditor();

    expect(view.contentDOM.querySelector(".cm-previewBullet")?.textContent).toBe("•");
    expect(view.contentDOM.querySelectorAll(".cm-previewCheckbox")).toHaveLength(1);
  });

  it("toggles a task from its checkbox", () => {
    const { view } = createEditor();
    const box = view.contentDOM.querySelector<HTMLInputElement>(".cm-previewCheckbox")!;

    box.click();

    expect(view.state.doc.toString()).toContain("- [x] task");
  });

  it("is read-only, except for external reloads", () => {
    const { view } = createEditor();

    expect(isPreviewMode(view.state)).toBe(true);
    expect(view.state.readOnly).toBe(true);
    expect(view.contentDOM.getAttribute("contenteditable")).toBe("false");

    view.dispatch({ changes: { from: 0, insert: "typed " }, userEvent: "input.type" });
    expect(view.state.doc.toString()).toBe(DOC);

    view.dispatch({ changes: { from: 0, insert: "reloaded " }, userEvent: "input.external" });
    expect(view.state.doc.toString().startsWith("reloaded ")).toBe(true);
  });

  it("adds nothing in edit mode, and switches through the compartment", () => {
    const { view, compartment } = createEditor(DOC, false);

    expect(isPreviewMode(view.state)).toBe(false);
    expect(view.contentDOM.querySelector(".cm-previewBullet")).toBeNull();
    expect(view.contentDOM.hasAttribute("data-mode")).toBe(false);

    view.dispatch({ effects: compartment.reconfigure(previewExtension(true)) });

    expect(view.contentDOM.getAttribute("data-mode")).toBe("preview");
    expect(view.contentDOM.querySelector(".cm-previewBullet")).not.toBeNull();
  });

  it("leaves frontmatter alone", () => {
    const doc = ["---", "title: x", "---", "", "Body"].join("\n");
    const { view } = createEditor(doc);

    expect(hiddenTexts(view.state)).not.toContain("---");
  });
});

describe("caretOutsideFolds", () => {
  const doc = ["---", "title: Note", "---", "", "Body"].join("\n");
  const foldTo = doc.indexOf("\n\n");

  function foldedState() {
    const state = EditorState.create({ doc, extensions: codeFolding() });
    return state.update({ effects: foldEffect.of({ from: 0, to: foldTo }) }).state;
  }

  it("moves a caret inside collapsed frontmatter to the fold's start, keeping it folded", () => {
    const state = foldedState();
    const closingLine = doc.indexOf("\n---") + 1;
    const anchor = caretOutsideFolds(state, closingLine);

    expect(anchor).toBe(0);
    const next = state.update({ selection: { anchor } }).state;
    expect(foldedRanges(next).size).toBe(1);
  });

  it("leaves a caret outside any fold where it is", () => {
    const state = foldedState();
    expect(caretOutsideFolds(state, doc.length)).toBe(doc.length);
  });

  it("moves a caret inside collapsed frontmatter to the first line after it", () => {
    const view = new EditorView({ state: EditorState.create({ doc, extensions: frontmatterCollapse }) });
    toggleFrontmatterFold(view, findFrontmatterFoldRange(doc)!, true);

    expect(caretOutsideFolds(view.state, 0)).toBe(doc.indexOf("Body"));
    view.destroy();
  });
});
