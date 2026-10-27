import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { ensureSyntaxTree } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { afterEach, describe, expect, it } from "vitest";
import { codeProblems } from "./code-problems";

const views: EditorView[] = [];

async function createEditor(doc: string) {
  const json = await languages.find((language) => language.name === "JSON")!.load();
  const parent = document.createElement("div");
  document.body.appendChild(parent);
  const state = EditorState.create({ doc, extensions: [json, codeProblems()] });
  ensureSyntaxTree(state, state.doc.length, 1000);
  const view = new EditorView({ parent, state });
  views.push(view);
  return view;
}

afterEach(() => {
  for (const view of views.splice(0)) view.destroy();
  document.body.replaceChildren();
});

describe("codeProblems", () => {
  it("underlines nothing in valid code", async () => {
    const view = await createEditor('{ "a": 1 }');
    expect(view.contentDOM.querySelector(".cm-code-problem")).toBeNull();
  });

  it("underlines a syntax error", async () => {
    const view = await createEditor('{ "a": }');
    expect(view.contentDOM.querySelector(".cm-code-problem")).not.toBeNull();
  });
});
