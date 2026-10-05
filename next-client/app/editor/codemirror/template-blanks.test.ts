import { describe, expect, it, vi } from "vitest";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import toast from "react-hot-toast";
import { findBlanks, jumpToBlank, templateBlanks } from "./template-blanks";
import { setTemplateNote, templateFieldPills } from "./template-field-pills";

vi.mock("react-hot-toast", () => ({ default: { success: vi.fn() } }));

function makeView(doc: string, caret = 0) {
  return new EditorView({
    state: EditorState.create({
      doc,
      selection: EditorSelection.cursor(caret),
      extensions: [markdown(), templateFieldPills, templateBlanks],
    }),
  });
}

const selected = (view: EditorView) => view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to);

describe("template blanks", () => {
  it("finds blanks, not fields or code", () => {
    const doc = "{{task_1}} {{date}} `{{x}}` {{owner}}";
    expect(findBlanks(EditorState.create({ doc, extensions: markdown() })).map((b) => doc.slice(b.from, b.to)))
      .toEqual(["{{task_1}}", "{{owner}}"]);
  });

  it("Tab selects the next blank, wrapping around; Shift-Tab goes back", () => {
    const view = makeView("- {{task_1}}\n- {{task_2}}");
    expect(jumpToBlank(view, 1)).toBe(true);
    expect(selected(view)).toBe("{{task_1}}");
    jumpToBlank(view, 1);
    expect(selected(view)).toBe("{{task_2}}");
    jumpToBlank(view, 1);
    expect(selected(view)).toBe("{{task_1}}");
    jumpToBlank(view, -1);
    expect(selected(view)).toBe("{{task_2}}");
  });

  it("says the template is ready once the last blank is filled", () => {
    const view = makeView("Owner: {{owner}}");
    jumpToBlank(view, 1);
    view.dispatch(view.state.replaceSelection("Ana"));
    expect(jumpToBlank(view, 1)).toBe(true);
    expect(toast.success).toHaveBeenCalledWith("Template ready ✦", expect.anything());
    expect(jumpToBlank(view, 1)).toBe(false);
  });

  it("leaves Tab alone without blanks or in a template note", () => {
    expect(jumpToBlank(makeView("Plain"), 1)).toBe(false);
    const template = makeView("{{task_1}}");
    template.dispatch({ effects: setTemplateNote.of(true) });
    expect(jumpToBlank(template, 1)).toBe(false);
  });
});
