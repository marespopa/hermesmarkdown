import { describe, expect, it, vi } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { undo, history } from "@codemirror/commands";
import { editorFilePath, formatCodeInEditor } from "./format-code-command";

const defaults = async () => ({ options: {} });

vi.mock("react-hot-toast", () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() }) }));

function noteView(doc: string, caret: number) {
  return new EditorView({
    state: EditorState.create({ doc, selection: { anchor: caret }, extensions: [markdown({ base: markdownLanguage }), history()] }),
  });
}

describe("formatCodeInEditor", () => {
  it("formats the fence under the caret in a note, as one undo step", async () => {
    const doc = "Intro\n\n```ts\nconst a={b:1}\n```\n\nAfter";
    const view = noteView(doc, doc.indexOf("a={"));
    await expect(formatCodeInEditor(view, true, defaults)).resolves.toEqual({ status: "formatted" });
    expect(view.state.doc.toString()).toBe("Intro\n\n```ts\nconst a = { b: 1 };\n```\n\nAfter");
    undo(view);
    expect(view.state.doc.toString()).toBe(doc);
  });

  it("keeps a list item's indent on the fence's lines", async () => {
    const doc = "- step\n\n  ```json\n  {\"a\":1}\n  ```\n";
    const view = noteView(doc, doc.indexOf("{\"a\""));
    await formatCodeInEditor(view, true, defaults);
    expect(view.state.doc.toString()).toBe("- step\n\n  ```json\n  { \"a\": 1 }\n  ```\n");
  });

  it("explains what it can't format and leaves the text alone", async () => {
    const prose = noteView("Just a paragraph", 3);
    await expect(formatCodeInEditor(prose, true, defaults)).resolves.toMatchObject({ status: "unsupported" });
    const python = noteView("```py\nx=1\n```", 7);
    await expect(formatCodeInEditor(python, true, defaults)).resolves.toMatchObject({ status: "unsupported", reason: "No formatter for py" });
    expect(python.state.doc.toString()).toBe("```py\nx=1\n```");
  });

  it("formats a whole code file by its extension, and reports a syntax error", async () => {
    const make = (doc: string) => new EditorView({ state: EditorState.create({ doc, extensions: editorFilePath.of("src/a.js") }) });
    const view = make("let x=[1,2]");
    await formatCodeInEditor(view, false, defaults);
    expect(view.state.doc.toString()).toBe("let x = [1, 2];\n");
    await expect(formatCodeInEditor(make("let = ;"), false, defaults)).resolves.toMatchObject({ status: "failed" });
  });

  it("uses the project's Prettier options for the file's path", async () => {
    const view = new EditorView({ state: EditorState.create({ doc: 'let s = "a"', extensions: editorFilePath.of("web/src/a.ts") }) });
    const loadOptions = vi.fn(async () => ({ options: { singleQuote: true, semi: false }, note: undefined }));
    await formatCodeInEditor(view, false, loadOptions);
    expect(loadOptions).toHaveBeenCalledWith("web/src/a.ts");
    expect(view.state.doc.toString()).toBe("let s = 'a'\n");
  });
});
