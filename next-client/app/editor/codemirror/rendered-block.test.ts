import { act, waitFor } from "@testing-library/react";
import { history, undo } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { ensureSyntaxTree } from "@codemirror/language";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../utils/rendered-block-cache", () => ({
  currentRenderTheme: () => "default",
  knownHeight: () => undefined,
  peekRendered: () => undefined,
  rememberHeight: () => undefined,
  renderKey: (kind: string, theme: string, source: string) => `${kind}|${theme}|${source}`,
  renderBlock: vi.fn((kind: string, _theme: string, source: string) =>
    Promise.resolve(source.includes("bad") ? { error: "Parse error" } : { html: `<div data-rendered="${kind}">${source}</div>` })),
}));

import { applyRenderedBlockEdit, collectRenderedBlocks, openRenderedBlockAtCaret, renderedBlockExtension } from "./rendered-block";

const views: EditorView[] = [];

function makeState(doc: string, cursor = 0) {
  const state = EditorState.create({
    doc,
    selection: EditorSelection.cursor(cursor),
    extensions: [history(), markdown({ base: markdownLanguage }), renderedBlockExtension],
  });
  ensureSyntaxTree(state, state.doc.length, 5000);
  return state;
}

function makeView(doc: string, cursor = 0) {
  const parent = document.createElement("div");
  document.body.appendChild(parent);
  let view!: EditorView;
  act(() => {
    view = new EditorView({ parent, state: makeState(doc, cursor) });
  });
  views.push(view);
  return view;
}

afterEach(() => {
  for (const view of views.splice(0)) view.destroy();
  document.body.replaceChildren();
});

describe("collectRenderedBlocks", () => {
  it("finds Mermaid fences, math fences and $$ blocks", () => {
    const doc = [
      "```mermaid",
      "graph TD",
      "  A --> B",
      "```",
      "",
      "```math",
      "x^2",
      "```",
      "",
      "$$",
      "\\frac{a}{b}",
      "$$",
      "",
      "$$ E = mc^2 $$",
    ].join("\n");
    const matches = collectRenderedBlocks(makeState(doc));
    expect(matches.map((m) => [m.kind, m.source])).toEqual([
      ["mermaid", "graph TD\n  A --> B"],
      ["math", "x^2"],
      ["math", "\\frac{a}{b}"],
      ["math", "E = mc^2"],
    ]);
  });

  it("ignores other languages, unterminated fences and $$ inside code", () => {
    const doc = [
      "```python",
      "print(1)",
      "```",
      "",
      "```js",
      "$$",
      "not math",
      "$$",
      "```",
      "",
      "```mermaid",
      "graph TD",
    ].join("\n");
    expect(collectRenderedBlocks(makeState(doc))).toEqual([]);
  });
});

describe("renderedBlockExtension", () => {
  it("replaces the source with the rendered output", async () => {
    const view = makeView("Intro\n\n```mermaid\ngraph TD\n```\n");
    await waitFor(() => {
      expect(view.dom.querySelector("[data-rendered='mermaid']")).toHaveTextContent("graph TD");
    });
    expect(view.dom.textContent).not.toContain("```mermaid");
  });

  it("shows the error and source for invalid input", async () => {
    const view = makeView("$$\nbad \\frac\n$$");
    await waitFor(() => {
      expect(view.dom.querySelector(".cm-rendered-block-error")).toHaveTextContent("Formula error: Parse error");
    });
    expect(view.dom.querySelector(".cm-rendered-block-source")).toHaveTextContent("bad \\frac");
  });

  it("opens the source dialog on double-click", async () => {
    const view = makeView("```mermaid\ngraph TD\n```");
    const listener = vi.fn();
    document.addEventListener("hermes:open-rendered-block-source", listener);
    const block = await waitFor(() => {
      const element = view.dom.querySelector<HTMLElement>(".cm-rendered-block");
      expect(element).not.toBeNull();
      return element!;
    });
    block.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    document.removeEventListener("hermes:open-rendered-block-source", listener);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail.match).toMatchObject({ kind: "mermaid", source: "graph TD" });
  });

  it("opens the block beside the caret", () => {
    const view = makeView("```mermaid\ngraph TD\n```\nafter", 0);
    const listener = vi.fn();
    document.addEventListener("hermes:open-rendered-block-source", listener);
    expect(openRenderedBlockAtCaret(view)).toBe(true);
    document.removeEventListener("hermes:open-rendered-block-source", listener);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("applyRenderedBlockEdit", () => {
  it("replaces only the body, as one undo step", () => {
    const doc = "Before\n```mermaid\ngraph TD\n```\nAfter";
    const view = makeView(doc);
    const [match] = collectRenderedBlocks(view.state);
    expect(applyRenderedBlockEdit(view, match, "graph LR\n  A --> B")).toBe(true);
    expect(view.state.doc.toString()).toBe("Before\n```mermaid\ngraph LR\n  A --> B\n```\nAfter");
    undo(view);
    expect(view.state.doc.toString()).toBe(doc);
  });

  it("adds a body line to fences with nothing between them", () => {
    const view = makeView("```math\n```");
    const [match] = collectRenderedBlocks(view.state);
    applyRenderedBlockEdit(view, match, "x^2");
    expect(view.state.doc.toString()).toBe("```math\nx^2\n```");
  });

  it("keeps single-line $$ blocks on one line", () => {
    const view = makeView("$$ a $$");
    const [match] = collectRenderedBlocks(view.state);
    applyRenderedBlockEdit(view, match, "b + c");
    expect(view.state.doc.toString()).toBe("$$ b + c $$");
  });
});
