import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { indentUnit } from "@codemirror/language";
import { afterEach, describe, expect, it } from "vitest";
import { indentGuides } from "./indent-guides";

const views: EditorView[] = [];

function createEditor(doc: string) {
  const parent = document.createElement("div");
  document.body.appendChild(parent);
  const view = new EditorView({ parent, state: EditorState.create({ doc, extensions: [indentUnit.of("  "), indentGuides()] }) });
  views.push(view);
  return view;
}

afterEach(() => {
  for (const view of views.splice(0)) view.destroy();
  document.body.replaceChildren();
});

describe("indentGuides", () => {
  it("guides indented lines by their leading columns, not flush or blank lines", () => {
    const view = createEditor("a\n    b\n\n  \n  c");
    const guided = [...view.contentDOM.querySelectorAll<HTMLElement>(".cm-indent-guides")];
    expect(guided.map((line) => line.textContent)).toEqual(["    b", "  c"]);
    expect(guided[0].style.getPropertyValue("--indent-columns")).toBe("4");
    expect(guided[0].style.getPropertyValue("--indent-unit")).toBe("2");
  });
});
