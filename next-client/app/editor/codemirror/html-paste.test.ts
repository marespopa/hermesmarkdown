import { describe, expect, it, vi } from "vitest";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { ensureSyntaxTree } from "@codemirror/language";
import { handleHtmlPaste, shouldConvertHtmlPaste } from "./html-paste";

vi.mock("@/app/components/Toastr", () => ({ showActionToast: vi.fn() }));

const HTML = "<h2>Release plan</h2><ul><li><strong>Ship</strong> billing export</li><li>Draft roadmap</li></ul>";
const PLAIN = "Release plan\nShip billing export\nDraft roadmap";
const MARKDOWN = "## Release plan\n\n- **Ship** billing export\n- Draft roadmap";

function stateWith(doc: string, cursor = doc.length) {
  const state = EditorState.create({ doc, selection: EditorSelection.cursor(cursor), extensions: [markdown({ base: markdownLanguage })] });
  ensureSyntaxTree(state, state.doc.length, 5000);
  return state;
}

function pasteEvent(html: string, plain: string) {
  return {
    clipboardData: { getData: (type: string) => (type === "text/html" ? html : type === "text/plain" ? plain : "") },
    preventDefault: vi.fn(),
  } as unknown as ClipboardEvent;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("shouldConvertHtmlPaste", () => {
  it("converts structured HTML, not plain-looking copies, URLs or code", () => {
    const state = stateWith("Notes\n");
    expect(shouldConvertHtmlPaste(state, state.doc.length, HTML, PLAIN)).toBe(true);
    expect(shouldConvertHtmlPaste(state, state.doc.length, "<div><span>const x = 1</span></div>", "const x = 1")).toBe(false);
    expect(shouldConvertHtmlPaste(state, state.doc.length, '<a href="https://example.com">https://example.com</a>', "https://example.com")).toBe(false);
    expect(shouldConvertHtmlPaste(state, state.doc.length, "", PLAIN)).toBe(false);

    const code = stateWith("```\nlet total = 0\n```", 8);
    expect(shouldConvertHtmlPaste(code, 8, HTML, PLAIN)).toBe(false);
  });
});

describe("handleHtmlPaste", () => {
  it("inserts the converted Markdown and can swap it back for the plain text", async () => {
    const view = new EditorView({ state: stateWith("Notes\n") });
    let revert: (() => void) | null = null;
    const event = pasteEvent(HTML, PLAIN);

    expect(handleHtmlPaste(view, event, { convert: async () => MARKDOWN, onConverted: (r) => { revert = r; } })).toBe(true);
    expect(event.preventDefault).toHaveBeenCalled();
    await flush();
    expect(view.state.doc.toString()).toBe(`Notes\n${MARKDOWN}`);

    revert!();
    expect(view.state.doc.toString()).toBe(`Notes\n${PLAIN}`);
    view.destroy();
  });

  it("pastes the plain text when the conversion adds nothing", async () => {
    const view = new EditorView({ state: stateWith("") });
    const onConverted = vi.fn();
    handleHtmlPaste(view, pasteEvent("<p>Draft roadmap</p>", "Draft roadmap"), { convert: async () => "Draft roadmap", onConverted });
    await flush();
    expect(view.state.doc.toString()).toBe("Draft roadmap");
    expect(onConverted).not.toHaveBeenCalled();
    view.destroy();
  });

  it("leaves other pastes to the editor", () => {
    const view = new EditorView({ state: stateWith("") });
    const event = pasteEvent("", "Draft roadmap");
    expect(handleHtmlPaste(view, event)).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
    view.destroy();
  });

  it("converts with the Markdown Cleaner's pipeline by default", async () => {
    const view = new EditorView({ state: stateWith("") });
    handleHtmlPaste(view, pasteEvent(HTML, PLAIN), { onConverted: vi.fn() });
    await vi.waitFor(() => expect(view.state.doc.toString()).toContain("## Release plan"));
    expect(view.state.doc.toString()).toMatch(/^-\s+\*\*Ship\*\* billing export$/m);
    view.destroy();
  });
});
