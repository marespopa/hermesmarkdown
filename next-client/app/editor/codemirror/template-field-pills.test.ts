import { describe, expect, it } from "vitest";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { collectTemplateFields, setTemplateNote, templateFieldPills } from "./template-field-pills";

function pills(view: EditorView) {
  return [...view.dom.querySelectorAll(".cm-template-field")].map((node) => node.textContent);
}

function makeView(doc: string, caret = 0) {
  const view = new EditorView({
    state: EditorState.create({ doc, selection: EditorSelection.cursor(caret), extensions: templateFieldPills }),
  });
  document.body.appendChild(view.dom);
  return view;
}

describe("collectTemplateFields", () => {
  it("finds known fields with plain names and skips unknown ones", () => {
    expect(collectTemplateFields("{{date}} {{author}} {{ prompt:Owner }}")).toEqual([
      { from: 0, to: 8, label: "Today's date" },
      { from: 20, to: 38, label: "Ask: Owner" },
    ]);
  });
});

describe("templateFieldPills", () => {
  it("shows pills only in a template note", () => {
    const view = makeView("x Date: {{date}}");
    expect(pills(view)).toEqual([]);
    view.dispatch({ effects: setTemplateNote.of(true) });
    expect(pills(view)).toEqual(["Today's date"]);
    view.dispatch({ effects: setTemplateNote.of(false) });
    expect(pills(view)).toEqual([]);
    view.destroy();
  });

  it("shows the source while the caret touches the field", () => {
    const doc = "x Owner: {{prompt:Owner}}";
    const view = makeView(doc);
    view.dispatch({ effects: setTemplateNote.of(true) });
    expect(pills(view)).toEqual(["Ask: Owner"]);
    view.dispatch({ selection: EditorSelection.cursor(doc.length - 3) });
    expect(pills(view)).toEqual([]);
    view.destroy();
  });
});
