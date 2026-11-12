import { describe, expect, it } from "vitest";
import { EditorView } from "@codemirror/view";
import { EditorState, EditorSelection } from "@codemirror/state";
import { continueCallout } from "./callout-enter";

function makeView(doc: string, anchor = doc.length, head?: number) {
  return new EditorView({ state: EditorState.create({ doc, selection: EditorSelection.single(anchor, head) }) });
}

describe("continueCallout", () => {
  it("starts the callout's body on Enter at the end of its title", () => {
    const view = makeView("> [!note] Heads up");
    expect(continueCallout(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("> [!note] Heads up\n> ");
    expect(view.state.selection.main.head).toBe(view.state.doc.length);
  });

  it("adds the next row after a body line", () => {
    const view = makeView("> [!tip]\n> first");
    continueCallout(view);
    expect(view.state.doc.toString()).toBe("> [!tip]\n> first\n> ");
  });

  it("moves the text after the caret down into the new row", () => {
    const view = makeView("> [!tip]\n> onetwo", 14);
    continueCallout(view);
    expect(view.state.doc.toString()).toBe("> [!tip]\n> one\n> two");
    expect(view.state.selection.main.head).toBe(17);
  });

  it("keeps a nested callout's prefix", () => {
    const view = makeView("> [!note]\n> > [!tip] Inner\n> > text");
    continueCallout(view);
    expect(view.state.doc.toString().endsWith("> > text\n> > ")).toBe(true);
  });

  it("keeps adding rows on Enter in an empty body row", () => {
    const view = makeView("> [!note]\n> text\n> ");
    expect(continueCallout(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("> [!note]\n> text\n> \n> ");
    expect(view.state.selection.main.head).toBe(view.state.doc.length);
  });

  it("leaves plain quotes, other lines, selections and the prefix to the plain break", () => {
    expect(continueCallout(makeView("> just a quote"))).toBe(false);
    expect(continueCallout(makeView("plain text"))).toBe(false);
    expect(continueCallout(makeView("> [!note]\n\nafter the callout"))).toBe(false);
    expect(continueCallout(makeView("> [!note]\n> text", 12, 15))).toBe(false);
    expect(continueCallout(makeView("> [!note]\n> text", 10))).toBe(false);
  });
});
