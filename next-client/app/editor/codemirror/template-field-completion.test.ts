import { describe, expect, it, vi } from "vitest";
import { CompletionContext, type Completion } from "@codemirror/autocomplete";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { createTemplateFieldSource, openTemplateFieldMenu } from "./template-field-completion";

const inTemplate = { current: { onInsertTemplateField: vi.fn() } };

function complete(doc: string, caret = doc.length, callbacksRef: { current: { onInsertTemplateField?: () => void } } = inTemplate) {
  const state = EditorState.create({ doc });
  return createTemplateFieldSource(callbacksRef)(new CompletionContext(state, caret, false));
}

function pick(doc: string, label: string, caret = doc.length) {
  const result = complete(doc, caret);
  const option = result?.options.find((entry) => entry.label === label) as Completion | undefined;
  if (!result || !option || typeof option.apply !== "function") throw new Error(`Missing option ${label}`);
  const view = new EditorView({ state: EditorState.create({ doc, selection: EditorSelection.cursor(caret) }) });
  option.apply(view, option, result.from, result.to ?? caret);
  return view;
}

describe("createTemplateFieldSource", () => {
  it("lists fields after {{ in a template note", () => {
    const labels = complete("Date: {{")?.options.map((o) => o.label);
    expect(labels).toContain("date");
    expect(labels).toContain("prompt:…");
  });

  it("does nothing outside template notes or without {{", () => {
    expect(complete("Date: {{", undefined, { current: {} })).toBeNull();
    expect(complete("Date: {")).toBeNull();
  });

  it("filters by what is typed after {{", () => {
    expect(complete("{{da")?.options.map((o) => o.label)).toEqual(["date", "day"]);
    expect(complete("{{zzz")).toBeNull();
  });

  it("offers the doc's prompts first", () => {
    expect(complete("Owner: {{prompt:Owner}}\nAgain: {{pro")?.options[0].label).toBe("prompt:Owner");
  });

  it("inserts the whole token", () => {
    expect(pick("Date: {{da", "date").state.doc.toString()).toBe("Date: {{date}}");
  });

  it("replaces a closing }} already after the caret", () => {
    expect(pick("Date: {{}} end", "date", "Date: {{".length).state.doc.toString()).toBe("Date: {{date}} end");
  });

  it("leaves the caret inside a new prompt", () => {
    const view = pick("Owner: {{", "prompt:…");
    expect(view.state.doc.toString()).toBe("Owner: {{prompt:}}");
    expect(view.state.selection.main.head).toBe("Owner: {{prompt:".length);
  });
});

describe("openTemplateFieldMenu", () => {
  it("types {{ over the selection", () => {
    const view = new EditorView({
      state: EditorState.create({ doc: "Owner: X", selection: EditorSelection.range(7, 8) }),
    });
    openTemplateFieldMenu(view);
    expect(view.state.doc.toString()).toBe("Owner: {{");
    expect(view.state.selection.main.head).toBe(9);
  });
});
