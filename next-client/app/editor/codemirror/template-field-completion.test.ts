import { describe, expect, it, vi } from "vitest";
import { CompletionContext, type Completion } from "@codemirror/autocomplete";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { createTemplateFieldSource, openTemplateFieldMenu } from "./template-field-completion";

type Callbacks = { onInsertTemplateField?: () => void; onAskTemplateQuestion?: () => Promise<string | null> };

function complete(doc: string, caret = doc.length, callbacks: Callbacks = { onInsertTemplateField: vi.fn() }) {
  const state = EditorState.create({ doc });
  return createTemplateFieldSource({ current: callbacks })(new CompletionContext(state, caret, false));
}

function pick(doc: string, label: string, { caret = doc.length, callbacks = { onInsertTemplateField: vi.fn() } as Callbacks } = {}) {
  const state = EditorState.create({ doc });
  const result = createTemplateFieldSource({ current: callbacks })(new CompletionContext(state, caret, false));
  const option = result?.options.find((entry) => entry.label === label) as Completion | undefined;
  if (!result || !option || typeof option.apply !== "function") throw new Error(`Missing option ${label}`);
  const view = new EditorView({ state: EditorState.create({ doc, selection: EditorSelection.cursor(caret) }) });
  option.apply(view, option, result.from, result.to ?? caret);
  return view;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("createTemplateFieldSource", () => {
  it("lists fields by plain name after {{ in a template note", () => {
    const labels = complete("Date: {{")?.options.map((o) => o.label);
    expect(labels).toContain("Today's date");
    expect(labels).toContain("Ask a question…");
  });

  it("does nothing outside template notes or without {{", () => {
    expect(complete("Date: {{", undefined, {})).toBeNull();
    expect(complete("Date: {")).toBeNull();
  });

  it("filters by token name or plain words", () => {
    expect(complete("{{today")?.options.map((o) => o.label)).toEqual(["Today's date"]);
    expect(complete("{{zzz")).toBeNull();
  });

  it("offers the doc's questions first", () => {
    expect(complete("Owner: {{prompt:Owner}}\nAgain: {{")?.options[0].label).toBe("Ask: Owner");
  });

  it("inserts the whole token", () => {
    expect(pick("Date: {{da", "Today's date").state.doc.toString()).toBe("Date: {{date}}");
  });

  it("replaces a closing }} already after the caret", () => {
    const view = pick("Date: {{}} end", "Today's date", { caret: "Date: {{".length });
    expect(view.state.doc.toString()).toBe("Date: {{date}} end");
  });

  it("asks for the question and inserts it", async () => {
    const callbacks = { onInsertTemplateField: vi.fn(), onAskTemplateQuestion: vi.fn().mockResolvedValue(" Owner ") };
    const view = pick("Owner: {{", "Ask a question…", { callbacks });
    document.body.appendChild(view.dom);
    await flush();
    expect(callbacks.onAskTemplateQuestion).toHaveBeenCalledOnce();
    expect(view.state.doc.toString()).toBe("Owner: {{prompt:Owner}}");
    view.dom.remove();
  });

  it("inserts nothing when the question dialog is cancelled", async () => {
    const callbacks = { onInsertTemplateField: vi.fn(), onAskTemplateQuestion: vi.fn().mockResolvedValue(null) };
    const view = pick("Owner: {{", "Ask a question…", { callbacks });
    await flush();
    expect(view.state.doc.toString()).toBe("Owner: ");
  });

  it("leaves {{prompt:}} to fill in without a dialog", () => {
    const view = pick("Owner: {{", "Ask a question…");
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
