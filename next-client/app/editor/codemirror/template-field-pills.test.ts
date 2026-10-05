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
  it("names fields, questions and blanks in plain words, skipping non-fields", () => {
    expect(collectTemplateFields("{{date}} {{author}} {{ prompt:Owner }} {{two words}}")).toEqual([
      { from: 0, to: 8, label: "Today's date", kind: "field" },
      { from: 9, to: 19, label: "Fill in: Author", kind: "blank" },
      { from: 20, to: 38, label: "Ask: Owner", kind: "ask" },
    ]);
  });

  it("keeps only blanks outside template notes", () => {
    expect(collectTemplateFields("{{date}} {{task_1}}", { blanksOnly: true })).toEqual([
      { from: 9, to: 19, label: "Task 1", kind: "blank" },
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
